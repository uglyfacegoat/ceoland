"""Refine the retained v1 meshes; preserve the product roots and engraving geometry."""

import argparse
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import (
    ROOT, MODELS, SOURCES, PREVIEWS, TEXTURES, active, apply_modifier,
    area_light, boolean, curve_tube, export_model, finalize_model, finish_normals,
    image_from_array, material, planar_uv, point_at, prism, round_outline,
)

BASELINE = ROOT / "revisions" / "v1"


def load_existing(name):
    bpy.ops.wm.open_mainfile(filepath=str(BASELINE / f"{name}.blend"))
    bpy.context.preferences.filepaths.save_version = 0
    root = bpy.data.objects[name]
    root.rotation_mode = "XYZ"
    root.rotation_euler = (0, 0, 0)
    objects = [obj for obj in root.children_recursive if obj.type == "MESH"]
    keep = set(objects) | {root}
    for obj in list(bpy.data.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    to_mm = Matrix.Scale(1000, 4) @ Matrix.Rotation(-math.pi / 2, 4, "X")
    for obj in objects:
        obj.data.transform(to_mm)
        obj.parent = None
        obj.data.update()
    root["revision"] = "v2 | refined from retained v1 meshes"
    return root, objects


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.material_index = 0


def densify(obj, max_edge=4.5):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.triangulate(mesh, faces=list(mesh.faces))
    for _ in range(9):
        long_edges = [edge for edge in mesh.edges if edge.calc_length() > max_edge]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(mesh, edges=long_edges, cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(mesh, faces=list(mesh.faces))
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.data.update()


def pbr_texture(mat, pixels, kind, filename, strength=1):
    image = image_from_array(filename, pixels, TEXTURES / filename)
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    shader = mat.node_tree.nodes.get("Principled BSDF")
    if kind == "Normal":
        normal = mat.node_tree.nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = strength
        mat.node_tree.links.new(texture.outputs["Color"], normal.inputs["Color"])
        mat.node_tree.links.new(normal.outputs["Normal"], shader.inputs["Normal"])
    else:
        mat.node_tree.links.new(texture.outputs["Color"], shader.inputs[kind])


def normal_pixels(height, amplitude):
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * amplitude
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * amplitude
    normals = np.stack((-dx, -dy, np.ones_like(dx)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    return np.concatenate((normals * 0.5 + 0.5, np.ones((*height.shape, 1))), axis=-1)


def gray_pixels(channel):
    return np.stack((channel, channel, channel, np.ones_like(channel)), axis=-1)


def reference_grain(filename, crop, randomize_phase=False):
    source = bpy.data.images.load(str(ROOT / "references" / filename), check_existing=False)
    width, height = source.size
    pixels = np.empty(width * height * 4, np.float32)
    source.pixels.foreach_get(pixels)
    rgb = pixels.reshape(height, width, 4)[::-1, :, :3]
    x, y, crop_width, crop_height = crop
    patch = np.log(np.maximum(rgb[y:y+crop_height, x:x+crop_width].mean(axis=2), 0.001))
    fy, fx = np.meshgrid(np.fft.fftfreq(patch.shape[0]), np.fft.fftfreq(patch.shape[1]), indexing="ij")
    boundary = np.zeros_like(patch)
    boundary[0] = patch[-1] - patch[0]
    boundary[-1] = patch[0] - patch[-1]
    boundary[:, 0] += patch[:, -1] - patch[:, 0]
    boundary[:, -1] += patch[:, 0] - patch[:, -1]
    denominator = 2*np.cos(2*math.pi*fx) + 2*np.cos(2*math.pi*fy) - 4
    denominator[0, 0] = 1
    smooth_spectrum = np.fft.fft2(boundary) / denominator
    smooth_spectrum[0, 0] = 0
    periodic = patch - np.fft.ifft2(smooth_spectrum).real
    spectrum = np.fft.fft2(periodic) * (1-np.exp(-(fx*fx + fy*fy) * 400))
    if randomize_phase:
        phases = np.angle(np.fft.fft2(np.random.default_rng(717).normal(size=patch.shape)))
        spectrum = np.abs(spectrum) * np.exp(1j*phases)
    detail = np.fft.ifft2(spectrum).real
    detail = np.clip(detail / (3 * detail.std()), -1, 1)
    columns = np.linspace(0, detail.shape[1] - 1, 512)
    rows = np.linspace(0, detail.shape[0] - 1, 512)
    horizontal = np.stack([np.interp(columns, np.arange(detail.shape[1]), row) for row in detail])
    resized = np.stack([np.interp(rows, np.arange(detail.shape[0]), horizontal[:, col]) for col in range(512)], axis=1)
    return resized


def refined_leather():
    grain = reference_grain("cardholder-material.png", (240, 730, 200, 200))
    roughness = np.clip(0.60 - grain * 0.055, 0.50, 0.70)
    leather = material("Ivory | grained calf leather", (0.73, 0.70, 0.642), roughness=0.61)
    shader = leather.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Sheen Weight"].default_value = 0.13
    shader.inputs["Specular IOR Level"].default_value = 0.30
    pbr_texture(leather, normal_pixels(grain, 0.85), "Normal", "leather-normal.png", 0.5)
    pbr_texture(leather, gray_pixels(roughness), "Roughness", "leather-roughness.png")
    ink = leather.copy()
    ink.name = "CEO | absorbed navy leather print"
    ink_shader = ink.node_tree.nodes.get("Principled BSDF")
    ink_shader.inputs["Base Color"].default_value = (0.004, 0.014, 0.042, 1)
    ink_shader.inputs["Sheen Weight"].default_value = 0
    ink_shader.inputs["Specular IOR Level"].default_value = 0.1
    ink.diffuse_color = (0.004, 0.014, 0.042, 1)
    blue = leather.copy()
    blue.name = "Insert | midnight blue grained finish"
    blue_shader = blue.node_tree.nodes.get("Principled BSDF")
    blue_shader.inputs["Base Color"].default_value = (0.0015, 0.016, 0.065, 1)
    blue_shader.inputs["Sheen Weight"].default_value = 0.02
    blue.diffuse_color = (0.0015, 0.016, 0.065, 1)
    for link in list(blue.node_tree.links):
        if link.to_socket == blue_shader.inputs["Roughness"]:
            blue.node_tree.links.remove(link)
    blue_shader.inputs["Roughness"].default_value = 0.58
    blue_shader.inputs["Specular IOR Level"].default_value = 0.12
    return leather, ink, blue


def front_surface(x, y):
    cross = max(0, 1 - (x / 52.5) ** 2)
    along = max(0, math.sin(math.pi * min(1, max(0, (y + 42) / 56))))
    return 3.65 + 0.43 * cross * along + 0.24 * cross * math.exp(-((y - 12.5) / 3.2) ** 2)


def seam_geometry(name, outline, surface, thread, spacing=2.5, closed=False, back=False):
    points = list(outline) + ([outline[0]] if closed else [])
    lengths = [0]
    for p, q in zip(points, points[1:]):
        lengths.append(lengths[-1] + math.dist(p, q))

    def at(distance):
        segment = min(len(points) - 2, max(0, int(np.searchsorted(lengths, distance) - 1)))
        p, q = Vector(points[segment]), Vector(points[segment + 1])
        tangent = (q - p).normalized()
        return p.lerp(q, (distance - lengths[segment]) / (lengths[segment + 1] - lengths[segment])), tangent

    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.155
    curve.bevel_resolution = 1
    curve.use_fill_caps = True
    curve.resolution_u = 1
    count = int(lengths[-1] / spacing)
    for index in range(count):
        center = (index + 0.5) * lengths[-1] / count
        spline = curve.splines.new("POLY")
        spline.points.add(4)
        for control, fraction in zip(spline.points, np.linspace(0, 1, 5)):
            point, tangent = at(center + (fraction - 0.5) * 1.82)
            perpendicular = Vector((-tangent.y, tangent.x))
            point += perpendicular * (fraction - 0.5) * 0.22
            lift = -0.08 + math.sin(fraction * math.pi) * 0.20
            depth = surface(point.x, point.y) + (-lift if back else lift)
            control.co = (point.x, point.y, depth, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(thread)
    active(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def refine_cardholder(objects):
    by_name = {obj.name: obj for obj in objects}
    leather, ink, blue = refined_leather()
    edge = material("Ivory | hand-finished edge paint", (0.45, 0.418, 0.366), roughness=0.42)
    thread = material("Ivory | linen saddle thread", (0.63, 0.588, 0.51), roughness=0.76)
    obsolete = {"Card navy stripe", "Front saddle stitching", "Front stitch impression", "Back saddle stitching", "Visible upper stitching"}
    for name in obsolete:
        bpy.data.objects.remove(by_name[name], do_unlink=True)
    objects = [obj for name, obj in by_name.items() if name not in obsolete]

    backing = by_name["Leather backing"]
    densify(backing, 6.8)
    for vertex in backing.data.vertices:
        x, y, z = vertex.co
        vertex.co.y *= 84 / 78
        bulge = max(0, 1 - (x / 52.5) ** 2) * max(0, 1 - (y / 39) ** 2) * 0.25
        vertex.co.z = z - bulge
    assign(backing, leather)
    for name in ("Pocket interior", "Backing painted edge"):
        for vertex in by_name[name].data.vertices:
            vertex.co.y *= 84 / 78
            if name == "Pocket interior":
                vertex.co.y = -40 + (vertex.co.y + 39.15) * 72 / 78.3
    assign(by_name["Backing painted edge"], edge)
    card = by_name["Inserted card"]
    for vertex in card.data.vertices:
        vertex.co.y -= 2.25
        vertex.co.z -= 0.12
    assign(card, blue)

    pocket = by_name["Front leather pocket"]
    densify(pocket, 6.5)
    for vertex in pocket.data.vertices:
        x, y, z = vertex.co
        y = -42 + (y + 39) * 56 / 60.5
        depth_fraction = (z - 0.82) / 2.16
        vertex.co = (x, y, front_surface(x, y) - (1 - depth_fraction) * 1.55)
    assign(pocket, leather)
    pocket_edge = by_name["Pocket painted edge"]
    for vertex in pocket_edge.data.vertices:
        x, y, z = vertex.co
        y = -42 + (y + 39) * 56 / 60.5
        vertex.co = (x, y, front_surface(x, y) - 0.77 + z - 1.55)
    assign(pocket_edge, edge)

    middle = prism("Middle leather pocket | unstitched upper edge", round_outline(104.6, 67.4, 8.1, cy=-8.1, top_radius=2.2), 0.72, 1.98, leather, 0.49, 4)
    densify(middle, 8)
    for vertex in middle.data.vertices:
        x, y, z = vertex.co
        vertex.co.z += 0.16 * max(0, 1 - (x / 52.3) ** 2) * math.exp(-((y - 24) / 5) ** 2)
    objects.append(middle)
    middle_lip = [(x, 25.4 - 0.18 * (1 - (x / 50.4) ** 2), 1.89) for x in np.linspace(-50.4, 50.4, 81)]
    objects.append(curve_tube("Middle pocket rolled lip | no stitching", middle_lip, 0.18, leather, resolution=2))
    # A leather welt closes the stitched sides and bottom without sealing the slots.
    full_welt = round_outline(101.8, 80.7, 7.2, steps=16)
    side_bottom = [(x, y, 0.78) for x, y in full_welt if y <= 25.2]
    side_bottom.insert(0, (-50.9, 25.2, 0.78))
    side_bottom.append((50.9, 25.2, 0.78))
    objects.append(curve_tube("Joined leather side and bottom welt", side_bottom, 1.37, leather, resolution=3))

    front_seam = round_outline(99.3, 50.4, 5.5, cy=-14, top_radius=1.3, steps=16)
    objects.append(seam_geometry("Front saddle stitching", front_seam, front_surface, thread, closed=True))
    back_perimeter = round_outline(99.3, 78.3, 5.6, steps=16)
    back_sides = [(x, y) for x, y in back_perimeter if y < 25.0]
    back_sides.insert(0, (-49.65, 25))
    back_sides.append((49.65, 25))
    objects.append(seam_geometry("Back side and bottom stitching", back_sides, lambda x, y: -2.73, thread, back=True))

    for name, old_center, new_center, width_scale in (
        ("Printed logo | I'm CEO,", 0.2, -7.1, 64 / 70),
        ("Printed logo | Bitch", -17, -23.8, 44.8 / 49),
    ):
        logo = by_name[name]
        densify(logo, 2.8)
        for vertex in logo.data.vertices:
            x, y, z = vertex.co
            y = (y - old_center) * width_scale + new_center
            x = x * width_scale + 0.10 * (y - new_center)
            vertex.co = (x, y, front_surface(x, y) + 0.008 + (z - 2.993) * 0.35)
        assign(logo, ink)

    for obj in objects:
        obj.data.update()
        for uv in list(obj.data.uv_layers):
            obj.data.uv_layers.remove(uv)
        if any(mat in (leather, blue, ink) for mat in obj.data.materials):
            planar_uv(obj, 28)
        finish_normals(obj)
    return objects


def brushed_metal():
    surface = reference_grain("key-material.png", (485, 270, 120, 70), randomize_phase=True)
    rough = np.clip(0.25 + surface * 0.010, 0.23, 0.28)
    steel = material("Key | horizontally brushed stainless steel", (0.62, 0.645, 0.668), metallic=1, roughness=0.29)
    pbr_texture(steel, normal_pixels(surface, 0.16), "Normal", "steel-normal.png", 0.30)
    pbr_texture(steel, gray_pixels(rough), "Roughness", "steel-roughness.png")
    polished = material("Key | polished machined bevels", (0.69, 0.715, 0.73), metallic=1, roughness=0.17)
    return steel, polished


def simplify_polyline(points, tolerance=0.9):
    points = np.asarray(points, dtype=float)
    if len(points) < 3:
        return list(map(tuple, points))
    segment = points[-1] - points[0]
    length = np.linalg.norm(segment)
    distances = np.linalg.norm(points-points[0], axis=1) if length == 0 else np.abs(segment[0]*(points[:, 1]-points[0, 1])-segment[1]*(points[:, 0]-points[0, 0]))/length
    farthest = int(np.argmax(distances))
    if distances[farthest] <= tolerance:
        return [tuple(points[0]), tuple(points[-1])]
    return simplify_polyline(points[:farthest+1], tolerance)[:-1] + simplify_polyline(points[farthest:], tolerance)


def reference_profiles():
    report = json.loads((ROOT / "references/key-profile.json").read_text(encoding="utf-8"))
    scale = 29 / 534
    def contour(rows):
        left = simplify_polyline([(row[1], row[0]) for row in rows])
        right = simplify_polyline([(row[2], row[0]) for row in rows][::-1])
        return [((x-315)*scale, (660.5-y)*scale) for x, y in left+right]
    head = contour([row for row in report["rows"] if row[0] <= 650])
    blade_rows = [row for row in report["rows"] if row[0] >= 655]
    blade_rows.insert(0, [626, 238, 403])
    return head, contour(blade_rows), contour(report["hole_rows"])


def ray_radius(outline, center, direction):
    distances = []
    for a, b in zip(outline, outline[1:] + outline[:1]):
        p = Vector(a) - center
        edge = Vector(b) - Vector(a)
        cross = direction.x * edge.y - direction.y * edge.x
        if abs(cross) < 1e-8:
            continue
        distance = (p.x*edge.y - p.y*edge.x) / cross
        fraction = (p.x*direction.y - p.y*direction.x) / cross
        if distance > 0 and -1e-6 <= fraction <= 1+1e-6:
            distances.append(distance)
    if not distances:
        raise RuntimeError("Reference outline is not star-shaped around the selected center")
    return min(distances)


def refine_key(objects):
    steel, polished = brushed_metal()
    head_outline, blade_outline, hole_outline = reference_profiles()
    old_outline = round_outline(29, 33, 8.3, cy=19.5, steps=16)
    old_center = Vector((0, 19.5))
    new_center = Vector((0, (660.5-365)*29/534))
    hole_center = Vector(((312.5-315)*29/534, (660.5-203)*29/534))
    head = next(obj for obj in objects if obj.name.startswith("Key bow"))
    outline_mesh = bmesh.new()
    outline_mesh.from_mesh(head.data)
    for _ in range(6):
        long_edges = [edge for edge in outline_mesh.edges if edge.calc_length() > 1.2 and all(abs(vertex.co.x) > 10 or vertex.co.y + 3.25 < 8 or vertex.co.y + 3.25 > 31 for vertex in edge.verts)]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(outline_mesh, edges=long_edges, cuts=1, use_grid_fill=True)
    outline_mesh.to_mesh(head.data)
    outline_mesh.free()
    for vertex in head.data.vertices:
        x, centered_y, z = vertex.co
        y = centered_y + 3.25
        offset = Vector((x, y)) - old_center
        direction = offset.normalized() if offset.length else Vector((1, 0))
        old_radius = ray_radius(old_outline, old_center, direction)
        target_radius = ray_radius(head_outline, new_center, direction)
        affine = new_center + Vector((offset.x, offset.y * 30.95/33))
        perimeter = new_center + offset * target_radius / old_radius
        fraction = min(1, max(0, (offset.length/old_radius - 0.52)/0.35))
        fraction = fraction*fraction*(3-2*fraction)
        mapped = affine.lerp(perimeter, fraction)
        mapped_y = mapped.y
        original_x = x
        x = mapped.x
        radius = math.hypot(original_x, y - 28)
        if radius < 6.2:
            theta = math.atan2(y - 28, original_x)
            hole_direction = Vector((math.cos(theta), math.sin(theta)))
            hole_radius = ray_radius(hole_outline, hole_center, hole_direction)
            influence = min(1, max(0, (6.2 - radius) / 2.5))
            target = hole_center + hole_direction * radius * hole_radius / 3.25
            target_x, target_y = target
            x += (target_x - x) * influence
            mapped_y += (target_y - mapped_y) * influence
        # Preserve the existing cut letters, but make their depth more restrained.
        depth = 1.75 - (1.35 - abs(z)) * 0.8 if abs(z) >= 1 else abs(z) * 1.47
        vertex.co = (x, mapped_y, math.copysign(depth, z))
    head.data.update()
    engraving_slots = {i for i, mat in enumerate(head.data.materials) if "engraving" in mat.name}
    bevel_mesh = bmesh.new()
    bevel_mesh.from_mesh(head.data)
    weights = bevel_mesh.edges.layers.float.new("bevel_weight_edge")
    for edge in bevel_mesh.edges:
        edge[weights] = float(len(edge.link_faces) == 2 and edge.calc_face_angle() > math.radians(30) and any(face.material_index in engraving_slots for face in edge.link_faces))
    bevel_mesh.to_mesh(head.data)
    bevel_mesh.free()
    micro_bevel = head.modifiers.new("Engraving lip micro bevel", "BEVEL")
    micro_bevel.width = 0.025
    micro_bevel.segments = 2
    micro_bevel.limit_method = "WEIGHT"
    apply_modifier(head, micro_bevel)
    head.data.attributes.remove(head.data.attributes["bevel_weight_edge"])
    old_mats = list(head.data.materials)
    engraving = next(mat for mat in old_mats if "engraving" in mat.name)
    engraving.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.016, 0.019, 0.022, 1)
    engraving.node_tree.nodes.get("Principled BSDF").inputs["Metallic"].default_value = 0.55
    engraving.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value = 0.40
    material_indices = [face.material_index for face in head.data.polygons]
    head.data.materials.clear()
    for mat in (steel, polished, engraving):
        head.data.materials.append(mat)
    for face, previous in zip(head.data.polygons, material_indices):
        face.material_index = 2 if "engraving" in old_mats[previous].name else (0 if abs(face.normal.z) > 0.985 else 1)

    blade = next(obj for obj in objects if obj.name.startswith("Key blade"))
    # Recut this component: overlapping old tooth-rack faces produced bad shading.
    replacement = prism("Recut blade mesh", blade_outline, -1.25, 1.25, steel, 0.11, 3)
    blade.data = replacement.data
    bpy.data.objects.remove(replacement, do_unlink=True)
    shoulder = next(obj for obj in objects if obj.name == "Key shoulder")
    for vertex in shoulder.data.vertices:
        x, centered_y, z = vertex.co
        y = centered_y + 3.25
        vertex.co = (0.299 + x * 8.96 / 9.8, -1.40 + (y - 4.6) * 6.52/3.4, 0.145 + z * 1.625 / 1.26)
    assign(shoulder, steel)
    # One solid avoids coincident flute floors at the neck/blade overlap.
    objects.remove(shoulder)
    boolean(blade, shoulder, "UNION")
    for target in (blade,):
        for center, width in ((-0.75, 1.12), (1.25, 1.06)):
            flute_outline = [(center-width/2,-33),(center+width/2,-33),(center+width/2,-5.5),(center,-1.05),(center-width/2,-5.5)]
            for back in (False, True):
                cutter = prism("Milled flute cutter", flute_outline, -2.2 if back else 0.57, -0.57 if back else 2.2, steel, 0.055, 3)
                boolean(target, cutter)
        lip = target.modifiers.new("Flute edge micro bevel", "BEVEL")
        lip.width = 0.025
        lip.segments = 2
        lip.limit_method = "ANGLE"
        lip.angle_limit = math.radians(55)
        apply_modifier(target, lip)
        target.data.materials.append(polished)
        for face in target.data.polygons:
            if 0.05 < abs(face.normal.z) < 0.97:
                face.material_index = len(target.data.materials)-1
    for obj in objects:
        clean_mesh = bmesh.new()
        clean_mesh.from_mesh(obj.data)
        bmesh.ops.triangulate(clean_mesh, faces=list(clean_mesh.faces))
        bmesh.ops.dissolve_degenerate(clean_mesh, dist=0.0001, edges=list(clean_mesh.edges))
        bmesh.ops.recalc_face_normals(clean_mesh, faces=list(clean_mesh.faces))
        for edge in clean_mesh.edges:
            if len(edge.link_faces) == 2:
                edge.smooth = edge.calc_face_angle() < math.radians(35)
        clean_mesh.to_mesh(obj.data)
        clean_mesh.free()
        for uv in list(obj.data.uv_layers):
            obj.data.uv_layers.remove(uv)
        planar_uv(obj, 4)
        if obj != head:
            for uv in obj.data.uv_layers.active.data:
                uv.uv = (uv.uv.y, -uv.uv.x)
        finish_normals(obj)
    return objects


def studio(name, device="OPTIX"):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.012
    scene.cycles.adaptive_min_samples = 24
    scene.cycles.max_bounces = 8
    if device == "OPTIX":
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "OPTIX"
        preferences.refresh_devices()
        if not any(gpu.type == "OPTIX" for gpu in preferences.devices):
            raise RuntimeError("No OptiX device available; rerun with --device CPU")
        for gpu in preferences.devices:
            gpu.use = gpu.type == "OPTIX"
        scene.cycles.device = "GPU"
    else:
        scene.cycles.device = "CPU"
    print("RENDER_DEVICE", device, flush=True)
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1600
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Studio | restrained neutral ambient")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (0.5, 0.52, 0.55, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = 0.55
    floor_mat = material("Studio | neutral seamless sweep", (0.48, 0.49, 0.505), roughness=0.7)
    sweep = [(-1, 0), (0.12, 0)]
    sweep += [(0.12 + 0.12 * math.sin(angle), 0.12 * (1 - math.cos(angle))) for angle in np.linspace(0, math.pi / 2, 33)[1:]]
    sweep.append((0.24, 0.8))
    floor_mesh = bpy.data.meshes.new("Seamless curved studio sweep")
    floor_mesh.from_pydata([(x, y, z) for y, z in sweep for x in (-1, 1)], [], [(2*i, 2*i+1, 2*i+3, 2*i+2) for i in range(len(sweep)-1)])
    floor_mesh.update()
    for face in floor_mesh.polygons:
        face.use_smooth = True
    floor = bpy.data.objects.new("Seamless curved studio sweep", floor_mesh)
    bpy.context.collection.objects.link(floor)
    floor.name = "Studio floor (excluded from GLB)"
    floor.data.materials.append(floor_mat)
    if name == "key":
        floor.visible_glossy = False
    area_light("Softbox | sculpting key", (-0.095, -0.12, 0.17), 1.5, 0.075, (0, 0, 0), size_y=0.13)
    area_light("Softbox | gentle fill", (0.14, -0.09, 0.065), 0.15, 0.14, (0, 0, 0))
    area_light("Strip | edge definition", (0.095, 0.06, 0.11), 0.85, 0.025, (0, 0, 0.005), size_y=0.15)
    if name == "key":
        area_light("Strip | steel reflection", (0.065, -0.12, -0.012), 0.035, 0.025, (0, 0, 0.01), size_y=0.12)
        black = material("Studio | negative fill", (0.008, 0.009, 0.011), roughness=1)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0.09, -0.12, -0.024))
        flag = bpy.context.object
        flag.name = "Reflection flag (excluded from GLB)"
        flag.scale = (0.028, 0.15, 1)
        point_at(flag, (0, 0, 0.01))
        flag.data.materials.append(black)
        flag.visible_camera = False
        flag.visible_shadow = False
        flag.visible_diffuse = False
        rear_flag = flag.copy()
        rear_flag.data = flag.data.copy()
        bpy.context.collection.objects.link(rear_flag)
        rear_flag.name = "Bore reflection flag (excluded from GLB)"
        rear_flag.location = (0.025, 0.045, 0.026)
        rear_flag.scale = (0.05, 0.085, 1)
        point_at(rear_flag, (0, 0, 0.026))
    camera_data = bpy.data.cameras.new("Product preview camera")
    camera_data.type = "PERSP"
    camera_data.lens = 82 if name == "cardholder" else 95
    camera_data.clip_start = 0.001
    camera_data.clip_end = 300
    camera = bpy.data.objects.new("Product preview camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    return camera, floor


def pose_preview(root, name, camera, floor, view="hero"):
    root.rotation_mode = "XYZ"
    root.rotation_euler = (math.radians(5), math.radians(-2), 0) if name == "cardholder" else (0, math.radians(-8), 0)
    camera.data.type = "PERSP"
    camera.data.lens = 82 if name == "cardholder" else 95
    target = (0, 0, -0.003)
    if name == "cardholder":
        camera.location = (-0.125, -0.26, 0.082)
        if view == "straight":
            root.rotation_euler = (0, 0, 0)
            camera.location = (0, -0.295, 0)
            target = (0, 0, 0)
        if view == "detail":
            camera.location = (-0.035, -0.138, 0.051)
            target = (-0.011, 0, 0.002)
            camera.data.lens = 98
    else:
        camera.location = (-0.092, -0.212, 0.052)
        if view == "straight":
            root.rotation_euler = (0, 0, 0)
            camera.location = (0, -0.24, 0)
            camera.data.type = "ORTHO"
            camera.data.ortho_scale = 0.078
            camera.location.z = 0.008
            target = (0, 0, 0)
        if view == "back":
            root.rotation_euler.z = math.pi
        if view == "detail":
            camera.location = (-0.085, -0.102, 0.043)
            target = (0, 0, 0.015)
            camera.data.lens = 102
    point_at(camera, target)
    bpy.context.view_layer.update()
    bottom = min((obj.matrix_world @ vertex.co).z for obj in root.children_recursive if obj.type == "MESH" for vertex in obj.data.vertices)
    floor.location.z = bottom - (0.00018 if name == "key" else 0.0003)


def render_previews(root, name, draft=False, device="OPTIX"):
    camera, floor = studio(name, device)
    scene = bpy.context.scene
    if draft:
        scene.render.resolution_percentage = 50
        scene.cycles.samples = 32
    pose_preview(root, name, camera, floor)
    active(root)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.clip_start = 0.001
                area.spaces.active.shading.type = "MATERIAL"
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES / f"{name}.blend"))
    views = [("hero", f"{name}-front.png")]
    if not draft:
        views += [("straight", "cardholder-straight.png"), ("detail", "cardholder-detail.png")] if name == "cardholder" else [("back", "key-back.png"), ("straight", "key-straight.png"), ("detail", "key-detail.png")]
    for view, filename in views:
        pose_preview(root, name, camera, floor, view)
        scene.render.filepath = str(PREVIEWS / filename)
        bpy.ops.render.render(write_still=True)


def main():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=("all", "cardholder", "key"), default="all")
    parser.add_argument("--draft", action="store_true")
    parser.add_argument("--device", choices=("CPU", "OPTIX"), default="OPTIX")
    options = parser.parse_args(arguments)
    reports = []
    for name, refinement in (("cardholder", refine_cardholder), ("key", refine_key)):
        if options.model not in ("all", name):
            continue
        root, objects = load_existing(name)
        objects = refinement(objects)
        finalize_model(objects, name, root)
        bpy.context.view_layer.update()
        # Material separation omits UVs/tangents on untextured metal bevels.
        reports.append(export_model(objects, root, name, split_materials=name == "key"))
        bpy.data.orphans_purge(do_recursive=True)
        render_previews(root, name, options.draft, options.device)
    report_file = MODELS / "manifest.json"
    if options.model != "all":
        previous = json.loads(report_file.read_text(encoding="utf-8"))
        reports = [entry for entry in previous if entry["name"] != options.model] + reports
    report_file.write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print("REFINED_ASSETS", json.dumps(reports))


if __name__ == "__main__":
    main()
