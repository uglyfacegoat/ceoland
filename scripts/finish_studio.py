"""Reference-led studio lighting and delivery from the saved material study."""
import argparse
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from photorealism_study import LEATHER, PRINTED_LEATHER, hero_pose, macro_pose, use_gpu
from web_studio import SCENE_NAME, aim, link, material, pose

OUTPUT = ROOT / 'previews' / 'studio-finish'


def lighting():
    scene = bpy.data.scenes[SCENE_NAME]
    key = scene.objects['WEB_LGT_key']
    key.location = (.38, -.16, .50)
    aim(key, (.045, .01, .035))
    key.data.energy = 14
    key.data.size = .14
    key.data.size_y = .18
    floor = bpy.data.materials['WEB_pearl studio'].node_tree.nodes['Principled BSDF']
    floor.inputs['Base Color'].default_value = (.86, .90, .94, 1)


def composition():
    hero_pose()
    card = bpy.data.objects['WEB_HERO_cardholder']
    card.location.z = .065
    card.rotation_euler = tuple(map(math.radians, (-17, 13, -16)))
    bpy.context.view_layer.update()


def background_flag():
    scene = bpy.data.scenes[SCENE_NAME]
    camera = scene.camera
    floor = scene.objects['WEB_ENV_floor']
    key = scene.objects['WEB_LGT_key']
    height = .16
    rotation = camera.matrix_world.to_quaternion()
    right, up = rotation @ Vector((1, 0, 0)), rotation @ Vector((0, 1, 0))
    direction = rotation @ Vector((0, 0, -1))
    corners = []
    # Map a broad diagonal band from the camera to a real overhead light flag.
    for u, v in ((.43, 0), (.64, 0), (.16, 1), (-.05, 1)):
        origin = camera.location + right * ((u-.5)*camera.data.ortho_scale) + up * ((.5-v)*camera.data.ortho_scale*9/16)
        hit, point, _, _ = floor.ray_cast(origin, direction)
        if not hit:
            raise RuntimeError('The lighting target falls outside the studio backdrop.')
        fraction = (height-point.z)/(key.location.z-point.z)
        corners.append(tuple(point.lerp(key.location, fraction)))
    flag = scene.objects.get('STUDIO_window_mullion')
    if flag is None:
        flag = link(scene, 'STUDIO_window_mullion', bpy.data.meshes.new('Studio light flag'))
        flag.data.materials.append(material('STUDIO black flag', (.004, .004, .004), .9))
    flag.data.clear_geometry()
    flag.data.from_pydata(corners, [], [(0, 1, 2, 3)])
    flag.data.update()
    flag.visible_camera = False
    flag.hide_render = False


def creases():
    panel = bpy.data.scenes[SCENE_NAME].objects['WEB_Front leather pocket']
    if panel.data.shape_keys is None:
        panel.shape_key_add(name='Basis')
    key = panel.data.shape_keys.key_blocks.get('Gentle sewn folds')
    if key is None:
        key = panel.shape_key_add(name='Gentle sewn folds')
    basis = panel.data.shape_keys.key_blocks['Basis']
    strokes = ((-.044, -.022, .78, .63, .022, .00008),
               (-.030, -.034, -.16, .99, .017, .00007),
               (.042, -.027, -.91, .41, .020, .00009),
               (.044, .011, -.96, -.28, .012, .00006))
    for vertex, original, target in zip(panel.data.vertices, basis.data, key.data):
        target.co = original.co
        if vertex.normal.y > -.5:
            continue
        x, _, z = original.co
        relief = 0
        for px, pz, dx, dz, length, depth in strokes:
            along = (x-px)*dx + (z-pz)*dz
            across = -(x-px)*dz + (z-pz)*dx - .0008*math.sin(along/length*math.pi)
            envelope = math.exp(-((along-length*.4)/(length*.45))**4)
            relief += depth*envelope*(math.exp(-(across/.00065)**2)-.28*math.exp(-((across-.001)/.0008)**2))
        target.co.y += relief
    key.value = 1


def render(name, width=1920, samples=256):
    scene = bpy.data.scenes[SCENE_NAME]
    use_gpu(scene)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .005
    scene.cycles.seed = 41
    scene.render.resolution_x = width
    scene.render.resolution_y = round(width*9/16)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_depth = '16'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUTPUT / f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('STUDIO_RENDER', scene.render.filepath, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('shot', choices=['light', 'gobo', 'hero', 'macro'])
    parser.add_argument('--width', type=int, default=1200)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    bpy.context.window.scene = bpy.data.scenes[SCENE_NAME]
    lighting()
    composition()
    if args.shot != 'light':
        background_flag()
    if args.shot in ('hero', 'macro'):
        creases()
    if args.shot == 'macro':
        macro_pose()
    render(args.shot, args.width, 128 if args.width < 1920 else 256)
