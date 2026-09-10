"""Native leather and pigment lookdev; never projects photographic lighting."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from client_cardholder import PANELS, PHOTO
from photorealism_study import use_gpu
from web_studio import aim, pose

SCENE = 'CEOMENTALITY | Web studio'
OUTPUT = ROOT / 'previews/client-relit'
TILE = .110
LEATHER = 'Leather030'


def node(nodes, kind, name, x, y):
    created = nodes.new(kind)
    created.name = created.label = name
    created.location = (x, y)
    return created


def scan(nodes, links, uv, channel, x, y):
    texture = node(nodes, 'ShaderNodeTexImage', LEATHER + ' ' + channel, x, y)
    path = ROOT / 'blender/textures/ambientcg' / LEATHER / f'{LEATHER}_2K-PNG_{channel}.png'
    if not path.is_file():
        raise FileNotFoundError(path)
    texture.image = bpy.data.images.load(str(path), check_existing=True)
    texture.image.colorspace_settings.name = 'Non-Color'
    texture.interpolation = 'Cubic'
    links.new(uv.outputs['UV'], texture.inputs['Vector'])
    return texture


def artwork_mask(nodes, links):
    uv = node(nodes, 'ShaderNodeUVMap', 'Client artwork coordinates', -1100, 620)
    uv.uv_map = 'Client photograph'
    photo = node(nodes, 'ShaderNodeTexImage', 'Artwork source — colour NOT used', -900, 620)
    photo.image = bpy.data.images.load(str(PHOTO), check_existing=True)
    photo.image.colorspace_settings.name = 'sRGB'
    links.new(uv.outputs[0], photo.inputs['Vector'])
    ramp = node(nodes, 'ShaderNodeValToRGB', 'Ink coverage only', -620, 630)
    ramp.color_ramp.elements[0].position = .025
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    ramp.color_ramp.elements[1].position = .20
    ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
    links.new(photo.outputs['Color'], ramp.inputs['Fac'])
    xy = node(nodes, 'ShaderNodeSeparateXYZ', 'Artwork bounds', -880, 970)
    links.new(uv.outputs[0], xy.inputs[0])
    coverage = ramp.outputs['Color']
    for index, (axis, operation, boundary) in enumerate([
        ('X', 'GREATER_THAN', 335/1254), ('X', 'LESS_THAN', 940/1254),
        ('Y', 'GREATER_THAN', 1-865/1254), ('Y', 'LESS_THAN', 1-615/1254),
    ]):
        gate = node(nodes, 'ShaderNodeMath', f'Print bound {index}', -620+index*170, 1050)
        gate.operation = operation
        gate.inputs[1].default_value = boundary
        links.new(xy.outputs[axis], gate.inputs[0])
        multiply = node(nodes, 'ShaderNodeMath', f'Bounded coverage {index}', -430+index*170, 790)
        multiply.operation = 'MULTIPLY'
        links.new(coverage, multiply.inputs[0])
        links.new(gate.outputs[0], multiply.inputs[1])
        coverage = multiply.outputs[0]
    return coverage


def leather_material(printed=False):
    name = 'RELIT | white leather with navy pigment' if printed else 'RELIT | white pebbled leather'
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (.68, .665, .64, 1)
    material['source'] = 'ambientCG Leather030 procedural pebble relief; independent pigment, no photographed lighting'
    material['tile_metres'] = TILE
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    uv = node(nodes, 'ShaderNodeUVMap', 'Leather coordinates in metres', -1100, 20)
    uv.uv_map = 'Relit surface'
    rough = scan(nodes, links, uv, 'Roughness', -850, 100)
    roughness = node(nodes, 'ShaderNodeMapRange', 'Leather finish', -510, 170)
    roughness.inputs['To Min'].default_value = .46
    roughness.inputs['To Max'].default_value = .65
    links.new(rough.outputs['Color'], roughness.inputs['Value'])
    shader = node(nodes, 'ShaderNodeBsdfPrincipled', 'Leather and absorbed ink', 650, 180)
    shader.inputs['Base Color'].default_value = (.68, .665, .64, 1)
    shader.inputs['IOR'].default_value = 1.46
    shader.inputs['Specular IOR Level'].default_value = .5
    shader.inputs['Diffuse Roughness'].default_value = .15
    shader.inputs['Sheen Weight'].default_value = .025
    links.new(roughness.outputs['Result'], shader.inputs['Roughness'])
    if printed:
        mask = artwork_mask(nodes, links)
        color = node(nodes, 'ShaderNodeMixRGB', 'White leather / navy pigment', 360, 540)
        color.inputs[1].default_value = (.68, .665, .64, 1)
        color.inputs[2].default_value = (.0009, .0016, .018, 1)
        links.new(mask, color.inputs[0])
        links.new(color.outputs[0], shader.inputs['Base Color'])
        ink_finish = node(nodes, 'ShaderNodeMixRGB', 'Printed surface finish', 360, 270)
        links.new(mask, ink_finish.inputs[0])
        links.new(roughness.outputs[0], ink_finish.inputs[1])
        ink_finish.inputs[2].default_value = (.50, .50, .50, 1)
        links.new(ink_finish.outputs[0], shader.inputs['Roughness'])
    output = node(nodes, 'ShaderNodeOutputMaterial', 'Material Output', 1000, 180)
    links.new(shader.outputs[0], output.inputs['Surface'])
    height = scan(nodes, links, uv, 'Displacement', -850, -380)
    displacement = node(nodes, 'ShaderNodeDisplacement', 'Leather grain relief', 650, -390)
    displacement.inputs['Scale'].default_value = .00009
    displacement.inputs['Midlevel'].default_value = .5
    links.new(height.outputs['Color'], displacement.inputs['Height'])
    links.new(displacement.outputs[0], output.inputs['Displacement'])
    material.displacement_method = 'BOTH'
    return material


def apply_materials():
    scene = bpy.data.scenes[SCENE]
    plain, printed = leather_material(), leather_material(True)
    for index, name in enumerate(PANELS):
        panel = scene.objects[name]
        panel.data.materials.clear()
        panel.data.materials.append(printed if index == 0 else plain)
        if index == 0:
            panel.data.materials.append(plain)
        uv = panel.data.uv_layers.get('Relit surface') or panel.data.uv_layers.new(name='Relit surface')
        offset = ((0, 0), (.31, .43), (.64, .11))[index]
        for face in panel.data.polygons:
            axis = max(range(3), key=lambda i: abs(face.normal[i]))
            face.material_index = 1 if index == 0 and face.normal.y >= -.5 else 0
            for loop_index in face.loop_indices:
                point = panel.data.vertices[panel.data.loops[loop_index].vertex_index].co
                u, v = ((point.y, point.z), (point.x, point.z), (point.x, point.y))[axis]
                uv.data[loop_index].uv = (u/TILE+offset[0], v/TILE+offset[1])
        panel.hide_render = False
        panel.hide_set(False)
        if 'CLIENT_photo_seam' in panel:
            del panel['CLIENT_photo_seam']
    root = scene.objects['WEB_HERO_cardholder']
    for part in root.children_recursive:
        if part.type == 'MESH' and any(m and m.name == 'WEB_Ivory | linen saddle thread' for m in part.data.materials):
            if 'CLIENT_photo_seam' in part:
                del part['CLIENT_photo_seam']
            part.hide_render = part.name == 'WEB_Back saddle stitching'
            part.hide_set(part.hide_render)
    thread = bpy.data.materials['WEB_Ivory | linen saddle thread'].node_tree.nodes.get('Principled BSDF')
    thread.inputs['Base Color'].default_value = (.59, .565, .525, 1)
    thread.inputs['Roughness'].default_value = .72
    thread.inputs['Sheen Weight'].default_value = .10
    root['surface_mode'] = 'Native PBR leather with isolated artwork coverage'


def fit_threads():
    from mathutils.bvhtree import BVHTree
    scene = bpy.data.scenes[SCENE]
    pairs = [
        ('WEB_Front saddle stitching | sides and bottom', PANELS[0]),
        ('WEB_Backing exposed top stitching', PANELS[2]),
        ('WEB_Middle side stitching left', PANELS[1]),
        ('WEB_Middle side stitching right', PANELS[1]),
    ]
    for thread_name, panel_name in pairs:
        thread, panel = scene.objects[thread_name], scene.objects[panel_name]
        if thread.data.get('relit_thread_fit'):
            continue
        mesh = thread.data
        if len(mesh.vertices) % 80:
            raise ValueError(f'Unexpected stitch topology: {thread_name}')
        tree = BVHTree.FromPolygons([v.co for v in panel.data.vertices], [p.vertices for p in panel.data.polygons])
        rings = []
        for start in range(0, len(mesh.vertices), 8):
            vertices = list(mesh.vertices[start:start+8])
            center = sum((v.co for v in vertices), Vector())/8
            hit, _, _, _ = tree.ray_cast(Vector((center.x, -.02, center.z)), Vector((0, 1, 0)))
            if hit is None:
                raise ValueError(f'Stitch lies outside its panel: {thread_name}, {start}')
            rings.append((vertices, center, hit, (start//8 % 10)/9))
        for vertices, center, hit, fraction in rings:
            lift = .000028 - .00010 * math.sin(math.pi*fraction)**.65
            for vertex in vertices:
                offset = vertex.co-center
                vertex.co.x = center.x + offset.x*.68
                vertex.co.z = center.z + offset.z*.68
                vertex.co.y = hit.y + lift + offset.y*.80
        mesh.update()
        mesh['relit_thread_fit'] = True


def press_seams():
    """Small needle impressions in the existing dense exterior surface."""
    from mathutils.kdtree import KDTree
    scene = bpy.data.scenes[SCENE]
    seams = {
        PANELS[0]: ('WEB_Front saddle stitching | sides and bottom',),
        PANELS[1]: ('WEB_Middle side stitching left', 'WEB_Middle side stitching right'),
        PANELS[2]: ('WEB_Backing exposed top stitching',),
    }
    for panel_name, thread_names in seams.items():
        panel = scene.objects[panel_name]
        if panel.data.get('needle_impressions'):
            continue
        entries = []
        for thread_name in thread_names:
            mesh = scene.objects[thread_name].data
            for start in range(0, len(mesh.vertices), 80):
                centers = [sum((v.co for v in mesh.vertices[start+ring*8:start+(ring+1)*8]), Vector())/8 for ring in range(10)]
                tangent = centers[-1]-centers[0]
                tangent.y = 0
                tangent.normalize()
                entries.extend((center.copy(), tangent) for center in (centers[0], centers[-1]))
                for ring in range(10):
                    fraction = ring/9
                    depth = .000045*(math.exp(-(fraction/.16)**2)+math.exp(-((1-fraction)/.16)**2))
                    for vertex in mesh.vertices[start+ring*8:start+(ring+1)*8]:
                        vertex.co.y += depth
            mesh.update()
        tree = KDTree(len(entries))
        for index, (center, _) in enumerate(entries):
            tree.insert((center.x, 0, center.z), index)
        tree.balance()
        exterior = [vertex for vertex in panel.data.vertices if vertex.normal.y < -.5]
        for vertex in exterior:
            depth = 0
            for _, index, _ in tree.find_range((vertex.co.x, 0, vertex.co.z), .0007):
                center, tangent = entries[index]
                offset = vertex.co-center
                offset.y = 0
                along = offset.dot(tangent)
                across = offset.x*tangent.z-offset.z*tangent.x
                depth = max(depth, .000045*math.exp(-(along/.00032)**2-(across/.00022)**2))
            vertex.co.y += depth
        panel.data.update()
        panel.data['needle_impressions'] = True


def diagnostic_camera(view='three-quarter'):
    if view not in {'front', 'three-quarter', 'macro', 'hero'}:
        raise ValueError(f'Unknown cardholder view: {view}')
    scene = bpy.data.scenes[SCENE]
    bpy.context.window.scene = scene
    for name in ('RELIT_LGT_window_background', 'RELIT_ENV_window_mullion'):
        if name in scene.objects:
            scene.objects[name].hide_render = view != 'hero'
    pose('hero')
    root = scene.objects['WEB_HERO_cardholder']
    root.location = (0, 0, .075)
    root.rotation_euler = (0, 0, 0)
    camera = scene.camera
    camera.location = (0, -.5, .075) if view == 'front' else (.065, -.5, .18)
    aim(camera, (0, 0, .075))
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = .135
    camera.data.dof.use_dof = False
    scene.objects['WEB_Inserted card'].hide_render = view == 'front'
    scene.render.resolution_x = scene.render.resolution_y = 1400
    bpy.context.view_layer.update()
    if view == 'macro':
        center = root.matrix_world @ Vector((-.020, -.001, -.013))
        camera.location = center + Vector((-.04, -.3, .055))
        aim(camera, center)
        camera.data.ortho_scale = .055
    elif view == 'hero':
        root.rotation_euler = tuple(map(math.radians, (-18, 15, -8)))
        root.location = (.055, 0, .06)
        bpy.context.view_layer.update()
        lowest = min((part.matrix_world @ vertex.co).z
                     for name in PANELS for part in [scene.objects[name]]
                     for vertex in part.data.vertices)
        root.location.z += .014-lowest
        camera.location = (0, -.5, .23)
        aim(camera, (0, 0, .052))
        camera.data.ortho_scale = .325
        scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
        bpy.context.view_layer.update()
        from bpy_extras.object_utils import world_to_camera_view
        projected = [world_to_camera_view(scene, camera, scene.objects[name].matrix_world @ vertex.co)
                     for name in PANELS for vertex in scene.objects[name].data.vertices]
        center_x = (min(p.x for p in projected)+max(p.x for p in projected))/2
        center_y = (min(p.y for p in projected)+max(p.y for p in projected))/2
        rotation = camera.matrix_world.to_quaternion()
        camera.location += rotation @ Vector(((center_x-.695)*.325, (center_y-.47)*.325*1080/1920, 0))
    bpy.context.view_layer.update()


def lighting(view='hero'):
    scene = bpy.data.scenes[SCENE]
    key = scene.objects['WEB_LGT_key']
    key.location = (.28, -.05, .27)
    aim(key, (0, 0, .065))
    key.data.shape = 'RECTANGLE'
    key.data.size = .09
    key.data.size_y = .18
    key.data.energy = 2.1
    key.data.color = (1, .98, .95)
    if view != 'hero':
        key.location = (.16, -.20, .28)
        aim(key, (0, 0, .075))
        key.data.energy = 5.5
    key.hide_render = False
    receivers = bpy.data.collections.get('RELIT product receivers') or bpy.data.collections.new('RELIT product receivers')
    for part in scene.objects['WEB_HERO_cardholder'].children_recursive:
        if part.type == 'MESH' and part.name not in receivers.objects:
            receivers.objects.link(part)
    key.light_linking.receiver_collection = receivers
    fill = scene.objects['WEB_LGT_fill']
    fill.location = (-.20, -.23, .12)
    aim(fill, (0, 0, .06))
    fill.data.energy = .10
    fill.data.size = .30
    fill.data.size_y = .35
    fill.data.color = (.90, .95, 1)
    fill.hide_render = False
    fill.light_linking.receiver_collection = receivers
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.85, .90, 1, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .035
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    scene.render.engine = 'CYCLES'


def background_window():
    scene = bpy.data.scenes[SCENE]
    lamp = scene.objects.get('RELIT_LGT_window_background')
    if lamp is None:
        lamp = bpy.data.objects.new('RELIT_LGT_window_background', bpy.data.lights.new('RELIT window source', 'POINT'))
        scene.collection.objects.link(lamp)
    lamp.location = (.45, -.30, .70)
    lamp.data.type = 'POINT'
    lamp.data.shadow_soft_size = .10
    lamp.data.energy = 155
    lamp.data.color = (.90, .95, 1)
    lamp.hide_render = False
    receivers = bpy.data.collections.get('RELIT window receivers') or bpy.data.collections.new('RELIT window receivers')
    floor = scene.objects['WEB_ENV_floor']
    if floor.name not in receivers.objects:
        receivers.objects.link(floor)
    lamp.light_linking.receiver_collection = receivers
    lamp['purpose'] = 'Broad daylight pattern on cyclorama; product exposure controlled by its own key'
    camera = scene.camera
    rotation = camera.matrix_world.to_quaternion()
    right, up = rotation @ Vector((1, 0, 0)), rotation @ Vector((0, 1, 0))
    direction = rotation @ Vector((0, 0, -1))
    aspect = scene.render.resolution_y/scene.render.resolution_x
    vertices, faces = [], []
    # Follow the curved cyclorama so every blocker stays between light and receiver.
    for top_left, top_right, bottom_left, bottom_right in ((.38,.66,-.08,.20), (1.05,1.5,.74,1.5)):
        start = len(vertices)
        for row in range(13):
            v = row/12
            left = top_left*(1-v)+bottom_left*v
            right_edge = top_right*(1-v)+bottom_right*v
            for column in range(3):
                u = left+(right_edge-left)*column/2
                origin = camera.location + right*((u-.5)*camera.data.ortho_scale) + up*((.5-v)*camera.data.ortho_scale*aspect)
                hit, point, _, _ = floor.ray_cast(origin, direction)
                if not hit:
                    raise RuntimeError('Window shadow target falls outside the cyclorama')
                vertices.append(tuple(point.lerp(lamp.location, .25)))
        for row in range(12):
            for column in range(2):
                corner = start+row*3+column
                faces.append((corner,corner+1,corner+4,corner+3))
    flag = scene.objects.get('RELIT_ENV_window_mullion')
    if flag is None:
        flag = bpy.data.objects.new('RELIT_ENV_window_mullion', bpy.data.meshes.new('RELIT window mullion'))
        scene.collection.objects.link(flag)
    flag.data.clear_geometry()
    flag.data.from_pydata(vertices, [], faces)
    flag.data.update()
    flag.visible_camera = False
    flag.hide_render = False
    thickness = flag.modifiers.get('Opaque mullion') or flag.modifiers.new('Opaque mullion', 'SOLIDIFY')
    thickness.thickness = .003
    blockers = bpy.data.collections.get('RELIT window blockers') or bpy.data.collections.new('RELIT window blockers')
    if flag.name not in blockers.objects:
        blockers.objects.link(flag)
    for part in scene.objects['WEB_HERO_cardholder'].children_recursive:
        if part.type == 'MESH' and part.name not in blockers.objects:
            blockers.objects.link(part)
    lamp.light_linking.blocker_collection = blockers


def apply():
    bpy.context.window.scene = bpy.data.scenes[SCENE]
    apply_materials()
    fit_threads()
    press_seams()
    diagnostic_camera()
    lighting('three-quarter')
    bpy.context.view_layer.update()


def render(name, width=1400, samples=128):
    scene = bpy.data.scenes[SCENE]
    bpy.context.window.scene = scene
    use_gpu(scene)
    scene.cycles.samples = samples
    scene.cycles.seed = 41
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .008
    aspect = scene.render.resolution_y/scene.render.resolution_x
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width*aspect)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '16'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUTPUT / (name + '.png'))
    bpy.ops.render.render(write_still=True)
    print('RELIT_RENDER', scene.render.filepath, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--view', choices=['front', 'three-quarter', 'macro', 'hero'])
    parser.add_argument('--name', default='material-v1')
    parser.add_argument('--width', type=int, default=1400)
    parser.add_argument('--samples', type=int, default=128)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if args.apply:
        apply()
    if args.view:
        diagnostic_camera(args.view)
        lighting(args.view)
        if args.view == 'hero':
            background_window()
    render(args.name, args.width, args.samples)
