"""Render the four website key frames with a brushed nickel material."""
import argparse
from pathlib import Path
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from photorealism_study import use_gpu
from web_studio import SCENE_NAME, aim, link, material, pose


def brushed_nickel():
    material = bpy.data.materials['Key | horizontally brushed stainless steel']
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    output = nodes.new('ShaderNodeOutputMaterial')
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value = (.52, .54, .57, 1)
    shader.inputs['Metallic'].default_value = 1
    shader.inputs['Anisotropic'].default_value = .45
    coordinates = nodes.new('ShaderNodeTexCoord')
    stretch = nodes.new('ShaderNodeVectorMath')
    stretch.operation = 'MULTIPLY'
    stretch.inputs[1].default_value = (.3, 1, 12)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 60
    noise.inputs['Detail'].default_value = 2
    roughness = nodes.new('ShaderNodeMapRange')
    roughness.inputs['To Min'].default_value = .22
    roughness.inputs['To Max'].default_value = .38
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .35
    bump.inputs['Distance'].default_value = .00002
    links.new(coordinates.outputs['Generated'], stretch.inputs[0])
    links.new(stretch.outputs[0], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], roughness.inputs['Value'])
    links.new(roughness.outputs[0], shader.inputs['Roughness'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    links.new(shader.outputs[0], output.inputs['Surface'])
    bevel = bpy.data.materials['Key | polished machined bevels'].node_tree.nodes.get('Principled BSDF')
    bevel.inputs['Base Color'].default_value = (.62, .64, .67, 1)
    bevel.inputs['Metallic'].default_value = 1
    bevel.inputs['Roughness'].default_value = .16


def lighting(scene):
    main = scene.objects['WEB_LGT_key']
    main.location = (.28, -.34, .42)
    aim(main, (.075, 0, .05))
    main.data.shape = 'RECTANGLE'
    main.data.size, main.data.size_y = .11, .32
    main.data.energy = 7
    fill = scene.objects['WEB_LGT_fill']
    fill.location = (-.20, -.18, .25)
    aim(fill, (.075, 0, .05))
    fill.data.energy = .5
    strip = scene.objects['WEB_LGT_nickel_strip']
    strip.location = (.02, .14, .30)
    aim(strip, (.075, 0, .05))
    strip.data.energy = 4
    strip.data.size, strip.data.size_y = .055, .28
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .035
    scene.view_settings.exposure = 0
    scene.view_settings.look = 'AgX - Medium High Contrast'


def reflection_flag(scene):
    head = scene.objects['WEB_Key bow | engraved both sides']
    center = head.matrix_world @ (sum((Vector(c) for c in head.bound_box), Vector()) / 8)
    normal = head.matrix_world.to_quaternion() @ Vector((0, -1, 0))
    view = (scene.camera.location - center).normalized()
    reflected = (2 * normal.dot(view) * normal - view).normalized()
    tangent = reflected.cross(Vector((0, 0, 1))).normalized()
    vertical = tangent.cross(reflected).normalized()
    center += reflected * .15 + tangent * .02
    corners = [center + tangent * x + vertical * y for x, y in ((-.05, -.15), (.05, -.15), (.05, .15), (-.05, .15))]
    flag = scene.objects.get('KEY_black_reflection_card')
    if flag is None:
        flag = link(scene, 'KEY_black_reflection_card', bpy.data.meshes.new('Nickel reflection flag'))
        flag.data.materials.append(material('KEY black velvet', (.002, .002, .002), 1))
    flag.data.clear_geometry()
    flag.data.from_pydata(corners, [], [(0, 1, 2, 3)])
    flag.data.update()
    flag.visible_camera = False


def render_frames(shots):
    scene = bpy.data.scenes[SCENE_NAME]
    bpy.context.window.scene = scene
    brushed_nickel()
    lighting(scene)
    use_gpu(scene)
    scene.cycles.samples = 256
    scene.cycles.adaptive_threshold = .005
    scene.cycles.use_denoising = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_depth = '8'
    for shot in shots:
        pose(shot)
        reflection_flag(scene)
        scene.render.resolution_x, scene.render.resolution_y = 1672, 941
        scene.render.resolution_percentage = 100
        scene.render.filepath = str(ROOT / 'website/public/images/studio' / f'{shot}.png')
        bpy.ops.render.render(write_still=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('shots', nargs='*', default=['key-standing', 'key-access', 'key-code', 'key-active'])
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    render_frames(args.shots)
