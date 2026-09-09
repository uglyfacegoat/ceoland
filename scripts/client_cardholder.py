"""Front-photo projection onto calibrated geometry; not a measured PBR scan."""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
SCENE = 'CEOMENTALITY | Web studio'
PHOTO = ROOT / 'references/product-photos/client-white-front.png'
HEIGHT = .07214
WIDTH = .105


def fit_proportions():
    root = bpy.data.scenes[SCENE].objects['WEB_HERO_cardholder']
    anchors = ((-.0375, -HEIGHT/2), (.01605, .01262), (.02680, .02305), (.0375, HEIGHT/2))
    for part in root.children_recursive:
        if part.type != 'MESH' or part.data.get('client_photo_fit'):
            continue
        for vertex in part.data.vertices:
            z = vertex.co.z
            segment = next((index for index in range(3) if z < anchors[index+1][0]), 2)
            low, high = anchors[segment:segment+2]
            vertex.co.z = low[1] + (z-low[0])/(high[0]-low[0])*(high[1]-low[1])
        part.data.update()
        part.data['client_photo_fit'] = True
    for panel in root.children_recursive:
        if panel.type != 'MESH' or 'leather' not in panel.name.lower():
            continue
        uv = panel.data.uv_layers.get('Client photograph')
        if uv is None:
            uv = panel.data.uv_layers.new(name='Client photograph')
        for loop in panel.data.loops:
            point = panel.data.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = ((157+(point.x/WIDTH+.5)*938)/1254,
                                     1-(319+(.5-point.z/HEIGHT)*643)/1254)


def photographic_surface():
    """Fixed-photo projection for front-facing compositions, not a measured PBR scan."""
    scene = bpy.data.scenes[SCENE]
    for panel_name in ('WEB_Front leather pocket',
                       'WEB_Middle leather pocket | unstitched upper edge',
                       'WEB_Leather backing'):
        panel = scene.objects[panel_name]
        name = 'CLIENT photographic surface | ' + panel_name
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        mat['technique'] = 'Front photo projection; original photographed illumination retained.'
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        nodes.clear()
        out = nodes.new('ShaderNodeOutputMaterial')
        shader = nodes.new('ShaderNodeBsdfPrincipled')
        shader.inputs['Roughness'].default_value = .65
        shader.inputs['IOR'].default_value = 1.46
        shader.inputs['Specular IOR Level'].default_value = .3
        uv = nodes.new('ShaderNodeUVMap')
        uv.uv_map = 'Client photograph'
        photograph = nodes.new('ShaderNodeTexImage')
        photograph.image = bpy.data.images.load(str(PHOTO), check_existing=True)
        photograph.image.colorspace_settings.name = 'sRGB'
        links.new(uv.outputs[0], photograph.inputs['Vector'])
        links.new(photograph.outputs['Color'], shader.inputs['Base Color'])
        links.new(shader.outputs[0], out.inputs['Surface'])
        panel.data.materials.clear()
        panel.data.materials.append(mat)


def apply():
    fit_proportions()
    photographic_surface()
    root = bpy.data.scenes[SCENE].objects['WEB_HERO_cardholder']
    root['reference'] = 'Client white front photograph, received 2026-09-09'
    for part in root.children_recursive:
        if part.name.startswith('WEB_Printed logo'):
            part.hide_render = True
            part['PHYS_material_print'] = True
            part.hide_set(True)
        if 'stitch' in part.name.lower():
            part['CLIENT_photo_seam'] = True
            part.hide_render = True
            part.hide_set(True)
