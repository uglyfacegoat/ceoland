"""Round the two pocket-mouth corners without altering the retained body geometry."""
from pathlib import Path
import sys

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, planar_uv
from leather_details import resample_pocket_surface
import refine_models as refinement


root = bpy.data.objects['cardholder']
front = bpy.data.objects['Front leather pocket']
middle = bpy.data.objects['Middle leather pocket | unstitched upper edge']

resample_pocket_surface(
    front,
    105,
    -37.5,
    16,
    refinement.BOTTOM_RADIUS_MM,
    refinement.POCKET_TOP_RADIUS_MM,
    refinement.FRONT_THICKNESS_MM,
    lambda x, y: refinement.front_surface(x, y) + refinement.body_bulge(x, y),
)
resample_pocket_surface(
    middle,
    105,
    -37.5,
    26.75,
    refinement.BOTTOM_RADIUS_MM,
    refinement.POCKET_TOP_RADIUS_MM,
    refinement.MIDDLE_THICKNESS_MM,
    lambda x, y: refinement.middle_surface(x, y) + .86 * refinement.body_bulge(x, y),
)

for pocket in (front, middle):
    for uv in list(pocket.data.uv_layers):
        pocket.data.uv_layers.remove(uv)
    planar_uv(pocket, .036)

root['revision'] = 'v5.1 | rounded pocket mouths, broader grain and natural absorbed print'
output = ROOT / 'revisions' / 'v5' / 'cardholder-source-v5.1.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(output)
