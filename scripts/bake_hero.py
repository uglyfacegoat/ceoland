"""Bake the fixed hero lighting onto separate mesh atlases for the web scene."""
from pathlib import Path
import sys
import bpy
from mathutils.geometry import box_pack_2d
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, active

OUTPUT = ROOT / 'blender' / 'textures'


def prepare(name, sources, size):
    print('Preparing lighting atlas:',name,flush=True)
    copies=[]
    materials={}
    for source in sources:
        duplicate=source.copy();duplicate.data=source.data.copy()
        bpy.context.scene.collection.objects.link(duplicate)
        duplicate.hide_render=False;duplicate.hide_set(False)
        for index,original in enumerate(duplicate.data.materials):
            if original not in materials:
                materials[original]=original.copy()
            duplicate.data.materials[index]=materials[original]
        copies.append(duplicate)
    bpy.ops.object.select_all(action='DESELECT')
    for duplicate in copies:duplicate.select_set(True)
    bpy.context.view_layer.objects.active=copies[0]
    with bpy.context.temp_override(object=copies[0],active_object=copies[0],selected_objects=copies,selected_editable_objects=copies):
        bpy.ops.object.join()
    mesh=copies[0];mesh.name=name
    for source in sources:source.hide_render=True
    mesh['source_objects']=[source.name for source in sources]
    return unwrap(mesh, size)


def project_lighting_charts(mesh, atlas):
    """Pack six-axis charts per connected shell; dense thread meshes avoid a slow global unwrap."""
    geometry = mesh.data
    parents = list(range(len(geometry.vertices)))

    def component(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    for edge in geometry.edges:
        first, second = (component(index) for index in edge.vertices)
        parents[second] = first
    charts = {}
    for polygon in geometry.polygons:
        axis = max(range(3), key=lambda index: abs(polygon.normal[index]))
        key = (component(polygon.vertices[0]), axis, polygon.normal[axis] > 0)
        charts.setdefault(key, []).append(polygon)
    padding = .00045
    records, boxes = [], []
    for (_, axis, _), polygons in charts.items():
        axes = [index for index in range(3) if index != axis]
        coordinates = [(geometry.vertices[geometry.loops[index].vertex_index].co[axes[0]],
                        geometry.vertices[geometry.loops[index].vertex_index].co[axes[1]])
                       for polygon in polygons for index in polygon.loop_indices]
        minimum = [min(point[index] for point in coordinates) for index in range(2)]
        maximum = [max(point[index] for point in coordinates) for index in range(2)]
        box = [0.0, 0.0, max(maximum[0]-minimum[0],.00001)+padding*2,
               max(maximum[1]-minimum[1],.00001)+padding*2]
        boxes.append(box)
        records.append((polygons, axes, minimum, box))
    width, height = box_pack_2d(boxes)
    scale = max(width, height)
    for polygons, axes, minimum, box in records:
        for polygon in polygons:
            for index in polygon.loop_indices:
                point = geometry.vertices[geometry.loops[index].vertex_index].co
                atlas.data[index].uv = ((point[axes[0]]-minimum[0]+box[0]+padding)/scale,
                                       (point[axes[1]]-minimum[1]+box[1]+padding)/scale)
    print('Packed lighting charts:',len(charts),flush=True)


def unwrap(mesh, size):
    original_uv=mesh.data.uv_layers["Surface UV"].name
    for mat in set(mesh.data.materials):
        uv=mat.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map=original_uv
        for texture in mat.node_tree.nodes:
            if texture.type=='TEX_IMAGE':
                mat.node_tree.links.new(uv.outputs['UV'],texture.inputs['Vector'])
        for normal in mat.node_tree.nodes:
            if normal.type=='NORMAL_MAP':normal.uv_map=original_uv
    atlas=mesh.data.uv_layers.new(name='Lighting atlas')
    mesh.data.uv_layers.active=atlas
    active(mesh)
    project_lighting_charts(mesh, atlas)
    image=bpy.data.images.new(mesh.name+' radiance',width=size,height=size,alpha=False,float_buffer=True)
    for mat in mesh.data.materials:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
        mat.node_tree.nodes.active=node
    mesh['bake_image']=image.name
    return mesh


def bake(name):
    print('Baking studio lighting:',name,flush=True)
    mesh=bpy.data.objects[name]
    image=bpy.data.images[mesh['bake_image']]
    active(mesh)
    scene=bpy.context.scene
    scene.cycles.samples=64
    scene.render.bake.use_pass_direct=True
    scene.render.bake.use_pass_indirect=True
    scene.render.bake.use_pass_diffuse=True
    scene.render.bake.use_pass_glossy=True
    scene.render.bake.use_pass_transmission=True
    scene.render.bake.use_pass_emit=True
    scene.render.bake.use_pass_color=True
    bpy.ops.object.bake(type='COMBINED',use_clear=True,margin=8,uv_layer='Lighting atlas')
    output=OUTPUT/(name+'.png')
    image.save_render(str(output),scene=scene)
    mesh['baked_file']=str(output)
    mesh.hide_render=True
    for source in mesh['source_objects']:bpy.data.objects[source].hide_render=False
    return str(output)




def finish(names):
    for name in names:
        mesh=bpy.data.objects[name]
        image=bpy.data.images.load(mesh['baked_file'],check_existing=False)
        image.colorspace_settings.name='sRGB';image.pack()
        mat=bpy.data.materials.new(name+' | fixed studio illumination');mat.use_nodes=True
        nodes=mat.node_tree.nodes;nodes.clear()
        texture=nodes.new('ShaderNodeTexImage');texture.image=image
        output=nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(texture.outputs['Color'],output.inputs['Surface'])
        mesh.data.materials.clear();mesh.data.materials.append(mat)
        for polygon in mesh.data.polygons:polygon.material_index=0
        for uv in list(mesh.data.uv_layers):
            if uv.name!='Lighting atlas':mesh.data.uv_layers.remove(uv)
        mesh.data.uv_layers.active=mesh.data.uv_layers['Lighting atlas']
        mesh.data.uv_layers.active.active_render=True
        mesh.hide_render=False
        for source in mesh['source_objects']:bpy.data.objects[source].hide_render=True
    bpy.ops.object.select_all(action='DESELECT')
    for name in names:
        mesh=bpy.data.objects[name];mesh.select_set(True)
        if mesh.parent:mesh.parent.select_set(True)
    bpy.context.scene.camera.select_set(True)
    output=ROOT/'assets/models/hero-scene.glb'
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
                             export_image_format='WEBP',export_image_quality=92,
                             export_texcoords=True,export_normals=False,export_tangents=False,
                             export_cameras=True,export_lights=False,export_animations=False)
    return str(output)


if __name__ == '__main__':
    root = bpy.data.objects['cardholder']
    card_parts = [part for part in root.children_recursive if part.type == 'MESH' and not part.hide_render]
    prepare('WEB_cardholder', card_parts, 3072)
    bake('WEB_cardholder')
    print(finish(['WEB_cardholder']))
