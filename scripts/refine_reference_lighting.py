"""Apply the final reference-matched wall and lighting to an existing staged hero scene."""
from pathlib import Path
import math

import bpy
from mathutils import Matrix, Vector


def aim(light, target):
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


def remove(name):
    object_ = bpy.data.objects.get(name)
    if object_:
        bpy.data.objects.remove(object_, do_unlink=True)


scene = bpy.context.scene
source_path = Path(bpy.data.filepath)

wall = bpy.data.objects["ENV_wall_return"]
wall.dimensions = (0.006, 2.6, 2.4)
wall.location = (-0.135, 0.09, 0.55)
bpy.context.view_layer.objects.active = wall
wall.select_set(True)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
wall.select_set(False)

wall_shader = wall.data.materials[0].node_tree.nodes.get("Principled BSDF")
wall_shader.inputs["Base Color"].default_value = (0.50, 0.57, 0.66, 1)
wall_shader.inputs["Roughness"].default_value = 0.94
wall_shader.inputs["Emission Color"].default_value = (0.32, 0.38, 0.48, 1)
wall_shader.inputs["Emission Strength"].default_value = 0.35
wall_noise = wall.data.materials[0].node_tree.nodes.get("Subtle plaster grain")
if wall_noise is None:
    wall_noise = wall.data.materials[0].node_tree.nodes.new("ShaderNodeTexNoise")
    wall_noise.name = "Subtle plaster grain"
wall_noise.inputs["Scale"].default_value = 82
wall_noise.inputs["Detail"].default_value = 3
wall_noise.inputs["Roughness"].default_value = 0.72
wall_bump = wall.data.materials[0].node_tree.nodes.get("Subtle plaster relief")
if wall_bump is None:
    wall_bump = wall.data.materials[0].node_tree.nodes.new("ShaderNodeBump")
    wall_bump.name = "Subtle plaster relief"
wall_bump.inputs["Strength"].default_value = 0.10
wall_bump.inputs["Distance"].default_value = 0.002
wall.data.materials[0].node_tree.links.new(wall_noise.outputs["Fac"], wall_bump.inputs["Height"])
wall.data.materials[0].node_tree.links.new(wall_bump.outputs["Normal"], wall_shader.inputs["Normal"])

key = bpy.data.objects["LGT_key | upper-right disk"]
key.data.energy = 18.5
key.data.shape = "DISK"
key.data.size = 0.16
key.data.color = (0.92, 0.95, 1.0)
key.location = (0.42, -0.22, 0.92)
aim(key, (0.04, 0.04, 0.04))

fill = bpy.data.objects["LGT_fill | broad front bounce"]
fill.data.energy = 2.1
fill.data.shape = "RECTANGLE"
fill.data.size = 0.48
fill.data.size_y = 0.38
fill.data.color = (0.76, 0.84, 1.0)
fill.location = (-0.12, -0.32, 0.24)
aim(fill, (0.03, 0.04, 0.10))

world_background = scene.world.node_tree.nodes.get("Background")
world_background.inputs["Strength"].default_value = 0.14

leather = bpy.data.materials["Ivory | grained calf leather"]
leather_shader = leather.node_tree.nodes.get("Principled BSDF")
leather_shader.inputs["Roughness"].default_value = 0.76
leather_shader.inputs["Specular IOR Level"].default_value = 0.16
tonal_control = leather.node_tree.nodes.get("Leather tonal control")
if tonal_control is None:
    base_link = next(link for link in leather.node_tree.links if link.to_socket == leather_shader.inputs["Base Color"])
    base_color_source = base_link.from_socket
    tonal_control = leather.node_tree.nodes.new("ShaderNodeHueSaturation")
    tonal_control.name = "Leather tonal control"
    leather.node_tree.links.remove(base_link)
    leather.node_tree.links.new(base_color_source, tonal_control.inputs["Color"])
    leather.node_tree.links.new(tonal_control.outputs["Color"], leather_shader.inputs["Base Color"])
tonal_control.inputs["Value"].default_value = 0.58

thread = bpy.data.materials["Ivory | linen saddle thread"]
thread_shader = thread.node_tree.nodes.get("Principled BSDF")
thread_shader.inputs["Base Color"].default_value = (0.58, 0.55, 0.50, 1)
thread_shader.inputs["Roughness"].default_value = 0.88
thread_shader.inputs["Specular IOR Level"].default_value = 0.16

remove("GOBO_window_wide")
remove("GOBO_window_narrow")
remove("GOBO_window_right_falloff")
pedestal = bpy.data.objects["ENV_pedestal"]
wall_y = (pedestal.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
wall_z = (pedestal.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()


def shadow_flag(name, target_y, width, height, diagonal_degrees):
    target = pedestal.matrix_world @ Vector((-0.135, target_y, 0.50))
    normal = (key.location - target).normalized()
    angle = math.radians(diagonal_degrees)
    long_axis = wall_z * math.cos(angle) + wall_y * math.sin(angle)
    long_axis = (long_axis - normal * long_axis.dot(normal)).normalized()
    width_axis = long_axis.cross(normal).normalized()
    transform = Matrix((width_axis, long_axis, normal)).transposed().to_4x4()
    transform.translation = key.location.lerp(target, 0.68)
    bpy.ops.mesh.primitive_cube_add(size=1)
    flag = bpy.context.object
    flag.name = name
    flag.dimensions = (width, height, 0.008)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    flag.matrix_world = transform
    flag.hide_set(True)
    flag.hide_render = False
    flag.visible_camera = False
    flag.visible_glossy = False
    flag.visible_transmission = False
    flag.visible_volume_scatter = False
    return flag


shadow_flag("GOBO_window_wide", 0.18, 0.05, 0.92, 32)
shadow_flag("GOBO_window_right_falloff", 0.47, 0.075, 1.05, 8)

preview_path = source_path.parent / "previews" / "v5" / "live-reference-light-pass-9.png"
preview_path.parent.mkdir(parents=True, exist_ok=True)
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 960
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.filepath = str(preview_path)
bpy.ops.render.render(write_still=True)

scene.render.engine = "CYCLES"
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.filepath = ""
bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
print(f"REFERENCE_PREVIEW={preview_path}")
