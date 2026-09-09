"""Build CEO site assets with Blender: millimetre modelling, metre GLB exports."""

import argparse
import json
import math
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "assets" / "models"
SOURCES = ROOT / "blender"
PREVIEWS = ROOT / "previews"
TEXTURES = SOURCES / "textures"
FONT_REGULAR = Path("C:/Windows/Fonts/arial.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
FONT_NARROW = Path("C:/Windows/Fonts/ARIALN.TTF")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0


def material(name, color, metallic=0.0, roughness=0.4):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat


def image_from_array(name, pixels, path):
    height, width = pixels.shape[:2]
    img = bpy.data.images.new(name, width=width, height=height, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(pixels.astype(np.float32).ravel())
    img.filepath_raw = str(path)
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


def leather_material():
    mat = material("Ivory | fine-grain leather", (0.72, 0.71, 0.675), roughness=0.64)
    rng = np.random.default_rng(2794)
    size = 512
    fy, fx = np.meshgrid(np.fft.fftfreq(size), np.fft.fftfreq(size), indexing="ij")
    frequencies = fx * fx + fy * fy

    def smooth_noise(radius):
        spectrum = np.fft.fft2(rng.normal(size=(size, size)))
        filtered = np.fft.ifft2(spectrum * np.exp(-frequencies * radius * radius)).real
        return (filtered - filtered.mean()) / filtered.std()

    grain = smooth_noise(14)
    height = 0.45 * np.tanh(grain * 1.8) + 0.13 * smooth_noise(3.5)
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.65
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.65
    normals = np.stack((-dx, -dy, np.ones_like(dx)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    normal_pixels = np.concatenate((normals * 0.5 + 0.5, np.ones((size, size, 1))), axis=-1)
    roughness = np.clip(0.65 + grain * 0.045, 0.51, 0.79)
    rough_pixels = np.stack((roughness, roughness, roughness, np.ones_like(roughness)), axis=-1)
    normal_img = image_from_array("Leather grain normal", normal_pixels, TEXTURES / "leather-normal.png")
    rough_img = image_from_array("Leather grain roughness", rough_pixels, TEXTURES / "leather-roughness.png")
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Sheen Weight"].default_value = 0.12
    normal_texture = nodes.new("ShaderNodeTexImage")
    normal_texture.image = normal_img
    normal_texture.label = "Seamless 24 mm grain tile"
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.8
    links.new(normal_texture.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    rough_texture = nodes.new("ShaderNodeTexImage")
    rough_texture.image = rough_img
    links.new(rough_texture.outputs["Color"], shader.inputs["Roughness"])
    return mat


def active(obj):
    edit_object = bpy.context.edit_object
    if edit_object is not None:
        with bpy.context.temp_override(object=edit_object, active_object=edit_object):
            bpy.ops.object.mode_set(mode="OBJECT")
    for selected in bpy.context.view_layer.objects:
        selected.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj, modifier):
    active(obj)
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj]):
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def round_outline(width, height, radius, cx=0, cy=0, steps=12, top_radius=None):
    top = radius if top_radius is None else top_radius
    corners = [
        (cx + width / 2 - top, cy + height / 2 - top, top, 0),
        (cx - width / 2 + top, cy + height / 2 - top, top, 90),
        (cx - width / 2 + radius, cy - height / 2 + radius, radius, 180),
        (cx + width / 2 - radius, cy - height / 2 + radius, radius, 270),
    ]
    outline = []
    for x, y, corner_radius, start in corners:
        for index in range(steps + 1):
            angle = math.radians(start + index * 90 / steps)
            outline.append((x + corner_radius * math.cos(angle), y + corner_radius * math.sin(angle)))
    return outline


def prism(name, outline, zmin, zmax, mat, bevel=0, segments=3):
    count = len(outline)
    vertices = [(x, y, z) for z in (zmin, zmax) for x, y in outline]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces.extend((i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if bevel:
        edge = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        edge.width = bevel
        edge.segments = segments
        apply_modifier(obj, edge)
    return obj


def finish_normals(obj):
    for face in obj.data.polygons:
        face.use_smooth = True
    weighted = obj.modifiers.new("Weighted surface normals", "WEIGHTED_NORMAL")
    weighted.keep_sharp = True
    weighted.weight = 40
    apply_modifier(obj, weighted)


def planar_uv(obj, tile=24):
    obj.data.update()
    uv = obj.data.uv_layers.new(name="Surface UV")
    for face in obj.data.polygons:
        normal = face.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        for loop_index in face.loop_indices:
            point = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
            coords = ((point.y, point.z), (point.x, point.z), (point.x, point.y))[axis]
            uv.data[loop_index].uv = (coords[0] / tile, coords[1] / tile)


def curve_tube(name, points, radius, mat, cyclic=False, resolution=2):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, position in zip(spline.points, points):
        point.co = (*position, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    active(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def stitch_run(name, outline, z, thread, closed=True, spacing=2.65):
    points = list(outline)
    if closed:
        points.append(points[0])
    cumulative = [0.0]
    for p, q in zip(points, points[1:]):
        cumulative.append(cumulative[-1] + math.dist(p, q))

    def interpolate(distance):
        for index in range(len(cumulative) - 1):
            if distance <= cumulative[index + 1]:
                fraction = (distance - cumulative[index]) / (cumulative[index + 1] - cumulative[index])
                p, q = points[index:index + 2]
                return (p[0] + (q[0] - p[0]) * fraction, p[1] + (q[1] - p[1]) * fraction)
        return points[-1]

    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.16
    curve.bevel_resolution = 1
    curve.use_fill_caps = True
    count = int(cumulative[-1] / spacing)
    for index in range(count):
        center = (index + 0.5) * cumulative[-1] / count
        a, b = interpolate(center - 0.76), interpolate(center + 0.76)
        spline = curve.splines.new("POLY")
        spline.points.add(2)
        for point, position in zip(spline.points, [(a[0], a[1], z), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z + 0.075), (b[0], b[1], z)]):
            point.co = (*position, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(thread)
    active(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def text_mesh(name, text, font_path, width, x, y, zmin, zmax, mat, back=False, offset=0):
    if not font_path.is_file():
        raise FileNotFoundError(font_path)
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.font = bpy.data.fonts.load(str(font_path), check_existing=True)
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 1
    curve.offset = offset
    curve.resolution_u = 5
    curve.extrude = 0.05
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    active(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    vertices = obj.data.vertices
    bounds = [(min(v.co[i] for v in vertices), max(v.co[i] for v in vertices)) for i in range(3)]
    scale = width / (bounds[0][1] - bounds[0][0])
    for vertex in vertices:
        px = (vertex.co.x - sum(bounds[0]) / 2) * scale
        py = (vertex.co.y - sum(bounds[1]) / 2) * scale
        pz = zmin + (vertex.co.z - bounds[2][0]) / (bounds[2][1] - bounds[2][0]) * (zmax - zmin)
        vertex.co = (x - px if back else x + px, y + py, -pz if back else pz)
    obj.data.update()
    return obj


def boolean(target, cutter, operation="DIFFERENCE"):
    modifier = target.modifiers.new("Precision cut", "BOOLEAN")
    modifier.operation = operation
    modifier.solver = "EXACT"
    modifier.object = cutter
    modifier.material_mode = "TRANSFER"
    apply_modifier(target, modifier)
    bpy.data.objects.remove(cutter, do_unlink=True)


def engrave(target, text, width, y, etch, back=False):
    label = text_mesh("Engraving cutter", text, FONT_NARROW, width, 0, y, 1.095, 1.7, etch, back)
    boolean(target, label)


def build_cardholder():
    leather = leather_material()
    edge_paint = material("Ivory | sealed edge", (0.57, 0.564, 0.529), roughness=0.52)
    lining = material("Pocket | suede lining", (0.46, 0.45, 0.42), roughness=0.9)
    thread = material("Ivory | waxed saddle stitch", (0.48, 0.465, 0.415), roughness=0.72)
    seam = material("Leather | stitch channel", (0.61, 0.60, 0.56), roughness=0.75)
    navy = material("CEO | deep navy ink", (0.005, 0.024, 0.093), roughness=0.44)
    navy.node_tree.nodes.get("Principled BSDF").inputs["Specular IOR Level"].default_value = 0.12
    card_mat = material("Card | warm white PVC", (0.85, 0.858, 0.845), roughness=0.34)
    objects = []
    backing_outline = round_outline(105, 78, 8.5)
    backing = prism("Leather backing", backing_outline, -2.7, -0.3, leather, 0.65, 4)
    objects.append(backing)
    objects.append(prism("Pocket interior", round_outline(99.7, 72.7, 6.3), -0.36, -0.20, lining, 0.06, 2))
    objects.append(curve_tube("Backing painted edge", [(x, y, -1.7) for x, y in backing_outline], 0.16, edge_paint, True))
    card_outline = round_outline(97.5, 61.5, 3.1, cy=6)
    objects.append(prism("Inserted card", card_outline, -0.04, 0.72, card_mat, 0.20, 3))
    stripe_outline = round_outline(94.3, 5.6, 0.35, cy=31.4, steps=4)
    objects.append(prism("Card navy stripe", stripe_outline, 0.725, 0.742, navy))
    pocket_outline = round_outline(105, 60.5, 8.5, cy=-8.75, top_radius=2.6)
    pocket = prism("Front leather pocket", pocket_outline, 0.82, 2.98, leather, 0.65, 4)
    objects.append(pocket)
    objects.append(curve_tube("Pocket painted edge", [(x, y, 1.55) for x, y in pocket_outline], 0.13, edge_paint, True))
    front_seam = round_outline(99.4, 54.9, 6, cy=-8.75, top_radius=1.5)
    objects.append(curve_tube("Front stitch impression", [(x, y, 2.975) for x, y in front_seam], 0.065, seam, True, 1))
    objects.append(stitch_run("Front saddle stitching", front_seam, 3.015, thread))
    back_seam = round_outline(99.4, 72.4, 6.1)
    objects.append(stitch_run("Back saddle stitching", back_seam, -2.735, thread))
    # The top of the backing remains visible above the card.
    top_stitch = [(x, y) for x, y in back_seam if y >= 22.8]
    objects.append(stitch_run("Visible upper stitching", top_stitch, -0.265, thread, closed=False))
    objects.append(text_mesh("Printed logo | I'm CEO,", "I’m CEO,", FONT_BOLD, 70, 0, 0.2, 2.993, 3.010, navy))
    objects.append(text_mesh("Printed logo | Bitch", "Bitch", FONT_BOLD, 49, 0, -17, 2.993, 3.010, navy))
    for obj in objects:
        if any(mat == leather for mat in obj.data.materials):
            planar_uv(obj)
        finish_normals(obj)
    return objects


def build_key():
    silver = material("Key | satin nickel", (0.69, 0.72, 0.74), metallic=1, roughness=0.27)
    bevel_silver = material("Key | milled nickel", (0.59, 0.62, 0.65), metallic=1, roughness=0.23)
    etch = material("Key | recessed dark engraving", (0.055, 0.065, 0.070), metallic=0.85, roughness=0.50)
    head = prism("Key bow | engraved both sides", round_outline(29, 33, 8.3, cy=19.5, steps=16), -1.35, 1.35, silver, 0.42, 4)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=3.25, depth=5, location=(0, 28, 0))
    ring_hole = bpy.context.object
    ring_hole.data.materials.append(silver)
    boolean(head, ring_hole)
    rim = head.modifiers.new("Ring hole edge softening", "BEVEL")
    rim.width = 0.10
    rim.segments = 3
    rim.limit_method = "ANGLE"
    rim.angle_limit = math.radians(40)
    apply_modifier(head, rim)
    engrave(head, "ACCESS", 18.8, 14.3, etch)
    engrave(head, "CM-7X92-KD31", 23.4, 14.3, etch, back=True)

    blade_outline = [
        (-4.5, 7), (-4.5, 1), (-4.0, 0), (-4.0, -2.5),
        (-2.5, -3.1), (-2.5, -4.6), (-4.0, -5.2), (-4.0, -7.1),
        (-3.0, -7.7), (-3.0, -9.0), (-4.0, -9.6), (-4.0, -12.0),
        (-2.25, -12.8), (-2.25, -14.3), (-4.0, -15.0), (-4.0, -17.2),
        (-2.85, -17.8), (-2.85, -19.1), (-4.0, -19.9), (-4.0, -22.1),
        (-3.25, -22.7), (-3.25, -24.1), (-3.85, -24.7), (-3.85, -26.4),
        (-0.6, -29.5), (1.35, -29.5), (4.0, -26.4), (4.0, -22.5),
        (3.3, -21.8), (4.0, -20.8), (4.0, -16.2), (3.35, -15.5),
        (4.0, -14.5), (4.0, -10.0), (3.35, -9.3), (4.0, -8.4),
        (4.0, -2.0), (4.5, -1.1), (4.5, 7),
    ]
    blade = prism("Key blade | cut teeth and flutes", blade_outline, -1.1, 1.1, bevel_silver, 0.13, 3)
    for x, width, start in [(-0.75, 0.72, 3.3), (1.75, 0.62, 4.5)]:
        flute = [(x-width/2, -27.7), (x+width/2, -27.7), (x+width/2, start-2.1), (x, start), (x-width/2, start-2.1)]
        for back in (False, True):
            cutter = prism("Flute cutter", flute, -1.5 if back else 0.76, -0.76 if back else 1.5, bevel_silver, 0.055, 2)
            boolean(blade, cutter)
    collar = prism("Key shoulder", round_outline(9.8, 3.4, 0.45, cy=4.6, steps=5), -1.26, 1.26, silver, 0.14, 3)
    for obj in (head, blade, collar):
        finish_normals(obj)
        for vertex in obj.data.vertices:
            vertex.co.y -= 3.25
    return [head, blade, collar]


def finalize_model(objects, name, root=None):
    if root is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
        root = bpy.data.objects.new(name, None)
        collection.objects.link(root)
    else:
        collection = root.users_collection[0]
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.015
    root["units"] = "meters"
    root["front"] = "Blender -Y; glTF +Z"
    # Bake the orientation and metre scale: web code receives an upright asset.
    transform = Matrix.Rotation(math.pi / 2, 4, "X") @ Matrix.Scale(0.001, 4)
    for obj in objects:
        obj.data.transform(transform)
        obj.data.update()
        textured = any(node.type == "TEX_IMAGE" for mat in obj.data.materials for node in mat.node_tree.nodes)
        if textured:
            triangulate = obj.modifiers.new("Portable tangent-space topology", "TRIANGULATE")
            triangulate.keep_custom_normals = True
            apply_modifier(obj, triangulate)
        else:
            for layer in list(obj.data.uv_layers):
                obj.data.uv_layers.remove(layer)
        for previous_collection in list(obj.users_collection):
            previous_collection.objects.unlink(obj)
        collection.objects.link(obj)
        obj.parent = root
    return root


def export_model(objects, root, name, split_materials=False):
    export_objects = objects
    if split_materials:
        export_objects = []
        for source in objects:
            copy = source.copy()
            copy.data = source.data.copy()
            bpy.context.collection.objects.link(copy)
            active(copy)
            with bpy.context.temp_override(object=copy, active_object=copy, selected_objects=[copy], selected_editable_objects=[copy]):
                bpy.ops.object.mode_set(mode="EDIT")
                bpy.ops.mesh.select_all(action="SELECT")
                bpy.ops.mesh.separate(type="MATERIAL")
                bpy.ops.object.mode_set(mode="OBJECT")
            parts = [obj for obj in bpy.context.view_layer.objects if obj.select_get()]
            for part in parts:
                textured = any(node.type == "TEX_IMAGE" for mat in part.data.materials for node in mat.node_tree.nodes)
                if not textured:
                    for uv in list(part.data.uv_layers):
                        part.data.uv_layers.remove(uv)
            export_objects.extend(parts)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    output = MODELS / f"{name}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True, export_animations=False,
        export_cameras=False, export_lights=False, export_extras=False,
        export_texcoords=True, export_normals=True, export_tangents=True,
        export_materials="EXPORT", export_image_format="AUTO",
    )
    if split_materials:
        for part in export_objects:
            bpy.data.objects.remove(part, do_unlink=True)
    bounds = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    triangles = 0
    for obj in objects:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    return {
        "name": name,
        "file": str(output.relative_to(ROOT)).replace("\\", "/"),
        "bytes": output.stat().st_size,
        "triangles": triangles,
        "mesh_objects": len(export_objects),
        "dimensions_m": {label: round(max(v[i] for v in bounds) - min(v[i] for v in bounds), 6) for label, i in (("width", 0), ("height", 2), ("depth", 1))},
        "front_gltf": "+Z",
        "up_gltf": "+Y",
        "origin": "centered for rotation",
    }


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area_light(name, position, power, size, target, color=(1, 1, 1), size_y=None):
    lamp = bpy.data.lights.new(name, "AREA")
    lamp.energy = power
    lamp.color = color
    lamp.shape = "DISK" if size_y is None else "RECTANGLE"
    lamp.size = size
    if size_y is not None:
        lamp.size_y = size_y
    obj = bpy.data.objects.new(name, lamp)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    point_at(obj, target)
    return obj


def studio(name):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1200
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Studio | soft grey environment")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (0.27, 0.30, 0.35, 1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = 0.35
    floor_material = material("Studio | pale cool grey", (0.64, 0.66, 0.69), roughness=0.8)
    bpy.ops.mesh.primitive_plane_add(size=200)
    floor = bpy.context.object
    floor.name = "Studio floor (excluded from GLB)"
    floor.location.z = -0.051 if name == "cardholder" else -0.043
    floor.data.materials.append(floor_material)
    area_light("Softbox | key", (-0.11, -0.12, 0.16), 0.75, 0.11, (0, 0, 0))
    area_light("Softbox | fill", (0.13, -0.03, 0.06), 0.20, 0.07, (0, 0, 0), (0.85, 0.91, 1), 0.16)
    area_light("Softbox | rim", (0.02, 0.09, 0.11), 1.0, 0.07, (0, 0, 0), (1, 0.94, 0.84), 0.14)
    if name == "key":
        flag_material = material("Studio | black reflection flag", (0.007, 0.009, 0.013), roughness=1)
        bpy.ops.mesh.primitive_plane_add(size=1, location=(-0.04, -0.1, -0.025))
        flag = bpy.context.object
        flag.name = "Reflection flag (excluded from GLB)"
        flag.scale = (0.035, 0.14, 1)
        point_at(flag, (0, 0, 0))
        flag.data.materials.append(flag_material)
        flag.visible_camera = False
        flag.visible_shadow = False
        flag.visible_diffuse = False
    camera_data = bpy.data.cameras.new("Preview camera")
    camera = bpy.data.objects.new("Preview camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.clip_start = 0.001
    camera_data.clip_end = 300
    scene.camera = camera
    camera.location = (0.098, -0.23, 0.098) if name == "cardholder" else (0.073, -0.21, 0.075)
    camera_data.ortho_scale = 0.137 if name == "cardholder" else 0.093
    point_at(camera, (0, 0, -0.004))
    return camera, floor


def save_and_render(objects, root, name, render):
    camera, floor = studio(name)
    if name == "cardholder":
        root.rotation_euler.y = math.radians(-9)
    else:
        root.rotation_euler.y = math.radians(-10)
    bpy.context.view_layer.update()
    active(root)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.clip_start = 0.001
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCES / f"{name}.blend"))
    if render:
        bpy.context.scene.render.filepath = str(PREVIEWS / f"{name}-front.png")
        bpy.ops.render.render(write_still=True)
        if name == "key":
            root.rotation_euler.z = math.pi
            bpy.context.scene.render.filepath = str(PREVIEWS / "key-back.png")
            bpy.ops.render.render(write_still=True)
            root.rotation_euler.z = 0


def main():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["all", "cardholder", "key"], default="all")
    parser.add_argument("--no-render", action="store_true")
    options = parser.parse_args(arguments)
    for folder in (MODELS, SOURCES, PREVIEWS, TEXTURES):
        folder.mkdir(parents=True, exist_ok=True)
    reports = []
    for name, builder in (("cardholder", build_cardholder), ("key", build_key)):
        if options.model not in ("all", name):
            continue
        reset_scene()
        objects = builder()
        root = finalize_model(objects, name)
        bpy.context.view_layer.update()
        reports.append(export_model(objects, root, name))
        save_and_render(objects, root, name, not options.no_render)
    report_file = ROOT / "assets" / "models" / "manifest.json"
    if options.model != "all" and report_file.exists():
        previous = json.loads(report_file.read_text(encoding="utf-8"))
        reports = [entry for entry in previous if entry["name"] != options.model] + reports
    report_file.write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print("ASSET_REPORT", json.dumps(reports))


if __name__ == "__main__":
    main()
