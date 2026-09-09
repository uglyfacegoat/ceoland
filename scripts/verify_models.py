"""Reopen the .blend files, test the key cuts, and round-trip the GLBs."""

import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import SOURCES, MODELS, PREVIEWS, reset_scene
from refine_models import studio, pose_preview


def geometry_summary(objects):
    vertices = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    assert vertices, "Model contains no geometry"
    dimensions = [max(v[axis] for v in vertices) - min(v[axis] for v in vertices) for axis in range(3)]
    triangles = 0
    for obj in objects:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    return {"dimensions_xyz_m": dimensions, "triangles": triangles, "mesh_count": len(objects)}


def verify_key_cuts():
    head = bpy.data.objects["Key bow | engraved both sides"]
    mesh = head.data
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [p.vertices[:] for p in mesh.polygons])
    hole = tree.ray_cast(Vector((-0.000136, -0.01, 0.024846)), Vector((0, 1, 0)), 0.02)
    assert hole[0] is None, "Key ring hole is blocked"
    measured = {}
    for side, direction in (("front", 1), ("back", -1)):
        depths = []
        for xi in range(161):
            x = -0.012 + xi * 0.024 / 160
            for zi in range(61):
                z = 0.0075 + zi * 0.007 / 60
                hit, normal, index, distance = tree.ray_cast(Vector((x, -direction * 0.01, z)), Vector((0, direction, 0)), 0.02)
                if hit is None:
                    continue
                mat = head.data.materials[mesh.polygons[index].material_index]
                if "engraving" in mat.name:
                    depths.append(0.00175 - abs(hit.y))
        assert depths and max(depths) > 0.0002, f"{side} engraving is not recessed"
        measured[side] = {"engraved_ray_hits": len(depths), "max_depth_mm": round(max(depths) * 1000, 4)}
    return {"ring_hole_open": True, "engraving": measured}


parser = argparse.ArgumentParser()
parser.add_argument("--device", choices=("CPU", "OPTIX"), default="OPTIX")
arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
options = parser.parse_args(arguments)
reports = []
for name in ("cardholder", "key"):
    bpy.ops.wm.open_mainfile(filepath=str(SOURCES / f"{name}.blend"))
    root = bpy.data.objects[name]
    root.rotation_euler = (0, 0, 0)
    assert root.location.length < 0.000001, "Animation pivot moved away from the origin"
    bpy.context.view_layer.update()
    source_objects = [obj for obj in root.children_recursive if obj.type == "MESH"]
    source = geometry_summary(source_objects)
    assert all(not obj.modifiers for obj in source_objects), "An unbaked modifier remains"
    assert all(image.packed_file for image in bpy.data.images if image.source == "FILE"), "Source has unpacked texture dependencies"
    checks = verify_key_cuts() if name == "key" else {"textures_packed": True}
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{name}.glb"))
    imported_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    imported = geometry_summary(imported_objects)
    assert source["triangles"] == imported["triangles"], "Triangle count changed during export"
    for original, restored in zip(source["dimensions_xyz_m"], imported["dimensions_xyz_m"]):
        assert abs(original - restored) < 0.000001, "Dimensions changed during export"
    assert not any(obj.type in ("LIGHT", "CAMERA") for obj in bpy.context.scene.objects), "Studio leaked into GLB"
    reports.append({"name": name, "source": source, "roundtrip": imported, "checks": checks})
    # The web-check previews are rendered from the actual delivered GLBs.
    camera, floor = studio(name, options.device)
    bpy.context.scene.render.resolution_x = 1000
    bpy.context.scene.render.resolution_y = 1000
    bpy.context.scene.cycles.samples = 48
    root = bpy.data.objects[name]
    pose_preview(root, name, camera, floor, "back" if name == "key" else "hero")
    bpy.context.scene.render.filepath = str(PREVIEWS / f"{name}-glb-check.png")
    bpy.ops.render.render(write_still=True)

(MODELS / "roundtrip-validation.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")

panels = []
for filename in ("cardholder-front.png", "cardholder-straight.png", "key-front.png", "cardholder-detail.png", "key-back.png", "key-detail.png"):
    preview = bpy.data.images.load(str(PREVIEWS / filename), check_existing=False)
    preview.scale(600, 600)
    pixels = np.empty(600 * 600 * 4, dtype=np.float32)
    preview.pixels.foreach_get(pixels)
    panels.append(pixels.reshape(600, 600, 4))
overview = bpy.data.images.new("Asset overview", width=1800, height=1200, alpha=True)
# Blender image buffers start at the bottom row.
overview.pixels.foreach_set(np.concatenate((np.concatenate(panels[3:], axis=1), np.concatenate(panels[:3], axis=1)), axis=0).ravel())
overview.filepath_raw = str(PREVIEWS / "overview.png")
overview.file_format = "PNG"
overview.save()
print("ROUNDTRIP_CHECKS", json.dumps(reports))
