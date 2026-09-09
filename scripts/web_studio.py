"""Create and render the website's photographic plates from the retained models."""
from pathlib import Path
import argparse
import math
import sys

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'website' / 'public' / 'images' / 'studio'
SCENE_NAME = 'CEOMENTALITY | Web studio'


def aim(subject, target):
    subject.rotation_euler = (Vector(target) - subject.location).to_track_quat('-Z', 'Y').to_euler()


def link(scene, name, datablock=None):
    subject = bpy.data.objects.new(name, datablock)
    scene.collection.objects.link(subject)
    return subject


def material(name, color, roughness=0.7, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return mat


def area(scene, name, position, power, size, target, size_y=None):
    lamp = bpy.data.lights.new(name, 'AREA')
    lamp.energy = power
    lamp.shape = 'RECTANGLE' if size_y else 'DISK'
    lamp.size = size
    if size_y:
        lamp.size_y = size_y
    subject = link(scene, name, lamp)
    subject.location = position
    aim(subject, target)
    return subject


def build():
    if bpy.data.scenes.get(SCENE_NAME):
        raise RuntimeError('The website scene already exists; update it instead of duplicating it.')
    original = bpy.context.scene
    source = bpy.data.objects['cardholder']
    scene = bpy.data.scenes.new(SCENE_NAME)
    scene.unit_settings.system = 'METRIC'
    material_copies = {}
    root = link(scene, 'WEB_HERO_cardholder')
    for source_part in source.children_recursive:
        if source_part.type != 'MESH' or source_part.name not in original.objects:
            continue
        part = source_part.copy()
        part.data = source_part.data.copy()
        part.name = 'WEB_' + source_part.name
        scene.collection.objects.link(part)
        part.parent = root
        part.matrix_parent_inverse = Matrix.Identity(4)
        part.hide_set(False)
        for index, mat in enumerate(part.data.materials):
            if mat.name not in material_copies:
                copy = mat.copy()
                copy.name = 'WEB_' + mat.name
                material_copies[mat.name] = copy
            part.data.materials[index] = material_copies[mat.name]

    leather = material_copies['Ivory | grained calf leather']
    shader = leather.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .69
    shader.inputs['Specular IOR Level'].default_value = .23
    for node in leather.node_tree.nodes:
        if node.type == 'NORMAL_MAP':
            node.inputs['Strength'].default_value = .28
        if node.type == 'HUE_SAT':
            node.inputs['Value'].default_value = 1.0
            node.inputs['Saturation'].default_value = .6

    with bpy.data.libraries.load(str(ROOT / 'blender' / 'key.blend'), link=False) as (available, selected):
        selected.objects = [name for name in available.objects if name == 'key' or name.startswith('Key ')]
    key_parts = selected.objects
    for part in key_parts:
        scene.collection.objects.link(part)
        part.name = 'WEB_HERO_key' if part.name == 'key' else 'WEB_' + part.name
        part.hide_render = False
    key = bpy.data.objects['WEB_HERO_key']
    key.location = (0, 0, 0)
    key.rotation_euler = (0, 0, 0)
    key.rotation_mode = 'XYZ'

    floor_mesh = bpy.data.meshes.new('WEB_floor geometry')
    floor_mesh.from_pydata([(-2,-2,0),(2,-2,0),(2,2,0),(-2,2,0)], [], [(0,1,2,3)])
    floor = link(scene, 'WEB_ENV_floor', floor_mesh)
    floor.data.materials.append(material('WEB_pearl studio', (.73,.79,.87), .9))

    camera_data = bpy.data.cameras.new('WEB_CAM_product')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = .29
    camera_data.clip_start = .001
    camera_data.clip_end = 10
    camera = link(scene, 'WEB_CAM_product', camera_data)
    camera.location = (0,-.5,.255)
    aim(camera, (0,0,.055))
    scene.camera = camera

    area(scene, 'WEB_LGT_key', (.28,-.26,.44), 8.5, .18, (.05,0,.04))
    area(scene, 'WEB_LGT_fill', (-.25,-.28,.21), 1.8, .34, (.05,0,.04), .4)
    strip = area(scene, 'WEB_LGT_nickel_strip', (.12,.10,.32), 3.2, .035, (.05,0,.04), .36)
    strip.hide_render = True
    scene.world = bpy.data.worlds.new('WEB_world')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.8,.86,1,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .24
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .01
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.film_transparent = False
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    bpy.context.window.scene = scene
    pose('hero')
    for screen in bpy.data.screens:
        for screen_area in screen.areas:
            if screen_area.type == 'VIEW_3D':
                screen_area.spaces.active.region_3d.view_perspective = 'CAMERA'
                screen_area.spaces.active.clip_start = .001
    return scene


def pose(shot):
    scene = bpy.data.scenes[SCENE_NAME]
    camera = scene.camera
    card = bpy.data.objects['WEB_HERO_cardholder']
    key = bpy.data.objects['WEB_HERO_key']
    for part in [card, *card.children_recursive]:
        part.hide_render = (shot.startswith('key') or part.name == 'WEB_Back saddle stitching'
                            or bool(part.get('PHYS_material_print')) or bool(part.get('CLIENT_photo_seam')))
    for part in [key, *key.children_recursive]:
        part.hide_render = not shot.startswith('key')
    bpy.data.objects['WEB_LGT_nickel_strip'].hide_render = not shot.startswith('key')
    card.rotation_mode = 'XYZ'
    card.rotation_euler = tuple(map(math.radians, (-14,14,-3)))
    card.location = (.058,0,.055)
    camera.location = (0,-.5,.255)
    aim(camera, (0,0,.055))
    camera.data.ortho_scale = .29
    scene.render.resolution_x, scene.render.resolution_y = 1920,1080
    if shot == 'about':
        camera.location = (0,-.36,.43)
        aim(camera, (0,0,0))
        camera.data.ortho_scale = .18
        card.rotation_euler = tuple(map(math.radians, (-76,-10,25)))
        card.location = (-.045,0,.017)
    elif shot in ('front','side','back'):
        scene.render.resolution_x = scene.render.resolution_y = 1200
        camera.data.ortho_scale = .153
        camera.location = (0,-.5,.23)
        aim(camera,(0,0,.048))
        card.location = (0,0,.051)
        rotations = {'front':(-12,-10,0),'side':(-7,-4,78),'back':(-10,7,177)}
        card.rotation_euler = tuple(map(math.radians, rotations[shot]))
        if shot == 'back':
            bpy.data.objects['WEB_Back saddle stitching'].hide_render = False
    elif shot.startswith('key'):
        key.rotation_mode = 'XYZ'
        key.scale = (1.6,)*3
        key.location = (.067,0,.055)
        key.rotation_euler = tuple(map(math.radians,(-7,-6,15)))
        if shot in ('key-access','key-code','key-active'):
            key.scale = (2.5,)*3
            rotation = Matrix.Rotation(math.radians(-21),4,'X') @ Matrix.Rotation(math.radians(-58),4,'Y') @ Matrix.Rotation(math.radians(-24),4,'X')
            if shot != 'key-access':
                rotation = rotation @ Matrix.Rotation(math.pi,4,'Z')
            key.rotation_euler = rotation.to_euler()
            key.location = (.092,0,.040)
        etching = bpy.data.materials['Key | recessed dark engraving'].node_tree.nodes.get('Principled BSDF')
        etching.inputs['Base Color'].default_value = (.006,.05,.5,1) if shot == 'key-active' else (.016,.019,.022,1)
        etching.inputs['Emission Color'].default_value = (.006,.09,.8,1)
        etching.inputs['Emission Strength'].default_value = 1.5 if shot == 'key-active' else 0
    bpy.context.view_layer.update()


def refine():
    from mathutils.bvhtree import BVHTree
    scene = bpy.data.scenes[SCENE_NAME]
    bpy.context.window.scene = scene
    leather = bpy.data.materials['WEB_Ivory | grained calf leather']
    shader = leather.node_tree.nodes.get('Principled BSDF')
    if not leather.node_tree.nodes.get('WEB_albedo_control'):
        source = next(connection.from_socket for connection in leather.node_tree.links if connection.to_socket == shader.inputs['Base Color'])
        control = leather.node_tree.nodes.new('ShaderNodeHueSaturation')
        control.name = 'WEB_albedo_control'
        leather.node_tree.links.new(source,control.inputs['Color'])
        leather.node_tree.links.new(control.outputs['Color'],shader.inputs['Base Color'])
    control = leather.node_tree.nodes['WEB_albedo_control']
    control.inputs['Value'].default_value = .52
    control.inputs['Saturation'].default_value = .35
    leather.node_tree.nodes['Normal Map'].inputs['Strength'].default_value = .65
    ink = bpy.data.materials['WEB_CEO | absorbed navy leather print']
    ink_shader = ink.node_tree.nodes.get('Principled BSDF')
    for connection in list(ink.node_tree.links):
        if connection.to_socket == ink_shader.inputs['Base Color']:
            ink.node_tree.links.remove(connection)
    ink_shader.inputs['Base Color'].default_value = (.0012,.005,.021,1)
    ink_shader.inputs['Specular IOR Level'].default_value = .1
    ink.node_tree.nodes['Normal Map'].inputs['Strength'].default_value = .28
    thread = bpy.data.materials['WEB_Ivory | linen saddle thread'].node_tree.nodes.get('Principled BSDF')
    thread.inputs['Base Color'].default_value = (.48,.455,.42,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .1
    bpy.data.objects['WEB_LGT_fill'].data.energy = .65
    bpy.data.objects['WEB_LGT_key'].data.energy = 6
    bpy.data.objects['WEB_LGT_key'].data.size = .115
    for name,host_name in [
        ('WEB_Front saddle stitching | sides and bottom','WEB_Front leather pocket'),
        ('WEB_Backing exposed top stitching','WEB_Leather backing'),
        ('WEB_Middle side stitching left','WEB_Middle leather pocket | unstitched upper edge'),
        ('WEB_Middle side stitching right','WEB_Middle leather pocket | unstitched upper edge')]:
        stitches, host = bpy.data.objects[name], bpy.data.objects[host_name]
        if stitches.get('WEB_surface_fitted'):
            continue
        mesh = stitches.data
        tree = BVHTree.FromPolygons([vertex.co for vertex in host.data.vertices],[polygon.vertices for polygon in host.data.polygons])
        adjacency = [[] for _ in mesh.vertices]
        for edge in mesh.edges:
            a,b = edge.vertices
            adjacency[a].append(b)
            adjacency[b].append(a)
        remaining = set(range(len(mesh.vertices)))
        while remaining:
            seed = remaining.pop()
            indices, queue = [seed], [seed]
            while queue:
                for neighbor in adjacency[queue.pop()]:
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        queue.append(neighbor)
                        indices.append(neighbor)
            center = sum((mesh.vertices[i].co for i in indices),Vector()) / len(indices)
            location,_,_,_ = tree.ray_cast(Vector((center.x,-.02,center.z)),Vector((0,1,0)))
            if location is not None:
                shift = location.y - .00006 - center.y
                for index in indices:
                    mesh.vertices[index].co.y += shift
        mesh.update()
        stitches['WEB_surface_fitted'] = True
    pose('hero')


def render(shot, draft=False):
    scene = bpy.data.scenes[SCENE_NAME]
    bpy.context.window.scene = scene
    pose(shot)
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    devices = [device for device in prefs.devices if device.type == 'OPTIX']
    if not devices:
        raise RuntimeError('No OptiX device available for the studio render.')
    for device in prefs.devices:
        device.use = device.type == 'OPTIX'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 32 if draft else 112
    scene.render.resolution_percentage = 50 if draft else 100
    OUTPUT.mkdir(parents=True,exist_ok=True)
    scene.render.filepath = str(OUTPUT / (shot + ('-draft' if draft else '') + '.png'))
    bpy.ops.render.render(write_still=True,scene=SCENE_NAME)
    print('STUDIO_RENDER',scene.render.filepath,flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--build',action='store_true')
    parser.add_argument('--shots',nargs='+',default=[])
    parser.add_argument('--draft',action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if args.build:
        build()
    for name in args.shots:
        render(name,args.draft)
