"""Small sewn-leather forms, authored in the model's millimetre coordinates."""
import math
import bmesh
import bpy
from mathutils import Vector

STITCH_SPACING_MM = 2.4


def resample_pocket_surface(panel, width, bottom, top, radius, top_radius, thickness, surface):
    """Replace uneven fan triangles with a closed grid following the existing pocket outline."""
    def stations(low, high, middle_step, edge_step, band):
        values = [low]
        while values[-1] < high - 1e-6:
            distance = min(values[-1] - low, high - values[-1])
            step = edge_step if distance < band else middle_step
            values.append(min(high, values[-1] + step))
        return values

    xs = stations(-width / 2, width / 2, 1.6, .25, 5.2)
    ys = stations(bottom, top, .55, .23, 4.5)
    vertices, faces = [], []
    for depth_offset in (0, -thickness):
        for y in ys:
            half_width = width / 2
            if y < bottom + radius:
                half_width -= radius - math.sqrt(max(0, radius**2 - (y-bottom-radius)**2))
            elif y > top - top_radius:
                half_width -= top_radius - math.sqrt(max(0, top_radius**2 - (y-top+top_radius)**2))
            for column in xs:
                x = column * half_width / (width / 2)
                depth = surface(x, y) + depth_offset
                edge_wave = .055 * math.sin(x*.21 + top*.08) * math.exp(-((y-top)/1.6)**2)
                edge_wave += .025 * math.sin(x*.16) * math.exp(-((y-bottom)/1.5)**2)
                vertices.append((x / 1000, -depth / 1000, (y+edge_wave) / 1000))
    columns, rows = len(xs), len(ys)
    skin_size = columns * rows
    for row in range(rows - 1):
        for column in range(columns - 1):
            first = row * columns + column
            quad = (first, first+1, first+columns+1, first+columns)
            faces.append(quad)
            faces.append(tuple(index+skin_size for index in reversed(quad)))
    perimeter = (list(range(columns)) + [row*columns+columns-1 for row in range(1, rows)]
                 + list(range(skin_size-2, skin_size-columns-1, -1))
                 + [row*columns for row in range(rows-2, 0, -1)])
    border_edges = set()
    for first, second in zip(perimeter, perimeter[1:]+perimeter[:1]):
        faces.append((second, first, first+skin_size, second+skin_size))
        border_edges.add(tuple(sorted((first, second))))
        border_edges.add(tuple(sorted((first+skin_size, second+skin_size))))
    materials = list(panel.data.materials)
    mesh = bpy.data.meshes.new(panel.name + ' | regular leather surface')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    weight = mesh.attributes.new('bevel_weight_edge', 'FLOAT', 'EDGE')
    for edge in mesh.edges:
        weight.data[edge.index].value = 1 if tuple(sorted(edge.vertices)) in border_edges else 0
    panel.data = mesh
    for material in materials:
        mesh.materials.append(material)
    from build_models import apply_modifier, planar_uv, finish_normals
    bevel = panel.modifiers.new('Soft leather cut edge', 'BEVEL')
    bevel.width = .00022
    bevel.segments = 3
    bevel.limit_method = 'WEIGHT'
    apply_modifier(panel, bevel)
    planar_uv(panel, .024)
    finish_normals(panel)


def stitch_boundaries(total_length, count):
    weights = [1 + .11 * math.sin(index * 2.399) + .04 * math.cos(index * .87) for index in range(count)]
    scale = total_length / sum(weights)
    boundaries = [0.0]
    for weight in weights:
        boundaries.append(boundaries[-1] + weight * scale)
    return boundaries


