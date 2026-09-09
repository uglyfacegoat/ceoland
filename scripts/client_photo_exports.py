"""Front-facing stills of the calibrated photographic product model."""
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import client_cardholder
from photorealism_study import use_gpu, macro_pose
from web_studio import pose

scene = bpy.data.scenes[client_cardholder.SCENE]
bpy.context.window.scene = scene
client_cardholder.apply()
use_gpu(scene)
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = .005
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_depth = '8'
output = ROOT / 'website/public/images/client'
output.mkdir(parents=True, exist_ok=True)
for shot in ('front', 'detail'):
    pose('front')
    if shot == 'detail':
        macro_pose()
    scene.render.resolution_x = scene.render.resolution_y = 1400
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(output / f'{shot}-render.png')
    bpy.ops.render.render(write_still=True)
