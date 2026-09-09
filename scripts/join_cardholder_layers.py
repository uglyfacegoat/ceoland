"""Apply the sewn-border correction to the existing v4 cardholder in the live scene."""
import importlib
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_models
import leather_details
import refine_models


def refresh_surface(panel):
    mesh = panel.data
    custom = mesh.attributes.get('custom_normal')
    if custom is not None:
        mesh.attributes.remove(custom)
    mesh.update()
    if mesh.uv_layers:
        for uv in list(mesh.uv_layers):
            mesh.uv_layers.remove(uv)
        build_models.planar_uv(panel, .036)
    build_models.finish_normals(panel)


def apply():
    importlib.reload(build_models)
    importlib.reload(leather_details)
    refinement = importlib.reload(refine_models)
    root = bpy.data.objects['cardholder']
    if root.get('joined_layer_edges'):
        raise RuntimeError('Load before-joined-layers.blend before applying this migration.')
    root.location = (0, 0, 0)
    root.rotation_mode = 'XYZ'
    root.rotation_euler = (0, 0, 0)
    parts = list(root.children_recursive)
    for panel in parts:
        if panel.name not in bpy.context.scene.objects:
            bpy.context.scene.collection.objects.link(panel)
    old_bulge = float(root['body_bulge_mm'])
    def previous_bulge(x, y):
        distance = 4.5-math.hypot(abs(x)-48, -abs(y)+33) if abs(x)>48 and abs(y)>33 else min(52.5-abs(x),37.5-abs(y))
        return old_bulge*(1-math.exp(-(max(0,distance)/6)**1.4))
    to_mm = Matrix.Scale(1000,4) @ Matrix.Rotation(-math.pi/2,4,'X')
    to_metres = to_mm.inverted()
    for name in ('Leather backing', 'Backing painted edge'):
        panel = bpy.data.objects[name]
        for vertex in panel.data.vertices:
            x, y = vertex.co.x * 1000, vertex.co.z * 1000
            vertex.co.y += .22*previous_bulge(x,y)/1000
        panel.data.transform(to_mm)
        refinement.reshape_panel(panel,refinement.round_outline(105,75,4.5),
            refinement.round_outline(105,75,refinement.BOTTOM_RADIUS_MM,top_radius=refinement.TOP_RADIUS_MM),
            (0,0),(0,0),lambda x,y,z:z)
        for vertex in panel.data.vertices:
            vertex.co.z += .22*refinement.body_bulge(vertex.co.x,vertex.co.y)
        panel.data.transform(to_metres)
        refresh_surface(panel)
    card = bpy.data.objects['Inserted card']
    for vertex in card.data.vertices:
        x, y = vertex.co.x * 1000, vertex.co.z * 1000
        old_padding = previous_bulge(x, y)
        local_depth = -vertex.co.y*1000 - .72*old_padding
        vertex.co.x *= 95/97.5
        depth = -.65 + (local_depth+.65)*.4 + .72*refinement.body_bulge(vertex.co.x*1000, y)
        vertex.co.y = -depth/1000
    refresh_surface(card)
    front = bpy.data.objects['Front leather pocket']
    middle = bpy.data.objects['Middle leather pocket | unstitched upper edge']
    leather_details.resample_pocket_surface(front, 105, -37.5, 16, refinement.BOTTOM_RADIUS_MM, refinement.POCKET_TOP_RADIUS_MM, refinement.FRONT_THICKNESS_MM,
        lambda x,y: refinement.front_surface(x,y)+refinement.body_bulge(x,y))
    leather_details.resample_pocket_surface(middle, 105, -37.5, 26.75, refinement.BOTTOM_RADIUS_MM, refinement.POCKET_TOP_RADIUS_MM, refinement.MIDDLE_THICKNESS_MM,
        lambda x,y: refinement.middle_surface(x,y)+.86*refinement.body_bulge(x,y))
    # The painted outline belonged to the former thick pocket; the new bevel is the actual leather edge.
    bpy.data.objects.remove(bpy.data.objects['Pocket painted edge'], do_unlink=True)
    for panel in list(root.children_recursive):
        if panel.name.startswith('Printed logo'):
            mesh = bmesh.new()
            mesh.from_mesh(panel.data)
            bmesh.ops.delete(mesh, geom=[face for face in mesh.faces if face.normal.y > -.5], context='FACES')
            mesh.to_mesh(panel.data)
            mesh.free()
            for vertex in panel.data.vertices:
                x, y = vertex.co.x*1000, vertex.co.z*1000
                vertex.co.y = -(refinement.front_surface(x,y)+refinement.body_bulge(x,y)+.045)/1000
            refresh_surface(panel)
    thread = bpy.data.objects['Front saddle stitching | sides and bottom'].data.materials[0]
    seam_names = {seam[0] for seam in refinement.cardholder_seams()}
    for name in seam_names | {'Joined leather side and bottom binding'}:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
    stitches = []
    for name, outline, surface, _, closed, back in refinement.cardholder_seams():
        stitches += refinement.seam_geometry(name, outline, surface, thread, closed=closed, back=back)
    stitches += refinement.pocket_transition_stitches(thread)
    for stitch in stitches:
        for vertex in stitch.data.vertices:
            vertex.co.z += refinement.body_bulge(vertex.co.x, vertex.co.y)*refinement.BULGE_WEIGHTS.get(stitch.name,1)
        stitch.data.update()
        build_models.finish_normals(stitch)
    build_models.finalize_model(stitches, 'cardholder', root)
    product_scene = bpy.data.scenes['Cardholder Product']
    for part in root.children_recursive:
        if part.name not in product_scene.objects:
            product_scene.collection.objects.link(part)
    root['joined_layer_edges'] = True
    root['body_bulge_mm'] = refinement.BODY_BULGE_MM
    root['revision'] = 'v4 | thin sewn leather, restrained fullness, edge tension and soft creases'
    bpy.context.view_layer.update()
    report = {}
    for panel in (front, middle, bpy.data.objects['Leather backing']):
        topology = bmesh.new()
        topology.from_mesh(panel.data)
        report[panel.name] = {'vertices':len(topology.verts), 'non_manifold_edges':sum(not edge.is_manifold for edge in topology.edges)}
        topology.free()
    if any(entry['non_manifold_edges'] for entry in report.values()):
        raise RuntimeError(f'Invalid panel topology: {report}')
    return report


if __name__ == '__main__':
    import json
    report = apply()
    output = build_models.ROOT/'revisions/v4/cardholder-refined.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(output))
    print(json.dumps(report))