def sewn_thread_mesh(name, at, pitch, count, surface, material, back=False, slant_bottom=False):
    vertices, faces = [], []
    sign = -1 if back else 1
    stations = (0, .07, .16, .28, .42, .57, .72, .85, .94, 1)
    sides = 8
    boundaries = stitch_boundaries(pitch * count, count)
    for stitch_index in range(count):
        first = len(vertices)
        variation = 1 + .035 * math.sin(stitch_index * 2.399)
        start, end = boundaries[stitch_index:stitch_index + 2]
        center, _ = at((start + end) / 2)
        lower_blend = min(1, max(0, (-center.y - 33.1) / 1.5)) if slant_bottom else 0
        overlap = .065 + .335 * lower_blend
        for fraction in stations:
            distance = start - overlap + fraction * (end - start + 2 * overlap)
            point, tangent = at(min(pitch * count, max(0, distance)))
            across = Vector((-tangent.y, tangent.x))
            point += across * (.22 * (fraction - .5) * math.sin(math.pi * fraction))
            if slant_bottom:
                point += across * (.58 * (fraction - .5) * math.sin(math.pi*fraction)**.4 * lower_blend)
            taper = math.sin(math.pi * fraction)**.55
            width = (.043 + .168 * taper + lower_blend*(.007 + .022*taper)) * variation
            height = .026 + .082 * taper
            lift = -.06 + .095 * math.sin(math.pi * fraction)**.5
            twist = .14 * math.sin(fraction * math.pi * 2 + stitch_index)
            for side in range(sides):
                angle = side * math.tau / sides + twist
                irregularity = 1 + .025 * math.sin(side * 2.17 + stitch_index * .71 + fraction * 9)
                position = point + across * (width * math.cos(angle) * irregularity)
                vertices.append((position.x, position.y,
                                 surface(position.x, position.y) + sign * (lift + height * math.sin(angle))))
        faces.append(tuple(first + side for side in reversed(range(sides))))
        last = first + (len(stations) - 1) * sides
        faces.append(tuple(last + side for side in range(sides)))
        for station in range(len(stations) - 1):
            start = first + station * sides
            for side in range(sides):
                following = (side + 1) % sides
                faces.append((start + side, start + following, start + following + sides, start + side + sides))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    edit = bmesh.new(); edit.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(edit, faces=list(edit.faces))
    edit.to_mesh(mesh); edit.free()
    mesh.update()
    stitch = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(stitch)
    mesh.materials.append(material)
    return stitch


def pocket_transition_stitch(name, x, lip_y, lower_surface, upper_surface, material):
    """A short saddle stitch wraps around the rounded end of an open pocket."""
    start_y, end_y = lip_y - .85, lip_y + 1.35
    front_depth = lower_surface(x, lip_y - .35)
    rear_depth = upper_surface(x, end_y)
    controls = [Vector((x, start_y, lower_surface(x, start_y) - .035)),
                Vector((x, lip_y + .75, front_depth + .28)),
                Vector((x, lip_y + 1.15, rear_depth + .10)),
                Vector((x, end_y, rear_depth - .04))]
    vertices, faces = [], []
    sections, sides = 19, 8
    for index in range(sections):
        t = index / (sections - 1)
        a, b, c, d = controls
        point = (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d
        tangent = (3*(1-t)**2*(b-a) + 6*(1-t)*t*(c-b) + 3*t*t*(d-c)).normalized()
        across = Vector((1, 0, 0))
        outward = across.cross(tangent).normalized()
        taper = .7 + .3 * math.sin(math.pi*t)**.5
        for side in range(sides):
            angle = side * math.tau / sides
            position = point + across * (.195*taper*math.cos(angle)) + outward * (.11*taper*math.sin(angle))
            vertices.append(tuple(position))
    for index in range(sections - 1):
        for side in range(sides):
            first = index*sides + side
            following = index*sides + (side+1)%sides
            faces.append((first, following, following+sides, first+sides))
    faces += [tuple(reversed(range(sides))), tuple((sections-1)*sides+i for i in range(sides))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    stitch = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(stitch)
    mesh.materials.append(material)
    return stitch


def tension_relief(x, y, needle_centers):
    relief = 0.0
    for index, (px, py) in enumerate(needle_centers):
        dx, dy = x - px, y - py
        if abs(dx) > 4 or abs(dy) > 4:
            continue
        inward_x = -math.copysign(1, px) if abs(px) > 47 else 0
        inward_y = 1 if py < -32 else 0
        length = math.hypot(inward_x, inward_y)
        if not length:
            continue
        inward_x /= length; inward_y /= length
        along = dx * inward_x + dy * inward_y
        across = -dx * inward_y + dy * inward_x
        depth = .047 + .018 * (1 + math.sin(index * 2.399)) / 2
        relief -= depth * math.exp(-((along - .5) / 1.05)**2 - (across / .34)**2)
    folds = ((50.2, -23.8, -.91, -.414, 4.8, .115),
             (-50.2, 10.2, .94, -.342, 3.8, .080),
             (-28.7, -35.2, -.22, .975, 3.2, .060))
    for px, py, ux, uy, length, depth in folds:
        dx, dy = x - px, y - py
        along = dx * ux + dy * uy
        if along < -.5 or along > length + .5:
            continue
        across = -dx * uy + dy * ux - .18 * math.sin(along / length * math.pi)
        envelope = math.exp(-((along - length * .45) / (length * .48))**4)
        relief -= depth * envelope * math.exp(-(across / .32)**2)
        relief += depth * .35 * envelope * math.exp(-((across - .48) / .27)**2)
    return relief
