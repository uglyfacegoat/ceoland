"""Separate native key lookdev scene with reflection-shaped nickel."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from photorealism_study import use_gpu
from web_studio import aim

SCENE = 'CEOMENTALITY | Key lookdev'
OUTPUT = ROOT / 'previews/key-relit'


def metal(name, polished=False, engraving=False, longitudinal=False):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.location = (450, 0)
    shader.inputs['Base Color'].default_value = (.61, .60, .57, 1) if not engraving else (.065, .06, .052, 1)
    shader.inputs['Metallic'].default_value = 1
    shader.inputs['Anisotropic'].default_value = .35 if not engraving else .1
    shader.inputs['Roughness'].default_value = .16 if polished else .38 if engraving else .28
    if not polished:
        coordinates = nodes.new('ShaderNodeTexCoord')
        coordinates.location = (-850, 0)
        stretch = nodes.new('ShaderNodeVectorMath')
        stretch.operation = 'MULTIPLY'
        stretch.location = (-650, 0)
        stretch.inputs[1].default_value = (14000, 900, 100) if longitudinal else (80, 900, 12000)
        links.new(coordinates.outputs['Object'], stretch.inputs[0])
        noise = nodes.new('ShaderNodeTexNoise')
        noise.location = (-420, 0)
        noise.inputs['Scale'].default_value = 1
        noise.inputs['Detail'].default_value = 2
        links.new(stretch.outputs[0], noise.inputs['Vector'])
        rough = nodes.new('ShaderNodeMapRange')
        rough.location = (-170, 130)
        rough.inputs['To Min'].default_value = .18 if longitudinal else .16 if not engraving else .32
        rough.inputs['To Max'].default_value = .30 if longitudinal else .38 if not engraving else .46
        links.new(noise.outputs['Fac'], rough.inputs['Value'])
        links.new(rough.outputs[0], shader.inputs['Roughness'])
        bump = nodes.new('ShaderNodeBump')
        bump.location = (-170, -130)
        bump.inputs['Strength'].default_value = .35
        bump.inputs['Distance'].default_value = .000003
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], shader.inputs['Normal'])
        tangent = nodes.new('ShaderNodeVectorTransform')
        tangent.name = 'Machining direction'
        tangent.vector_type = 'VECTOR'
        tangent.convert_from, tangent.convert_to = 'OBJECT', 'WORLD'
        tangent.inputs[0].default_value = (0, 0, 1) if longitudinal else (1, 0, 0)
        tangent.location = (180, -320)
        links.new(tangent.outputs[0], shader.inputs['Tangent'])
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (750, 0)
    links.new(shader.outputs[0], output.inputs['Surface'])
    return material


def area(scene, name, location, power, size, target, size_y):
    lamp = scene.objects.get(name)
    if lamp is None:
        lamp = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        scene.collection.objects.link(lamp)
    lamp.location = location
    aim(lamp, target)
    lamp.data.shape = 'RECTANGLE'
    lamp.data.energy = power
    lamp.data.size, lamp.data.size_y = size, size_y
    return lamp


def setup():
    source = bpy.data.scenes['CEOMENTALITY | Web studio']
    scene = bpy.data.scenes.get(SCENE)
    if scene is None:
        scene = bpy.data.scenes.new(SCENE)
        scene.unit_settings.system = 'METRIC'
        scene.world = source.world.copy()
        scene.world.name = 'KEYRELIT studio world'
        root = bpy.data.objects.new('KEYRELIT key', None)
        scene.collection.objects.link(root)
        root.empty_display_size = .01
        for part in source.objects['WEB_HERO_key'].children_recursive:
            if part.type != 'MESH':
                continue
            copy = part.copy()
            copy.data = part.data.copy()
            copy.name = 'KEYRELIT head' if 'bow' in part.name else 'KEYRELIT blade'
            copy.parent = root
            copy.matrix_parent_inverse = Matrix.Identity(4)
            copy.hide_render = False
            scene.collection.objects.link(copy)
        floor = source.objects['WEB_ENV_floor'].copy()
        floor.name = 'KEYRELIT cyclorama'
        scene.collection.objects.link(floor)
        camera = bpy.data.objects.new('KEYRELIT camera', bpy.data.cameras.new('KEYRELIT camera'))
        scene.collection.objects.link(camera)
        camera.data.clip_start = .001
        camera.data.type = 'ORTHO'
        scene.camera = camera
    bpy.context.window.scene = scene
    materials = [metal('KEYRELIT satin nickel'), metal('KEYRELIT machined edges', polished=True), metal('KEYRELIT recessed engraving', engraving=True)]
    blade_materials = [metal('KEYRELIT longitudinal nickel', longitudinal=True),
                       metal('KEYRELIT milled flutes', longitudinal=True), materials[2]]
    for name in ('KEYRELIT head', 'KEYRELIT blade'):
        part = scene.objects[name]
        original_name = 'WEB_Key bow | engraved both sides' if name.endswith('head') else 'WEB_Key blade | cut teeth and flutes'
        indices = [face.material_index for face in source.objects[original_name].data.polygons]
        if len(indices) != len(part.data.polygons):
            raise ValueError(f'Key topology differs from retained source: {name}')
        part.data.materials.clear()
        for material in materials if name.endswith('head') else blade_materials:
            part.data.materials.append(material)
        for face, material_index in zip(part.data.polygons, indices):
            face.material_index = material_index
        part.hide_set(False)
    scene.render.engine = 'CYCLES'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .08
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.72, .78, .88, 1)
    view('standing')
    return scene


def view(shot):
    if shot not in {'standing', 'access', 'code', 'active'}:
        raise ValueError(f'Unknown key view: {shot}')
    scene = bpy.data.scenes[SCENE]
    bpy.context.window.scene = scene
    root = scene.objects['KEYRELIT key']
    root.scale = (1, 1, 1)
    root.location = (.034, 0, .036)
    root.rotation_euler = tuple(map(math.radians, (-6, -5, 30)))
    camera = scene.camera
    camera.location = (0, -.35, .12)
    aim(camera, (0, 0, .034))
    camera.data.ortho_scale = .155
    if shot in ('access', 'code', 'active'):
        rotation = (Matrix.Rotation(math.radians(-21), 4, 'X')
                    @ Matrix.Rotation(math.radians(-58), 4, 'Y')
                    @ Matrix.Rotation(math.radians(-24), 4, 'X'))
        root.rotation_euler = rotation.to_euler()
        if shot != 'access':
            root.rotation_euler = (root.rotation_euler.to_matrix().to_4x4() @ Matrix.Rotation(math.pi, 4, 'Z')).to_euler()
        root.location = (.049, 0, .022)
        camera.data.ortho_scale = .125
        aim(camera, (0, 0, .025))
    bpy.context.view_layer.update()
    minimum = min((part.matrix_world @ vertex.co).z for part in root.children_recursive for vertex in part.data.vertices)
    root.location.z += .00015-minimum
    bpy.context.view_layer.update()
    head = scene.objects['KEYRELIT head']
    center = head.matrix_world @ Vector((0, 0, .016))
    normal = head.matrix_world.to_quaternion() @ Vector((0, -1, 0))
    if shot in ('code', 'active'):
        normal.negate()
    toward_camera = (camera.location-center).normalized()
    reflection = (2*normal.dot(toward_camera)*normal - toward_camera).normalized()
    across = head.matrix_world.to_quaternion() @ Vector((1, 0, 0))
    upper = head.matrix_world.to_quaternion() @ Vector((0, 0, 1))
    main = area(scene, 'KEYRELIT reflection softbox', center+reflection*.22+across*.055+upper*.045, .20 if shot == 'standing' else .10, .09, center, .10)
    main['purpose'] = 'Broad reflection gradient across the satin head'
    edge = area(scene, 'KEYRELIT edge strip', (-.13, -.04, .16), 1.5 if shot == 'standing' else .35, .025, center, .22)
    product_receivers = bpy.data.collections.get('KEYRELIT product receivers') or bpy.data.collections.new('KEYRELIT product receivers')
    for part in root.children_recursive:
        if part.type == 'MESH' and part.name not in product_receivers.objects:
            product_receivers.objects.link(part)
    main.light_linking.receiver_collection = product_receivers
    edge.light_linking.receiver_collection = product_receivers
    floor_light = area(scene, 'KEYRELIT floor daylight', (.25, -.10, .38), 7.5, .15, (0, 0, 0), .20)
    receivers = bpy.data.collections.get('KEYRELIT floor receiver') or bpy.data.collections.new('KEYRELIT floor receiver')
    floor = scene.objects['KEYRELIT cyclorama']
    if floor.name not in receivers.objects:
        receivers.objects.link(floor)
    floor_light.light_linking.receiver_collection = receivers
    flag = scene.objects.get('KEYRELIT negative reflection')
    if flag is None:
        flag = bpy.data.objects.new('KEYRELIT negative reflection', bpy.data.meshes.new('KEYRELIT black card'))
        scene.collection.objects.link(flag)
        dark = bpy.data.materials.new('KEYRELIT velvet')
        dark.use_nodes = True
        dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.002, .002, .002, 1)
        dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
        flag.data.materials.append(dark)
    origin = center+reflection*.15-across*.055
    flag.data.clear_geometry()
    flag.data.from_pydata([tuple(origin+across*x+upper*y) for x,y in ((-.045,-.14),(.045,-.14),(.045,.14),(-.045,.14))], [], [(0,1,2,3)])
    flag.data.update()
    flag.visible_camera = False
    flag.visible_shadow = False
    flag.visible_diffuse = False
    rear = scene.objects.get('KEYRELIT rear negative fill')
    if rear is None:
        rear = bpy.data.objects.new('KEYRELIT rear negative fill', bpy.data.meshes.new('KEYRELIT rear reflection card'))
        scene.collection.objects.link(rear)
        rear.data.materials.append(bpy.data.materials['KEYRELIT velvet'])
    rear.data.clear_geometry()
    rear.data.from_pydata([(-.18,.12,-.03),(.22,.12,-.03),(.22,.12,.30),(-.18,.12,.30)], [], [(0,1,2,3)])
    rear.data.update()
    rear.visible_camera = False
    rear.visible_shadow = False
    rear.visible_diffuse = False
    lower = scene.objects.get('KEYRELIT lower negative fill')
    if lower is None:
        lower = bpy.data.objects.new('KEYRELIT lower negative fill', bpy.data.meshes.new('KEYRELIT lower reflection card'))
        scene.collection.objects.link(lower)
        lower.data.materials.append(bpy.data.materials['KEYRELIT velvet'])
    lower.data.clear_geometry()
    lower.data.from_pydata([(-.3,-.4,.001),(.4,-.4,.001),(.4,-.003,.001),(-.3,-.003,.001)], [], [(0,1,2,3)])
    lower.data.update()
    lower.visible_camera = False
    lower.visible_shadow = False
    lower.visible_diffuse = False
    lower['purpose'] = 'Negative fill below the reflected horizon exposes the blade flutes'
    etch = bpy.data.materials['KEYRELIT recessed engraving'].node_tree.nodes.get('Principled BSDF')
    etch.inputs['Emission Color'].default_value = (.003, .075, .8, 1)
    etch.inputs['Emission Strength'].default_value = .8 if shot == 'active' else 0
    scene.render.resolution_x, scene.render.resolution_y = 1672, 941
    bpy.context.view_layer.update()


def render(shot, width=1672, samples=192):
    scene = bpy.data.scenes[SCENE]
    bpy.context.window.scene = scene
    use_gpu(scene)
    scene.cycles.samples = samples
    scene.cycles.seed = 41
    scene.cycles.adaptive_threshold = .006
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = width, round(width*941/1672)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '16'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUTPUT/(shot+'.png'))
    bpy.ops.render.render(write_still=True)
    print('KEYRELIT_RENDER', scene.render.filepath, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--setup', action='store_true')
    parser.add_argument('--shot', choices=['standing','access','code','active'], default='standing')
    parser.add_argument('--name')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if args.setup:
        setup()
    view(args.shot)
    render(args.name or args.shot)
