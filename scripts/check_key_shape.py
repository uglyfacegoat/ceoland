"""Compare the actual refined silhouette to the supplied frontal reference."""
import json
from pathlib import Path
import sys
import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, SOURCES, PREVIEWS, point_at

bpy.ops.wm.open_mainfile(filepath=str(SOURCES / "key.blend"))
root = bpy.data.objects["key"]
root.rotation_euler = (0, 0, 0)
products = [obj for obj in root.children_recursive if obj.type == "MESH"]
for obj in bpy.context.scene.objects:
    obj.hide_render = obj not in products and obj.type == "MESH"
white = bpy.data.materials.new("Silhouette verification")
white.use_nodes = True
nodes = white.node_tree.nodes
nodes.clear()
emission = nodes.new("ShaderNodeEmission")
output = nodes.new("ShaderNodeOutputMaterial")
white.node_tree.links.new(emission.outputs[0], output.inputs[0])
for obj in products:
    obj.data.materials.clear()
    obj.data.materials.append(white)
    for face in obj.data.polygons:
        face.material_index = 0
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.render.resolution_x = 661
scene.render.resolution_y = 1294
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
camera = scene.camera
camera.data.type = "ORTHO"
camera.location = (15.5*29/534/1000, -0.24, 13.5*29/534/1000)
point_at(camera, (camera.location.x, 0, camera.location.z))
camera.data.ortho_scale = 1294*29/534/1000
frame = camera.data.view_frame(scene=scene)
camera.data.ortho_scale *= (1294*29/534/1000)/(max(v.y for v in frame)-min(v.y for v in frame))
scene.render.filepath = str(PREVIEWS / "key-shape-check.png")
bpy.ops.render.render(write_still=True)

def pixels(path):
    image = bpy.data.images.load(str(path), check_existing=False)
    values = np.empty(image.size[0]*image.size[1]*4, np.float32)
    image.pixels.foreach_get(values)
    return values.reshape(image.size[1], image.size[0], 4)[::-1]

reference = pixels(ROOT / "references/key-front-shape.png")[:, :, :3].mean(axis=2) > 0.40
rendered = pixels(PREVIEWS / "key-shape-check.png")[:, :, 3] > 0.5
iou = (reference & rendered).sum() / (reference | rendered).sum()
row_errors = []
for expected, actual in zip(reference, rendered):
    expected_x, actual_x = np.where(expected)[0], np.where(actual)[0]
    if len(expected_x) > 5 and len(actual_x) > 5:
        row_errors.extend((abs(int(expected_x[0])-int(actual_x[0])), abs(int(expected_x[-1])-int(actual_x[-1]))))
report = {"silhouette_iou": float(iou), "mean_outer_edge_error_pixels": float(np.mean(row_errors)), "millimeters_per_pixel": 29/534}
(ROOT / "assets/models/key-shape-validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print("SHAPE_CHECK", report)
if iou < 0.96:
    raise RuntimeError("Refined silhouette still deviates materially from the reference")
