"""Reopen and inspect native product scenes; optional isolated-light renders."""
import argparse
import json
from pathlib import Path
import sys

import bpy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import client_relit
import key_relit


def material_images(tree, visited=None):
    visited = set() if visited is None else visited
    if tree in visited:
        return set()
    visited.add(tree)
    images = set()
    for node in tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            images.add(node.image)
        elif node.type == 'GROUP' and node.node_tree:
            images.update(material_images(node.node_tree, visited))
    return images


def verify():
    card_scene = bpy.data.scenes[client_relit.SCENE]
    key_scene = bpy.data.scenes[key_relit.SCENE]
    for name in client_relit.PANELS:
        panel = card_scene.objects[name]
        assert not panel.hide_render, name
        assert panel.active_material.name.startswith('RELIT |'), name
        assert panel.data.uv_layers.get('Relit surface'), name
        assert len(panel.data.vertices) > 4000, name
        assert panel.data.get('needle_impressions'), name
    shader = card_scene.objects[client_relit.PANELS[0]].active_material.node_tree
    front_panel = card_scene.objects[client_relit.PANELS[0]]
    assert all(p.material_index == (0 if p.normal.y < -.5 else 1) for p in front_panel.data.polygons), 'Ink must stay on the exterior face'
    assert shader.nodes['White leather / navy pigment'].outputs[0].is_linked
    assert shader.nodes['Artwork source — colour NOT used'].outputs['Color'].links[0].to_node.name == 'Ink coverage only'
    assert shader.nodes['Leather grain relief'].inputs['Scale'].default_value < .0001
    for name in ('KEYRELIT head', 'KEYRELIT blade'):
        part = key_scene.objects[name]
        source = bpy.data.objects['WEB_Key bow | engraved both sides' if name.endswith('head') else 'WEB_Key blade | cut teeth and flutes']
        assert part.data is not source.data
        assert not part.hide_render
        assert [p.material_index for p in part.data.polygons] == [p.material_index for p in source.data.polygons], name
    assert card_scene.world is not key_scene.world
    images = set()
    for scene in (card_scene, key_scene):
        assert scene.render.engine == 'CYCLES'
        assert scene.camera is not None
        for part in scene.objects:
            if part.type != 'MESH' or part.hide_render:
                continue
            for material in part.data.materials:
                if material and material.use_nodes:
                    images.update(material_images(material.node_tree))
    for image in images:
        assert image.packed_file or Path(bpy.path.abspath(image.filepath)).is_file(), image.filepath
    print('NATIVE_REOPEN_OK: three relightable panels, isolated print mask, independent key, valid textures', flush=True)
    return {'file':Path(bpy.data.filepath).relative_to(ROOT).as_posix(),'card_scene':card_scene.name,'key_scene':key_scene.name,
            'status':'structural checks passed; visual quality requires separate review',
            'image_sources': [{'name':i.name,'packed':bool(i.packed_file),'space':i.colorspace_settings.name} for i in images]}


def lighting_pass(subject, role, shot, name):
    scene = bpy.data.scenes[client_relit.SCENE if subject == 'card' else key_relit.SCENE]
    bpy.context.window.scene = scene
    if subject == 'card':
        client_relit.diagnostic_camera(shot)
        client_relit.lighting(shot)
        if shot != 'hero':
            for identifier in ('RELIT_LGT_window_background', 'RELIT_ENV_window_mullion'):
                scene.objects[identifier].hide_render = True
        roles = {'key':'WEB_LGT_key','fill':'WEB_LGT_fill','background':'RELIT_LGT_window_background'}
    else:
        key_relit.view(shot)
        roles = {'key':'KEYRELIT reflection softbox','fill':'KEYRELIT edge strip','background':'KEYRELIT floor daylight'}
    if role not in ('beauty', 'reverse'):
        for lamp in scene.objects:
            if lamp.type == 'LIGHT':
                lamp.hide_render = role == 'world' or lamp.name != roles[role]
        if role != 'world':
            scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0
    if role == 'reverse':
        lamp = scene.objects[roles['key']]
        lamp.location.x *= -1
        from web_studio import aim
        aim(lamp, (0, 0, .075))
    if subject == 'card':
        client_relit.render(name, 1400 if shot == 'macro' else 1200, 128)
    else:
        key_relit.render(name, 1200, 128)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--subject', choices=['card','key'])
    parser.add_argument('--role', choices=['beauty','world','key','fill','background','reverse'], default='beauty')
    parser.add_argument('--shot')
    parser.add_argument('--name')
    action.add_argument('--suite', action='store_true', help='Render front, macro and isolated lighting checks')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    report = verify()
    if args.suite:
        scene = bpy.data.scenes[client_relit.SCENE]
        bpy.context.window.scene = scene
        key = scene.objects['WEB_LGT_key']
        position = key.location.copy()
        rotation = key.rotation_euler.copy()
        world = scene.world.node_tree.nodes['Background'].inputs[1]
        world_strength = world.default_value
        visibility = {o.name:o.hide_render for o in scene.objects if o.type == 'LIGHT'}
        for shot, role in (('front','beauty'),('macro','beauty'),('macro','reverse'),('hero','world'),('hero','key'),('hero','fill'),('hero','background')):
            for name, hidden in visibility.items():
                scene.objects[name].hide_render = hidden
            scene.objects['RELIT_ENV_window_mullion'].hide_render = False
            world.default_value = world_strength
            key.location, key.rotation_euler = position, rotation
            lighting_pass('card', role, shot, f'{shot}-{role}')
    elif args.subject:
        shot = args.shot or ('hero' if args.subject == 'card' else 'standing')
        lighting_pass(args.subject, args.role, shot, args.name or f'{args.subject}-{shot}-{args.role}')
    else:
        (ROOT/'previews/client-relit/reopen-check.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
