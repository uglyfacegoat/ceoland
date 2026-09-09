"""Regression check for the saved client-photo fit; run in background Blender."""
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import client_cardholder
from web_studio import pose

scene = bpy.data.scenes[client_cardholder.SCENE]
bpy.context.window.scene = scene
panels = [scene.objects[name] for name in client_cardholder.PANELS]
assert all(not panel.hide_render for panel in panels), 'A panel is hidden in the saved scene'
middle = scene.objects[client_cardholder.PANELS[1]]
assert not middle.get('CLIENT_photo_seam'), 'The middle pocket is incorrectly marked as stitching'

# Reapplying the fit must neither hide the middle pocket nor change its dimensions.
before = [tuple(vertex.co) for vertex in middle.data.vertices]
client_cardholder.apply()
assert before == [tuple(vertex.co) for vertex in middle.data.vertices], 'The photo fit was applied twice'
for shot in ('hero', 'front', 'about'):
    pose(shot)
    assert all(not panel.hide_render for panel in panels), f'A panel disappears in {shot}'
for panel in panels:
    assert panel.data.uv_layers.get('Client photograph') is not None
    photographs = [node.image for node in panel.active_material.node_tree.nodes if node.type == 'TEX_IMAGE']
    assert len(photographs) == 1 and photographs[0].packed_file, f'Unpacked source in {panel.name}'
print('CLIENT_SCENE_OK: three panels, stable fit, visible across poses, packed photograph')
