"""Apply the reviewed v5 material scale and tonal corrections to the retained cardholder."""
from pathlib import Path
import sys

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, TEXTURES, image_from_array, planar_uv


def shader(material):
    node = material.node_tree.nodes.get('Principled BSDF')
    if node is None:
        raise RuntimeError(f'Missing Principled BSDF in {material.name}')
    return node


root = bpy.data.objects['cardholder']
leather = bpy.data.materials['Ivory | grained calf leather']
ink = bpy.data.materials['CEO | absorbed navy leather print']
thread = bpy.data.materials['Ivory | linen saddle thread']

leather_shader = shader(leather)
for node in leather.node_tree.nodes:
    if node.type == 'NORMAL_MAP':
        node.inputs['Strength'].default_value = .55

source_link = next((link for link in leather.node_tree.links if link.to_socket == leather_shader.inputs['Base Color']), None)
if source_link is None or source_link.from_node.type != 'TEX_IMAGE':
    raise RuntimeError('The leather base-colour texture is unavailable')
source = source_link.from_node.image
pixels = np.empty(len(source.pixels), dtype=np.float32)
source.pixels.foreach_get(pixels)
pixels = pixels.reshape(source.size[1], source.size[0], 4)
luminance = pixels[:, :, :3].mean(axis=2)
variation = np.clip((luminance - np.median(luminance)) / max(luminance.std() * 3, 1e-6), -1, 1)
linear = np.array([.0035, .018, .065])[None, None, :] * (1 + variation[:, :, None] * .11)
encoded = np.where(linear <= .0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - .055)
ink_pixels = np.concatenate((np.clip(encoded, 0, 1), np.ones((*variation.shape, 1))), axis=-1)
old_image = bpy.data.images.get('ink-basecolor-v5.png')
if old_image is not None:
    bpy.data.images.remove(old_image)
ink_image = image_from_array('ink-basecolor-v5.png', ink_pixels, TEXTURES / 'ink-basecolor-v5.png')
ink_image.colorspace_settings.name = 'sRGB'
ink_shader = shader(ink)
for link in list(ink.node_tree.links):
    if link.to_socket == ink_shader.inputs['Base Color']:
        ink.node_tree.links.remove(link)
ink_node = ink.node_tree.nodes.new('ShaderNodeTexImage')
ink_node.name = 'Subtle absorbed ink variation'
ink_node.image = ink_image
ink.node_tree.links.new(ink_node.outputs['Color'], ink_shader.inputs['Base Color'])
ink_shader.inputs['Sheen Weight'].default_value = 0
ink_shader.inputs['Specular IOR Level'].default_value = .18
ink.diffuse_color = (.0035, .018, .065, 1)

thread_shader = shader(thread)
thread_shader.inputs['Base Color'].default_value = (.68, .64, .58, 1)
thread_shader.inputs['Roughness'].default_value = .86
thread_shader.inputs['Specular IOR Level'].default_value = .18
thread.diffuse_color = (.68, .64, .58, 1)

surface_materials = {leather, ink}
for part in root.children_recursive:
    if part.type != 'MESH' or not any(material in surface_materials for material in part.data.materials):
        continue
    for uv in list(part.data.uv_layers):
        part.data.uv_layers.remove(uv)
    planar_uv(part, .036)

root['revision'] = 'v5 | retained geometry, broader leather grain and natural absorbed print'
output = ROOT / 'revisions' / 'v5' / 'cardholder-source.blend'
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print(output)
