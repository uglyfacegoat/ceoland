"""Reference-calibrated staging shared by live Blender and the website export."""
from pathlib import Path
import math
import sys
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, active, material, area_light, point_at, apply_modifier, finish_normals

OUTPUT = ROOT / 'previews' / 'v4'


def cube(name, dimensions, location, mat, bevel=0.00015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    block = bpy.context.object
    block.name = name
    block.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    block.data.materials.append(mat)
    if bevel:
        modifier = block.modifiers.new('Small dressed stone arris', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        apply_modifier(block, modifier)
        finish_normals(block)
    return block


def configure_render(samples=64, width=1599, height=984):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = 0.01
    preferences = bpy.context.preferences.addons['cycles'].preferences
    preferences.compute_device_type = 'OPTIX'
    preferences.refresh_devices()
    if not any(device.type == 'OPTIX' for device in preferences.devices):
        raise RuntimeError('OptiX device unavailable')
    for device in preferences.devices:
        device.use = device.type == 'OPTIX'
    scene.cycles.device = 'GPU'
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.view_settings.exposure = 0
    scene.frame_start = scene.frame_end = 1
    scene.render.fps = 24
    scene.world = bpy.data.worlds.new('ENV_neutral studio ambient')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.68, 0.75, 0.85, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.14


def setup(root, detailed=False):
    scene = bpy.context.scene
    protected = {root, *root.children_recursive}
    for obj in list(scene.objects):
        if obj not in protected:
            if obj.get('is_reference'):
                obj.hide_render = True
            else:
                bpy.data.objects.remove(obj, do_unlink=True)
    configure_render()
    # Recover an orthographic rotation from the measured image basis.
    basis = np.array([[4.267, 1.387], [-1.005, 4.273]])
    pixels_per_mm = np.linalg.svd(basis)[1][0]
    projected = basis / pixels_per_mm
    gram = np.eye(2) - projected.T @ projected
    eigenvalues, eigenvectors = np.linalg.eigh(gram)
    depths = eigenvectors[:, -1] * math.sqrt(max(0, eigenvalues[-1]))
    x_axis = Vector((projected[0, 0], -depths[0], projected[1, 0]))
    z_axis = Vector((projected[0, 1], -depths[1], projected[1, 1]))
    y_axis = z_axis.cross(x_axis)
    root.rotation_mode = 'QUATERNION'
    root.rotation_quaternion = (Quaternion((0, 1, 0), math.radians(-3.0))
                                @ Matrix((x_axis, y_axis, z_axis)).transposed().to_quaternion()
                                @ Quaternion((1, 0, 0), math.radians(-22.0)))
    root.location = ((1106-1599/2)/pixels_per_mm/1000, 0, (984/2-518)/pixels_per_mm/1000)
    scale = 1599 / pixels_per_mm / 1000
    camera_data = bpy.data.cameras.new('CAM_hero')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = scale
    camera_data.clip_start = 0.1
    camera_data.clip_end = 2
    camera = bpy.data.objects.new('CAM_hero', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0,-0.65,0)
    point_at(camera, (0,0,0))
    scene.camera = camera
    # Stone axes reproduce the reference top-front edge and the diagonal joint.
    x_axis = Vector((0.8, -math.sqrt(1 - 0.8**2 - 0.1032**2), -0.1032))
    y_depth = -(x_axis.x + 0.213*x_axis.z) / x_axis.y
    y_axis = Vector((1, y_depth, 0.213)).normalized()
    z_axis = x_axis.cross(y_axis).normalized()
    stone_mat = material('Stone | honed cool concrete', (0.45,0.47,0.49), roughness=0.85)
    left = cube('ENV_pedestal_left', (0.132,0.18,0.11), (0,0,0), stone_mat)
    right = cube('ENV_pedestal_right', (0.16,0.18,0.11), (0,0,0), stone_mat)
    pedestal = bpy.data.objects.new('ENV_pedestal', None)
    scene.collection.objects.link(pedestal)
    pedestal.rotation_euler = Matrix((x_axis,y_axis,z_axis)).transposed().to_euler()
    for block, x in ((left,-0.0661),(right,0.0801)):
        block.parent = pedestal
        block.location = (x,0.09,-0.055)
    pedestal.location = ((1036-1599/2)/pixels_per_mm/1000,0.07,(492-780)/pixels_per_mm/1000)
    bpy.context.view_layer.update()
    # Align the top plane with the lowest card point without changing measured screen position.
    normal = pedestal.rotation_euler.to_matrix() @ Vector((0,0,1))
    vertices = [obj.matrix_world @ vertex.co for obj in root.children_recursive if obj.type=='MESH' for vertex in obj.data.vertices]
    distance = min(normal.dot(vertex-pedestal.location) for vertex in vertices)
    pedestal.location.y += (distance-0.00012)/normal.y
    bpy.context.view_layer.update()
    for part in root.children_recursive:
        if part.type == 'MESH':
            part.hide_render = part.name == 'Back saddle stitching'
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.clip_start = 0.001
                area.spaces.active.shading.type = 'SOLID'
    return camera, pedestal


def render(name, solid=False):
    scene=bpy.context.scene
    engine=scene.render.engine
    if solid:
        scene.render.engine='BLENDER_WORKBENCH'
        scene.display.shading.light='STUDIO'
        scene.display.shading.color_type='MATERIAL'
        scene.display.shading.show_cavity=True
        scene.display.shading.cavity_type='BOTH'
    scene.render.filepath=str(OUTPUT/name)
    bpy.ops.render.render(write_still=True)
    scene.render.engine=engine
    return scene.render.filepath


def stone_look():
    from refine_models import normal_pixels, gray_pixels, pbr_texture
    from build_models import image_from_array, TEXTURES, planar_uv
    size=1024
    rng=np.random.default_rng(925)
    fy,fx=np.meshgrid(np.fft.fftfreq(size),np.fft.fftfreq(size),indexing='ij')
    frequencies=fx*fx+fy*fy
    def noise(radius):
        source=rng.normal(size=(size,size))
        field=np.fft.ifft2(np.fft.fft2(source)*np.exp(-frequencies*radius*radius)).real
        return field/field.std()
    fine=noise(3)
    medium=noise(22)
    coarse=noise(110)
    pores=np.zeros((size,size))
    for _ in range(1400):
        cx,cy=rng.integers(0,size,2)
        radius=rng.uniform(0.65,4.2)
        reach=math.ceil(radius*3)
        yy,xx=np.mgrid[-reach:reach+1,-reach:reach+1]
        crater=np.exp(-(xx*xx+yy*yy)/(radius*radius))*rng.uniform(0.3,1)
        np.maximum.at(pores,((yy+cy)%size,(xx+cx)%size),crater)
    height=0.10*fine+0.09*medium-0.9*pores
    color=np.clip(0.69+0.012*coarse+0.018*medium+0.028*fine-0.17*pores,0.30,0.87)
    pixels=np.stack((color*0.97,color*0.987,color,np.ones_like(color)),axis=-1)
    image_from_array('stone-basecolor.png',pixels,TEXTURES/'stone-basecolor.png')
    color_image=bpy.data.images.load(str(TEXTURES/'stone-basecolor.png'),check_existing=False)
    color_image.colorspace_settings.name='sRGB'
    color_image.pack()
    stone=bpy.data.objects['ENV_pedestal_left'].data.materials[0]
    shader=stone.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(1,1,1,1)
    shader.inputs['Specular IOR Level'].default_value=0.25
    node=stone.node_tree.nodes.new('ShaderNodeTexImage');node.image=color_image
    stone.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    pbr_texture(stone,normal_pixels(height,1.8),'Normal','stone-normal.png',0.7)
    pbr_texture(stone,gray_pixels(np.clip(0.81+pores*.14+fine*.035,.68,.97)),'Roughness','stone-roughness.png')
    for name in ('ENV_pedestal_left','ENV_pedestal_right'):
        block=bpy.data.objects[name]
        for uv in list(block.data.uv_layers):block.data.uv_layers.remove(uv)
        planar_uv(block,.10)


def lighting():
    key=area_light('LGT_key | upper-right disk', (.42,-.22,.92), 18.5, .16, (.04,.04,.04), color=(.92,.95,1))
    key['purpose']='Reveal the leather grain and cast the long, soft product shadow to camera-left'
    key['motivation']='High daylight source above and to camera-right'
    key['target']='cardholder and stone top'
    key['camera_relation']='upper right and in front of product'
    key['expected_effect']='Controlled white leather, readable stitching and a soft leftward shadow'
    fill=area_light('LGT_fill | broad front bounce', (-.12,-.32,.24), 2.1, .48, (.03,.04,.10), color=(.76,.84,1), size_y=.38)
    fill['purpose']='Recover shadow detail while retaining the key direction'
    fill['motivation']='White studio wall bounce'
    fill['target']='left leather edge'
    fill['camera_relation']='broad weak camera-left fill'
    fill['expected_effect']='Low contrast recovery only'
    return key,fill


def backdrop():
    from build_models import planar_uv
    wall_mat=material('ENV_wall | shaded left return', (.50,.57,.66),roughness=.94)
    flag_mat=material('GOBO | photographic flag', (.005,.005,.005),roughness=1)
    wall_shader=wall_mat.node_tree.nodes.get('Principled BSDF')
    wall_shader.inputs['Emission Color'].default_value=(.32,.38,.48,1)
    wall_shader.inputs['Emission Strength'].default_value=.35
    wall_noise=wall_mat.node_tree.nodes.new('ShaderNodeTexNoise')
    wall_noise.name='Subtle plaster grain'
    wall_noise.inputs['Scale'].default_value=82
    wall_noise.inputs['Detail'].default_value=3
    wall_noise.inputs['Roughness'].default_value=.72
    wall_bump=wall_mat.node_tree.nodes.new('ShaderNodeBump')
    wall_bump.name='Subtle plaster relief'
    wall_bump.inputs['Strength'].default_value=.10
    wall_bump.inputs['Distance'].default_value=.002
    wall_mat.node_tree.links.new(wall_noise.outputs['Fac'],wall_bump.inputs['Height'])
    wall_mat.node_tree.links.new(wall_bump.outputs['Normal'],wall_shader.inputs['Normal'])
    pedestal=bpy.data.objects['ENV_pedestal']
    # One oversized wall fills the camera frustum; its edges must never read as set geometry.
    wall_return=cube('ENV_wall_return',(.006,2.6,2.4),(0,0,0),wall_mat,.00015)
    wall_return.parent=pedestal
    wall_return.location=(-.135,.09,.55)

    key=bpy.data.objects['LGT_key | upper-right disk']
    wall_y=(pedestal.matrix_world.to_3x3() @ Vector((0,1,0))).normalized()
    wall_z=(pedestal.matrix_world.to_3x3() @ Vector((0,0,1))).normalized()

    def shadow_flag(name,target_y,width,height,diagonal):
        target=pedestal.matrix_world @ Vector((-.135,target_y,.50))
        normal=(key.location-target).normalized()
        long_axis=wall_z*math.cos(diagonal)+wall_y*math.sin(diagonal)
        long_axis=(long_axis-normal*long_axis.dot(normal)).normalized()
        width_axis=long_axis.cross(normal).normalized()
        transform=Matrix((width_axis,long_axis,normal)).transposed().to_4x4()
        transform.translation=key.location.lerp(target,.68)
        flag=cube(name,(width,height,.008),(0,0,0),flag_mat,0)
        flag.matrix_world=transform
        flag.hide_set(True)
        flag.visible_camera=False
        flag.visible_glossy=False
        flag.visible_transmission=False
        flag.visible_volume_scatter=False
        return flag

    light_mask=shadow_flag('GOBO_window_wide',.18,.05,.92,math.radians(32))
    light_mask['purpose']='Cast the broad diagonal architectural shadow across the middle-left wall'
    right_falloff=shadow_flag('GOBO_window_right_falloff',.47,.075,1.05,math.radians(8))
    right_falloff['purpose']='Create the cool, softer falloff at the far-right wall edge'
    planar_uv(wall_return,.30)
    return wall_return,light_mask,right_falloff


def pale_stone_front():
    from build_models import image_from_array, TEXTURES
    stone=bpy.data.objects['ENV_pedestal_left'].data.materials[0]
    pale=stone.copy();pale.name='Stone | pale adjoining block'
    shader=pale.node_tree.nodes.get('Principled BSDF')
    base_node=next(link.from_node for link in pale.node_tree.links if link.to_socket==shader.inputs['Base Color'])
    source=base_node.image
    pixels=np.empty(len(source.pixels),dtype=np.float32);source.pixels.foreach_get(pixels)
    pixels=pixels.reshape(source.size[1],source.size[0],4)
    # Convert the decoded linear RGB to a slightly lighter, still neutral batch of concrete.
    pixels[:,:,:3]=np.clip(pixels[:,:,:3]*1.43,0,1)
    encoded=np.where(pixels[:,:,:3]<=.0031308,pixels[:,:,:3]*12.92,1.055*pixels[:,:,:3]**(1/2.4)-.055)
    pixels[:,:,:3]=encoded
    image_from_array('stone-pale-basecolor.png',pixels,TEXTURES/'stone-pale-basecolor.png')
    image=bpy.data.images.load(str(TEXTURES/'stone-pale-basecolor.png'),check_existing=False)
    image.colorspace_settings.name='sRGB';image.pack();base_node.image=image
    block=bpy.data.objects['ENV_pedestal_right']
    block.data.materials.clear();block.data.materials.append(stone);block.data.materials.append(pale)
    for polygon in block.data.polygons:
        if polygon.normal.y < -.7:polygon.material_index=1
