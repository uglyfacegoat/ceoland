"""Render the floating cardholder and its physical shadow to a transparent web plate."""
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT


scene = bpy.context.scene
cyclorama = bpy.data.objects["ENV_cyclorama"]
cyclorama.is_shadow_catcher = True
scene.view_layers[0].cycles.use_pass_shadow_catcher = True

scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = 0.01
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 60
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = 0

preview = ROOT / "previews" / "v5" / "floating-shadow-catcher-test.png"
scene.render.filepath = str(preview)
bpy.ops.render.render(write_still=True)
print(preview)
