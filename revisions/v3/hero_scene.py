"""Reference-calibrated staging shared by live Blender and the website export."""
from pathlib import Path
import math
import sys
import bpy
import numpy as np
from mathutils import Matrix, Vector
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_models import ROOT, active, material, area_light, point_at, apply_modifier, finish_normals

OUTPUT = ROOT / 'previews' / 'v3'


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
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.22


def setup(root, detailed=False):
    scene = bpy.context.scene
    protected = {root, *root.children_recursive}
    for obj in list(scene.objects):
        if obj not in protected:
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
    root.rotation_quaternion = Matrix((x_axis, y_axis, z_axis)).transposed().to_quaternion()
    root.location = ((1106-1599/2)/pixels_per_mm/1000, 0, (984/2-518)/pixels_per_mm/1000)
    scale = 1599 / pixels_per_mm / 1000
    camera_data = bpy.data.cameras.new('CAM_hero')
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = scale
    camera_data.clip_start = 0.001
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
    for _ in range(1900):
        cx,cy=rng.integers(0,size,2)
        radius=rng.uniform(0.65,3.1)
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
    stone=bpy.data.materials['Stone | honed cool concrete']
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
    key=area_light('LGT_key | studio window', (.24,-.19,.25), 4.3, .085, (.07,0,-.01), size_y=.14)
    key['purpose']='Grazing leather grain, broad edge light and soft contact shadow to the left'
    key['motivation']='Large daylight studio window upper camera-right'
    key['target']='cardholder and stone top'
    key['camera_relation']='upper right and in front of product'
    key['expected_effect']='Bright leather, shadowed left stone front, soft long leftward shadow'
    fill=area_light('LGT_fill | camera-side bounce', (-.15,-.25,.08), .22, .24, (.05,0,-.01))
    fill['purpose']='Recover shadow detail while retaining the key direction'
    fill['motivation']='White studio wall bounce'
    fill['target']='left leather edge'
    fill['camera_relation']='broad weak camera-left fill'
    fill['expected_effect']='Low contrast recovery only'
    return key,fill


def backdrop():
    wall_mat=material('ENV_wall | cool plaster', (.64,.69,.75),roughness=.85)
    wall=cube('ENV_backdrop',(1,.004,1),(0,.24,0),wall_mat,0)
    wall.visible_shadow=False
    return wall


def pale_stone_front():
    from build_models import image_from_array, TEXTURES
    stone=bpy.data.materials['Stone | honed cool concrete']
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
    block=bpy.data.objects['ENV_pedestal_right'];block.data.materials.append(pale)
    for polygon in block.data.polygons:
        if polygon.normal.y < -.7:polygon.material_index=1
