"""Render the calibrated product without perspective hiding proportion errors."""
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import client_cardholder
from photorealism_study import use_gpu
from web_studio import aim, pose

scene = bpy.data.scenes[client_cardholder.SCENE]
bpy.context.window.scene = scene
client_cardholder.apply()
pose('hero')
root = scene.objects['WEB_HERO_cardholder']
root.rotation_euler = (0, 0, 0)
root.location = (0, 0, .075)
for part in root.children_recursive:
    if part.name.startswith('WEB_Printed logo'):
        part.hide_render = True
        part['PHYS_material_print'] = True
scene.objects['WEB_Inserted card'].hide_render = True
scene.camera.location = (0, -.5, .075)
aim(scene.camera, (0, 0, .075))
scene.camera.data.type = 'ORTHO'
scene.camera.data.ortho_scale = .14
use_gpu(scene)
scene.cycles.samples = 256
scene.render.resolution_x = scene.render.resolution_y = 1254
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_depth = '16'
scene.render.filepath = str(ROOT / 'previews/studio-finish/client-front-review.png')
bpy.ops.render.render(write_still=True)
