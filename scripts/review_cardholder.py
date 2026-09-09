"""Render geometry checks from the saved working scene without modifying the live Blender session."""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, point_at

scene = bpy.context.scene
root = bpy.data.objects['cardholder']
root.location = (0, 0, 0)
root.rotation_mode = 'XYZ'
root.rotation_euler = (0, 0, 0)
for part in root.children_recursive:
    part.hide_render = False
    part.hide_set(False)
for part in scene.objects:
    if part.name.startswith('ENV_') or part.get('is_reference'):
        part.hide_render = True
camera = scene.camera
camera.data.type = 'ORTHO'
camera.data.clip_start = .001
scene.render.resolution_x = 1400
scene.render.resolution_y = 1400
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.curvature_ridge_factor = 1.2
scene.display.shading.curvature_valley_factor = 1.1
for name, position, target, scale in (
    ('joined-layer-transitions.png', (-.16,-.17,.11), (-.045,0,.021), .035),
    ('lower-stitches.png', (0,-.18,.018), (0,0,-.034), .035),
    ('cardholder-thin-side.png', (-.22,-.045,.01), (0,0,0), .091),
    ('cardholder-clay-front.png', (0,-.3,.012), (0,0,0), .123),
):
    camera.location = position
    camera.data.ortho_scale = scale
    point_at(camera, target)
    scene.render.filepath = str(ROOT/'previews/v4'/name)
    bpy.ops.render.render(write_still=True)
