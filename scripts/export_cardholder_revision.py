"""Export and light the reviewed v4 cardholder from its saved Blender checkpoint."""
import json
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, export_model, point_at
import hero_scene as hero

root = bpy.data.objects['cardholder']
root.location = (0, 0, 0)
root.rotation_mode = 'XYZ'
root.rotation_euler = (0, 0, 0)
parts = [part for part in root.children_recursive if part.type == 'MESH']
assert bpy.data.objects['Middle leather pocket | unstitched upper edge'] in parts
for part in parts:
    if part.name not in bpy.context.scene.objects:
        bpy.context.scene.collection.objects.link(part)
    part.hide_render = False
    part.hide_set(False)
report = export_model(parts, root, 'cardholder')
manifest_path = ROOT/'assets/models/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest = [entry for entry in manifest if entry['name'] != 'cardholder'] + [report]
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

main_scene = bpy.context.scene
product = bpy.data.scenes['Cardholder Product']
for part in [root] + parts:
    if part.name not in product.objects:
        product.collection.objects.link(part)
bpy.context.window.scene = product
hero.configure_render(samples=96, width=1400, height=1400)
product.render.film_transparent = True
camera = product.camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .132
camera.data.clip_start = .001
for filename, position in (('cardholder-front.png',(-.10,-.26,.065)),('cardholder-straight.png',(0,-.3,0))):
    camera.location = position
    point_at(camera, (0,0,0))
    product.render.filepath = str(ROOT/'previews'/filename)
    bpy.ops.render.render(write_still=True)
camera.location = (-.10,-.26,.065)
point_at(camera, (0,0,0))
bpy.data.libraries.write(str(ROOT/'blender/cardholder.blend'), {product}, compress=True)

bpy.context.window.scene = main_scene
hero.setup(root)
hero.configure_render(samples=96)
hero.stone_look()
hero.pale_stone_front()
hero.lighting()
hero.backdrop()
main_scene.render.film_transparent = True
main_scene.render.filepath = str(ROOT/'previews/v5/hero-cardholder-pedestal.png')
bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(ROOT/'blender/hero-scene.blend'), {main_scene}, compress=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'revisions/v5/cardholder-staged.blend'))
print(json.dumps(report))
