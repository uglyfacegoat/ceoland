"""Bake the fixed hero lighting onto separate mesh atlases for the web scene."""
from pathlib import Path
import bpy
from build_models import ROOT, active

OUTPUT = ROOT / 'blender' / 'textures'


def prepare(name, sources, size):
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
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.003,area_weight=1,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    image=bpy.data.images.new(mesh.name+' radiance',width=size,height=size,alpha=False,float_buffer=True)
    for mat in mesh.data.materials:
        node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image
        mat.node_tree.nodes.active=node
    mesh['bake_image']=image.name
    return mesh


def bake(name):
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
    bpy.ops.object.bake(type='COMBINED',use_clear=True,margin=10,uv_layer='Lighting atlas')
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
                             export_texcoords=True,export_normals=True,export_tangents=False,
                             export_cameras=True,export_lights=False,export_animations=False)
    return str(output)
