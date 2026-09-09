"""Replace the architectural podium with the seamless floating-product studio."""
from pathlib import Path
import math

import bpy
from mathutils import Vector


def aim(light, target):
    light.rotation_euler = (Vector(target) - light.location).to_track_quat("-Z", "Y").to_euler()


def remove_prefixes(*prefixes):
    for object_ in list(bpy.data.objects):
        if object_.name.startswith(prefixes):
            bpy.data.objects.remove(object_, do_unlink=True)


scene = bpy.context.scene
source_path = Path(bpy.data.filepath)
remove_prefixes("ENV_pedestal", "ENV_wall", "ENV_cyclorama", "GOBO_window")

# A continuous floor-to-wall sweep keeps the background edge-free in the Blender file.
path = [(-0.50, -0.18), (0.28, -0.08)]
radius = 0.20
for step in range(1, 25):
    angle = math.radians(-90 + step * 3.75)
    path.append((0.28 + radius * math.cos(angle), 0.12 + radius * math.sin(angle)))
path.extend([(0.48, 0.68), (0.48, 1.20)])
vertices = []
for y, z in path:
    vertices.extend([(-1.15, y, z), (1.15, y, z)])
faces = [(index * 2, index * 2 + 1, index * 2 + 3, index * 2 + 2) for index in range(len(path) - 1)]
mesh = bpy.data.meshes.new("ENV_cyclorama geometry")
mesh.from_pydata(vertices, [], faces)
mesh.update()
for polygon in mesh.polygons:
    polygon.use_smooth = True
cyclorama = bpy.data.objects.new("ENV_cyclorama", mesh)
scene.collection.objects.link(cyclorama)

material = bpy.data.materials.get("ENV_cyclorama | cool plaster") or bpy.data.materials.new("ENV_cyclorama | cool plaster")
material.use_nodes = True
shader = material.node_tree.nodes.get("Principled BSDF")
shader.inputs["Base Color"].default_value = (0.62, 0.69, 0.78, 1)
shader.inputs["Roughness"].default_value = 0.96
shader.inputs["Emission Color"].default_value = (0.24, 0.29, 0.37, 1)
shader.inputs["Emission Strength"].default_value = 0.18
noise = material.node_tree.nodes.get("Cyclorama plaster grain") or material.node_tree.nodes.new("ShaderNodeTexNoise")
noise.name = "Cyclorama plaster grain"
noise.inputs["Scale"].default_value = 92
noise.inputs["Detail"].default_value = 2.5
noise.inputs["Roughness"].default_value = 0.68
bump = material.node_tree.nodes.get("Cyclorama plaster relief") or material.node_tree.nodes.new("ShaderNodeBump")
bump.name = "Cyclorama plaster relief"
bump.inputs["Strength"].default_value = 0.08
bump.inputs["Distance"].default_value = 0.0015
material.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
material.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
cyclorama.data.materials.append(material)

key = bpy.data.objects["LGT_key | upper-right disk"]
key.data.energy = 15.0
key.data.size = 0.18
key.data.color = (0.92, 0.95, 1.0)
key.location = (0.46, -0.24, 0.82)
aim(key, (0.06, 0.03, -0.01))

fill = bpy.data.objects["LGT_fill | broad front bounce"]
fill.data.energy = 1.8
fill.data.shape = "RECTANGLE"
fill.data.size = 0.55
fill.data.size_y = 0.42
fill.data.color = (0.76, 0.84, 1.0)
fill.location = (-0.30, -0.34, 0.26)
aim(fill, (0.02, 0.08, 0.05))

world_background = scene.world.node_tree.nodes.get("Background")
world_background.inputs["Strength"].default_value = 0.14

leather = bpy.data.materials["Ivory | grained calf leather"]
leather_shader = leather.node_tree.nodes.get("Principled BSDF")
leather_shader.inputs["Roughness"].default_value = 0.78
leather_shader.inputs["Specular IOR Level"].default_value = 0.12
tonal_control = leather.node_tree.nodes.get("Leather tonal control")
if tonal_control:
    tonal_control.inputs["Value"].default_value = 0.72

camera = bpy.data.objects["CAM_hero"]
camera.data.ortho_scale = 0.30

preview_path = source_path.parent / "previews" / "v5" / "floating-studio-pass-2.png"
preview_path.parent.mkdir(parents=True, exist_ok=True)
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = False
scene.render.filepath = str(preview_path)
bpy.ops.render.render(write_still=True)

scene.render.engine = "CYCLES"
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.filepath = ""
bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
print(f"FLOATING_PREVIEW={preview_path}")
