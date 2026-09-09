"""Controlled look-development tests; see references/photorealism-playbook.md."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from web_studio import SCENE_NAME, aim, link, material, pose

OUTPUT = ROOT / 'previews' / 'photorealism'
SCAN = ROOT / 'blender' / 'textures' / 'ambientcg' / 'Leather037'
LEATHER = 'WEB_Ivory | grained calf leather'
INK = 'WEB_CEO | absorbed navy leather print'
PRINTED_LEATHER = 'PHYS | ivory with absorbed print'
PRINT_MASK = ROOT / 'blender' / 'textures' / 'web-print-mask.png'


def bake_print_mask():
    original = bpy.context.scene
    scene = bpy.data.scenes.new('PHYS print mask bake')
    scene.world = bpy.data.worlds.new('PHYS mask black')
    scene.world.color = (0,0,0)
    white = material('PHYS mask emission', (1,1,1))
    shader = white.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Emission Color'].default_value = (1,1,1,1)
    shader.inputs['Emission Strength'].default_value = 1
    for source in bpy.data.scenes[SCENE_NAME].objects:
        if source.type != 'MESH' or not any(mat and mat.name == INK for mat in source.data.materials):
            continue
        copy = link(scene, 'PHYS mask ' + source.name, source.data.copy())
        copy.data.materials.clear()
        copy.data.materials.append(white)
        for face in copy.data.polygons:
            face.material_index = 0
        for vertex in copy.data.vertices:
            vertex.co.y = 0
    camera = link(scene, 'PHYS mask camera', bpy.data.cameras.new('PHYS mask camera'))
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = .13
    camera.data.clip_start = .001
    camera.location = (0,-.3,0)
    aim(camera, (0,0,0))
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    use_gpu(scene)
    scene.cycles.samples = 8
    scene.render.resolution_x = scene.render.resolution_y = 4096
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'Standard'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '16'
    scene.render.filepath = str(PRINT_MASK)
    bpy.context.window.scene = scene
    try:
        bpy.ops.render.render(write_still=True)
    finally:
        bpy.context.window.scene = original
        for subject in list(scene.objects):
            bpy.data.objects.remove(subject, do_unlink=True)
        bpy.data.scenes.remove(scene)


def absorb_print():
    if not PRINT_MASK.is_file():
        raise FileNotFoundError('Bake the native lettering with the print-mask test first.')
    scene = bpy.data.scenes[SCENE_NAME]
    front = scene.objects['WEB_Front leather pocket']
    previous = bpy.data.materials.get(PRINTED_LEATHER)
    printed = bpy.data.materials[LEATHER].copy()
    printed.name = PRINTED_LEATHER if previous is None else 'PHYS rebuilt print'
    front.data.materials.clear()
    front.data.materials.append(printed)
    if previous is not None:
        if previous.users != 0:
            raise RuntimeError('Printed leather is unexpectedly shared with another object.')
        bpy.data.materials.remove(previous)
        printed.name = PRINTED_LEATHER
    uv = front.data.uv_layers.get('Pigment UV')
    if uv is None:
        uv = front.data.uv_layers.new(name='Pigment UV')
    for loop in front.data.loops:
        point = front.data.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (point.x/.13+.5,point.z/.13+.5)
    nodes, links = printed.node_tree.nodes, printed.node_tree.links
    mask_uv = nodes.new('ShaderNodeUVMap')
    mask_uv.uv_map = 'Pigment UV'
    mask = nodes.new('ShaderNodeTexImage')
    mask.name = 'PHYS native lettering mask'
    mask.image = bpy.data.images.load(str(PRINT_MASK), check_existing=True)
    mask.image.colorspace_settings.name = 'Non-Color'
    mask.extension = 'CLIP'
    links.new(mask_uv.outputs[0], mask.inputs['Vector'])
    shader = nodes.get('Principled BSDF')
    base_color = shader.inputs['Base Color'].links[0].from_socket
    color = nodes.new('ShaderNodeMixRGB')
    color.name = 'PHYS printed pigment'
    color.inputs[2].default_value = (.0012,.0045,.034,1)
    links.new(mask.outputs['Alpha'], color.inputs[0])
    links.new(base_color, color.inputs[1])
    links.new(color.outputs[0], shader.inputs['Base Color'])
    leather_roughness = shader.inputs['Roughness'].links[0].from_socket
    ink_roughness = nodes.new('ShaderNodeMapRange')
    ink_roughness.name = 'PHYS ink roughness range'
    ink_roughness.inputs['From Min'].default_value = .49
    ink_roughness.inputs['From Max'].default_value = .68
    ink_roughness.inputs['To Min'].default_value = .38
    ink_roughness.inputs['To Max'].default_value = .53
    links.new(leather_roughness, ink_roughness.inputs['Value'])
    finish = nodes.new('ShaderNodeMixRGB')
    finish.name = 'PHYS printed finish'
    links.new(mask.outputs['Alpha'], finish.inputs[0])
    links.new(leather_roughness, finish.inputs[1])
    links.new(ink_roughness.outputs['Result'], finish.inputs[2])
    links.new(finish.outputs[0], shader.inputs['Roughness'])
    for subject in scene.objects:
        if subject.name.startswith('WEB_Printed logo'):
            subject.hide_render = True
            subject.hide_set(True)
            subject['PHYS_material_print'] = True


def scan_texture(nodes, channel, position):
    path = SCAN / f'Leather037_2K-PNG_{channel}.png'
    if not path.is_file():
        raise FileNotFoundError(path)
    texture = nodes.new('ShaderNodeTexImage')
    texture.name = f'PHYS scan {channel}'
    texture.location = position
    texture.image = bpy.data.images.load(str(path), check_existing=True)
    texture.image.colorspace_settings.name = 'Non-Color'
    texture.interpolation = 'Linear'
    uv = nodes.get('PHYS Surface UV')
    if uv is None:
        uv = nodes.new('ShaderNodeUVMap')
        uv.name = 'PHYS Surface UV'
        uv.uv_map = 'Surface UV'
        uv.location = (-850,-150)
    nodes.id_data.links.new(uv.outputs[0], texture.inputs['Vector'])
    return texture


def surface(mat, pigment, ink=False):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (640, 100)
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.location = (340, 100)
    shader.inputs['Base Color'].default_value = (*pigment, 1)
    shader.inputs['IOR'].default_value = 1.46
    shader.inputs['Specular IOR Level'].default_value = .5
    shader.inputs['Diffuse Roughness'].default_value = .18
    shader.inputs['Sheen Weight'].default_value = .015
    links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    normal_texture = scan_texture(nodes, 'NormalGL', (-600, -150))
    normal = nodes.new('ShaderNodeNormalMap')
    normal.name = 'PHYS grain normal'
    normal.location = (0, -100)
    normal.uv_map = 'Surface UV'
    normal.inputs['Strength'].default_value = .7
    links.new(normal_texture.outputs['Color'], normal.inputs['Color'])
    links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    roughness = scan_texture(nodes, 'Roughness', (-600, 180))
    remap = nodes.new('ShaderNodeMapRange')
    remap.name = 'PHYS roughness range'
    remap.location = (-170, 180)
    remap.inputs['From Min'].default_value = 0
    remap.inputs['From Max'].default_value = 1
    remap.inputs['To Min'].default_value = .44 if ink else .49
    remap.inputs['To Max'].default_value = .60 if ink else .68
    links.new(roughness.outputs['Color'], remap.inputs['Value'])
    links.new(remap.outputs['Result'], shader.inputs['Roughness'])
    # Pigment variation is independent of photographed shadow/highlight information.
    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-600, 460)
    noise.inputs['Scale'].default_value = 90
    noise.inputs['Detail'].default_value = 2
    coords = nodes.new('ShaderNodeTexCoord')
    coords.location = (-840, 400)
    coords.object = bpy.data.objects['WEB_HERO_cardholder']
    links.new(coords.outputs['Object'], noise.inputs['Vector'])
    colors = nodes.new('ShaderNodeValToRGB')
    colors.location = (-170, 470)
    colors.color_ramp.elements[0].color = (*(v*.97 for v in pigment), 1)
    colors.color_ramp.elements[1].color = (*(v*1.03 for v in pigment), 1)
    links.new(noise.outputs['Fac'], colors.inputs[0])
    links.new(colors.outputs['Color'], shader.inputs['Base Color'])
    mat.diffuse_color = (*pigment, 1)


def materials():
    surface(bpy.data.materials[LEATHER], (.62, .596, .56))
    surface(bpy.data.materials[INK], (.0018, .007, .033), ink=True)
    scene = bpy.data.scenes[SCENE_NAME]
    for part in scene.objects:
        if part.type != 'MESH' or not any(m and m.name in (LEATHER, INK, PRINTED_LEATHER) for m in part.data.materials):
            continue
        uv = part.data.uv_layers.get('Surface UV')
        if uv is None:
            uv = part.data.uv_layers.new(name='Surface UV')
        offset = (.31, .23) if 'Middle leather' in part.name else (.67, .11) if part.name == 'WEB_Leather backing' else (0, 0)
        for face in part.data.polygons:
            axis = max(range(3), key=lambda index: abs(face.normal[index]))
            for loop_index in face.loop_indices:
                point = part.data.vertices[part.data.loops[loop_index].vertex_index].co
                u, v = ((point.y, point.z), (point.x, point.z), (point.x, point.y))[axis]
                uv.data[loop_index].uv = (u/.13 + offset[0], v/.13 + offset[1])
    thread = bpy.data.materials['WEB_Ivory | linen saddle thread'].node_tree.nodes.get('Principled BSDF')
    thread.inputs['Base Color'].default_value = (.29, .274, .25, 1)
    thread.inputs['Roughness'].default_value = .72
    thread.inputs['Sheen Weight'].default_value = .12
    thread.inputs['Specular IOR Level'].default_value = .5


def lighting():
    scene = bpy.data.scenes[SCENE_NAME]
    lamp = bpy.data.objects['WEB_LGT_key']
    lamp.location = (.38, -.22, .50)
    aim(lamp, (.045, .01, .035))
    lamp.data.shape = 'RECTANGLE'
    lamp.data.size = .22
    lamp.data.size_y = .25
    lamp.data.energy = 11
    lamp.data.normalize = True
    lamp.data.color = (1, .965, .91)
    fill = bpy.data.objects['WEB_LGT_fill']
    fill.location = (-.22, -.26, .23)
    aim(fill, (.045, 0, .045))
    fill.data.energy = .8
    fill.data.size = .38
    fill.data.size_y = .42
    fill.data.color = (.86, .93, 1)
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.8, .88, 1, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .04
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    floor_shader = bpy.data.materials['WEB_pearl studio'].node_tree.nodes.get('Principled BSDF')
    floor_shader.inputs['Base Color'].default_value = (.76, .81, .88, 1)
    floor_shader.inputs['Roughness'].default_value = .84
    # A continuous floor and curved backdrop share illumination and shadow reception.
    floor = bpy.data.objects['WEB_ENV_floor']
    stations = [(-2, 0), (.12, 0)]
    radius = .16
    for step in range(1, 33):
        angle = math.pi*.5*step/32
        stations.append((.12 + radius*math.sin(angle), radius*(1-math.cos(angle))))
    stations.append((.28, 1.6))
    vertices = [(x,y,z) for y,z in stations for x in (-2,2)]
    faces = [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(stations)-1)]
    mesh = floor.data
    mesh.clear_geometry()
    mesh.from_pydata(vertices, [], faces)
    for face in mesh.polygons:
        face.use_smooth = True
    mesh.update()


def hero_pose():
    pose('hero')
    scene = bpy.data.scenes[SCENE_NAME]
    scene.camera.data.ortho_scale = .307
    aim(scene.camera, (0, 0, .068))
    card = bpy.data.objects['WEB_HERO_cardholder']
    card.location = (.057, 0, .070)
    card.rotation_euler = tuple(map(math.radians, (-10, 10, -18)))
    bpy.context.view_layer.update()


def setup():
    bpy.context.window.scene = bpy.data.scenes[SCENE_NAME]
    materials()
    lighting()
    hero_pose()
    absorb_print()


def window_flag():
    scene = bpy.data.scenes[SCENE_NAME]
    flag = scene.objects.get('PHYS_ENV_window_flag')
    if flag is None:
        mesh = bpy.data.meshes.new('PHYS window flag geometry')
        mesh.from_pydata([(-.028,-.5,0),(.028,-.5,0),(.028,.5,0),(-.028,.5,0)], [], [(0,1,2,3)])
        flag = link(scene, 'PHYS_ENV_window_flag', mesh)
        flag.data.materials.append(material('PHYS black light flag', (.008,.008,.008), .9))
    flag.location = (.09,.065,.14)
    flag.rotation_euler = (0,0,math.radians(-20))
    flag.visible_camera = False
    flag.hide_render = False
    key = bpy.data.objects['WEB_LGT_key']
    key.data.size = .14
    key.data.size_y = .18


def use_gpu(scene):
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    if not any(device.type == 'OPTIX' for device in prefs.devices):
        raise RuntimeError('An OptiX GPU is required for this render configuration.')
    for device in prefs.devices:
        device.use = device.type == 'OPTIX'
    scene.cycles.device = 'GPU'


def render_test(name, width=1600, samples=128, denoise=True):
    scene = bpy.data.scenes[SCENE_NAME]
    bpy.context.window.scene = scene
    use_gpu(scene)
    scene.cycles.seed = 41
    scene.cycles.samples = samples
    scene.cycles.adaptive_threshold = .005
    scene.cycles.use_denoising = denoise
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width*9/16)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '16'
    layer = scene.view_layers[0]
    for pass_name in ('use_pass_diffuse_color', 'use_pass_diffuse_direct', 'use_pass_diffuse_indirect', 'use_pass_glossy_direct', 'use_pass_glossy_indirect', 'use_pass_normal'):
        setattr(layer, pass_name, True)
    layer.cycles.denoising_store_passes = True
    OUTPUT.mkdir(exist_ok=True, parents=True)
    scene.render.filepath = str(OUTPUT / f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('PHOTO_TEST', scene.render.filepath, flush=True)


def macro_pose():
    scene = bpy.data.scenes[SCENE_NAME]
    card = bpy.data.objects['WEB_HERO_cardholder']
    center = card.matrix_world @ Vector((-.022, -.0015, -.018))
    scene.camera.location = center + Vector((-.026, -.18, .05))
    aim(scene.camera, center)
    scene.camera.data.ortho_scale = .08


def physical_relief():
    scene = bpy.data.scenes[SCENE_NAME]
    for name in (LEATHER, PRINTED_LEATHER):
        mat = bpy.data.materials[name]
        mat.displacement_method = 'BOTH'
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        height = scan_texture(nodes, 'Displacement', (-600,-440))
        displace = nodes.new('ShaderNodeDisplacement')
        displace.name = 'PHYS height carrier'
        displace.location = (340,-400)
        displace.inputs['Scale'].default_value = .00018
        displace.inputs['Midlevel'].default_value = .5
        links.new(height.outputs['Color'], displace.inputs['Height'])
        links.new(displace.outputs[0], nodes.get('Material Output').inputs['Displacement'])
        micro_path = ROOT / 'blender/textures/ambientcg/Leather038/Leather038_2K-PNG_NormalGL.png'
        if not micro_path.is_file():
            raise FileNotFoundError(micro_path)
        normal_texture = nodes['PHYS scan NormalGL']
        normal_texture.image = bpy.data.images.load(str(micro_path), check_existing=True)
        normal_texture.image.colorspace_settings.name = 'Non-Color'
        normal_texture.label = 'Fine pores: Leather038; larger grain: displaced Leather037'
        nodes['PHYS grain normal'].inputs['Strength'].default_value = .8
    for part in scene.objects:
        if part.type == 'MESH' and any(mat and mat.name in (LEATHER, PRINTED_LEATHER) for mat in part.data.materials):
            subdivision = part.modifiers.get('PHYS relief sampling')
            if subdivision is None:
                subdivision = part.modifiers.new('PHYS relief sampling','SUBSURF')
            subdivision.subdivision_type = 'SIMPLE'
            subdivision.levels = 1
            subdivision.render_levels = 2


def audit():
    scene = bpy.data.scenes[SCENE_NAME]
    used_materials = {mat for subject in scene.objects if subject.type == 'MESH' and not subject.hide_render for mat in subject.data.materials if mat}
    images = {node.image for mat in used_materials if mat.use_nodes for node in mat.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image}
    missing = [image.filepath for image in images if not image.packed_file and not Path(bpy.path.abspath(image.filepath)).is_file()]
    if missing:
        raise RuntimeError(f'Missing material maps: {missing}')
    report = {
        'scene': scene.name,
        'blender': bpy.app.version_string,
        'engine': scene.render.engine,
        'resolution': [scene.render.resolution_x, scene.render.resolution_y],
        'color': {'view':scene.view_settings.view_transform,'look':scene.view_settings.look,'exposure':scene.view_settings.exposure},
        'images': [{'path':image.filepath,'size':list(image.size),'color_space':image.colorspace_settings.name} for image in images],
        'lights': [{'name':subject.name,'position':list(subject.location),'watts':subject.data.energy,'hidden':subject.hide_render} for subject in scene.objects if subject.type == 'LIGHT'],
        'layers': [name for name in ('WEB_Leather backing','WEB_Front leather pocket','WEB_Middle leather pocket | unstitched upper edge') if name in scene.objects],
        'lettering': 'Native lettering alpha mask; pigment and relief share the front surface.',
        'visual_status': 'Material foundation study. Environment matching and final hero acceptance remain open.',
    }
    OUTPUT.mkdir(exist_ok=True, parents=True)
    (OUTPUT/'audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('test', choices=['baseline', 'clay', 'material', 'hero', 'macro', 'raw', 'key-only', 'fill-only', 'window', 'print-mask', 'review'])
    parser.add_argument('--width', type=int, default=1600)
    parser.add_argument('--relief', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    bpy.context.window.scene = bpy.data.scenes[SCENE_NAME]
    if args.test == 'print-mask':
        bake_print_mask()
        sys.exit(0)
    if args.test == 'material':
        materials()
    elif args.test != 'baseline':
        setup()
    scene = bpy.data.scenes[SCENE_NAME]
    if args.test == 'clay':
        clay = material('PHYS diagnostic clay', (.4,.4,.4), .65)
        scene.view_layers[0].material_override = clay
    if args.test == 'macro':
        macro_pose()
    if args.test == 'window':
        window_flag()
    if args.test == 'key-only':
        bpy.data.objects['WEB_LGT_fill'].hide_render = True
        scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0
    if args.test == 'fill-only':
        bpy.data.objects['WEB_LGT_key'].hide_render = True
    if args.relief:
        physical_relief()
    if args.test == 'review':
        render_test('foundation-hero', args.width, 256)
        macro_pose()
        render_test('foundation-macro', args.width, 256)
        render_test('foundation-macro-raw', args.width, 256, False)
        hero_pose()
        bpy.data.objects['WEB_LGT_fill'].hide_render = True
        scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0
        render_test('foundation-key-only', 1200, 128)
        bpy.data.objects['WEB_LGT_fill'].hide_render = False
        bpy.data.objects['WEB_LGT_key'].hide_render = True
        scene.world.node_tree.nodes['Background'].inputs[1].default_value = .04
        render_test('foundation-fill-only', 1200, 128)
        bpy.data.objects['WEB_LGT_key'].hide_render = False
        audit()
        sys.exit(0)
    render_test(args.test + ('-relief' if args.relief else ''), args.width, 256 if args.test == 'raw' else 128, args.test != 'raw')
