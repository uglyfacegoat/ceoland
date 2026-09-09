"""Read the supplied frontal silhouette into reproducible modelling coordinates."""
import json
from pathlib import Path
import bpy
import numpy as np

root = Path(__file__).resolve().parents[1]
image = bpy.data.images.load(str(root / "references/key-front-shape.png"))
width, height = image.size
pixels = np.empty(width * height * 4, np.float32)
image.pixels.foreach_get(pixels)
rgb = pixels.reshape(height, width, 4)[::-1, :, :3]
brightness = rgb.mean(axis=2)
mask = brightness > 0.40
rows = []
for y in range(height):
    xs = np.where(mask[y])[0]
    if len(xs) > 5:
        rows.append([y, int(xs.min()), int(xs.max())])
hole_rows = []
for y in range(120, 290):
    xs = np.where(brightness[y, 210:430] < 0.30)[0] + 210
    if len(xs) > 5:
        hole_rows.append([y, int(xs.min()), int(xs.max())])
report = {"image_size": [width, height], "rows": rows, "hole_rows": hole_rows}
(root / "references/key-profile.json").write_text(json.dumps(report), encoding="utf-8")
print("BOUNDS",rows[0],rows[-1],min(row[1] for row in rows),max(row[2] for row in rows))
print("SAMPLES", [row for row in rows if row[0] % 20 == 0])
print("HOLE", hole_rows[0],hole_rows[-1],min(row[1] for row in hole_rows),max(row[2] for row in hole_rows))
