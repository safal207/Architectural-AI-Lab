import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_interior3.py'
R6_SOURCE = HERE / 'run_v02_hero_r6.py'

spec = importlib.util.spec_from_file_location('villa_v04_interior3', SOURCE)
interior3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(interior3)
interior1 = interior3.interior1

r6_spec = importlib.util.spec_from_file_location('villa_v02_hero_r6_pool_context', R6_SOURCE)
hero_r6 = importlib.util.module_from_spec(r6_spec)
r6_spec.loader.exec_module(hero_r6)

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-pool-context.png'
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context.glb'
STAGE_ID = 'v0.4-pool-context-v3'

POOL_CAMERA = (-0.55, 7.05, 1.65)
POOL_TARGET = (-1.85, 14.10, 0.92)


def remove_context():
    for obj in list(bpy.data.objects):
        if obj.name.startswith('pool_context_'):
            bpy.data.objects.remove(obj, do_unlink=True)


def simple_material(name, color, roughness=0.9, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (*color, 1.0)
        bsdf.inputs['Roughness'].default_value = roughness
        if 'Metallic' in bsdf.inputs:
            bsdf.inputs['Metallic'].default_value = metallic
    return mat


def gravel_material():
    name = 'V04_PoolContextGravelV3'
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = 0.96

    coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (11.0, 16.0, 3.0)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 5.2
    noise.inputs['Detail'].default_value = 3.0
    noise.inputs['Roughness'].default_value = 0.68

    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.235, 0.210, 0.175, 1.0)
    ramp.color_ramp.elements[-1].color = (0.39, 0.345, 0.285, 1.0)
    ramp.color_ramp.elements.new(0.58).color = (0.305, 0.270, 0.220, 1.0)

    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.10
    bump.inputs['Distance'].default_value = 0.035

    nt.links.new(coord.outputs['Generated'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def add_ribbon_grass(prefix, location, scale, material):
    x, y, z = location
    blades = 14
    for index in range(blades):
        angle = (index / blades) * math.tau + 0.16 * (index % 3)
        length = (0.46 + 0.15 * ((index * 5) % 7) / 6.0) * scale
        width = (0.045 + 0.018 * (index % 3)) * scale
        height = (0.30 + 0.18 * ((index * 3) % 5) / 4.0) * scale
        ring = 0.10 + 0.08 * (index % 3)
        ox = x + math.cos(angle) * ring * scale
        oy = y + math.sin(angle) * ring * scale
        hero_r6.agave_leaf(
            f'{prefix}_blade_{index:02d}',
            (ox, oy, z),
            angle,
            length,
            width,
            height,
            material,
        )


def join_prefix(prefix, joined_name):
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.name.startswith(prefix)]
    if not meshes:
        raise RuntimeError(f'No meshes found for join prefix: {prefix}')

    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = joined_name
    return joined


def world_min_y(obj):
    """Return the object's real world-space lower Y bound.

    Joined planting inherits one source object's origin, so location/dimensions is
    not a reliable proxy for a distributed joined mesh. Transform each authored
    bounding-box corner through matrix_world instead.
    """
    return min((obj.matrix_world @ mathutils.Vector(corner)).y for corner in obj.bound_box)


def add_quiet_horizon(material):
    # Low, distant architectural context is intentionally split and pushed back.
    # It gives human scale without turning the pool frame into a city-render shot.
    specs = (
        ('pool_context_horizon_v3_left', (-6.2, 25.6, 0.34), (8.3, 0.34, 0.68)),
        ('pool_context_horizon_v3_right', (6.1, 25.9, 0.30), (7.2, 0.34, 0.60)),
        ('pool_context_pavilion_v3_left', (-8.5, 31.8, 0.58), (4.1, 2.0, 1.16)),
        ('pool_context_pavilion_v3_right', (8.0, 32.4, 0.49), (3.5, 1.9, 0.98)),
    )
    for name, location, dimensions in specs:
        interior1.cube(name, dimensions, location, material, 0.08)


def refine_pool_context():
    """Build a quiet desert-garden layer beyond the authored infinity edge.

    V3 deliberately removes the spherical shrubs, low-poly tree and foreground
    dune blobs from V2. The replacement reuses the repo's authored agave-leaf
    geometry for both agaves and ribbon grasses, then joins the generated leaves
    into two browser-friendly mesh groups.

    Frozen: pool water, infinity lip, tour_pool navigation anchor, villa shell,
    Interior3 circulation repair and all interior tour anchors.
    """
    remove_context()

    edge = simple_material('V04_PoolContextEdgeV3', (0.285, 0.255, 0.215), 0.86)
    soil = simple_material('V04_PoolContextSoilV3', (0.095, 0.080, 0.058), 0.99)
    grass = simple_material('V04_PoolContextGrassV3', (0.255, 0.245, 0.145), 0.96)
    distant = simple_material('V04_PoolContextDistantV3', (0.345, 0.335, 0.315), 0.95)
    gravel = gravel_material()

    interior1.cube(
        'pool_context_ground_v3',
        (31.0, 22.0, 0.12),
        (-0.55, 22.30, -0.07),
        gravel,
        0.02,
    )

    interior1.cube(
        'pool_context_planter_edge_v3',
        (14.55, 0.30, 0.15),
        (-0.55, 12.02, 0.075),
        edge,
        0.035,
    )
    interior1.cube(
        'pool_context_soil_band_v3',
        (13.95, 1.16, 0.08),
        (-0.55, 12.78, 0.025),
        soil,
        0.018,
    )

    agave_specs = (
        ('pool_context_agave_v3_l1', (-5.95, 12.76, 0.14), 0.62),
        ('pool_context_agave_v3_l2', (-4.45, 13.02, 0.14), 0.78),
        ('pool_context_agave_v3_r1', (4.20, 12.96, 0.14), 0.68),
        ('pool_context_agave_v3_r2', (5.78, 12.74, 0.14), 0.84),
        ('pool_context_agave_v3_far_l', (-7.55, 15.25, 0.08), 0.48),
        ('pool_context_agave_v3_far_r', (7.25, 15.10, 0.08), 0.52),
    )
    for prefix, location, scale in agave_specs:
        hero_r6.add_agave(prefix, location, scale)

    agave_mat = hero_r6.r4.make_simple_material('AgaveLeafR6', (0.082, 0.135, 0.095), roughness=0.86)
    for obj in bpy.data.objects:
        if obj.name.startswith('pool_context_agave_v3_') and obj.type == 'MESH':
            obj.data.materials.clear()
            obj.data.materials.append(agave_mat)

    grass_specs = (
        ('pool_context_grass_v3_l1', (-5.20, 12.82, 0.12), 0.90),
        ('pool_context_grass_v3_l2', (-3.65, 12.92, 0.12), 0.78),
        ('pool_context_grass_v3_r1', (3.45, 12.82, 0.12), 0.82),
        ('pool_context_grass_v3_r2', (5.02, 12.98, 0.12), 0.94),
    )
    for prefix, location, scale in grass_specs:
        add_ribbon_grass(prefix, location, scale, grass)

    join_prefix('pool_context_agave_v3_', 'pool_context_agaves_v3')
    join_prefix('pool_context_grass_v3_', 'pool_context_grasses_v3')

    add_quiet_horizon(distant)


def assert_context_boundary():
    anchor = bpy.data.objects.get('tour_pool')
    lip = bpy.data.objects.get('infinity_lip')
    if not anchor or not lip:
        raise RuntimeError('tour_pool or infinity_lip missing from inherited Interior3 scene')

    for actual, expected, label in zip(anchor.location, POOL_CAMERA, ('x', 'y', 'z')):
        if abs(actual - expected) > 0.015:
            raise RuntimeError(f'tour_pool {label} moved: expected {expected}, got {actual}')

    required = (
        'pool_context_ground_v3',
        'pool_context_planter_edge_v3',
        'pool_context_soil_band_v3',
        'pool_context_agaves_v3',
        'pool_context_grasses_v3',
        'pool_context_horizon_v3_left',
        'pool_context_horizon_v3_right',
        'pool_context_pavilion_v3_left',
        'pool_context_pavilion_v3_right',
    )
    for name in required:
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f'missing context object: {name}')

    exceptions = {'pool_context_ground_v3'}
    for obj in bpy.data.objects:
        if not obj.name.startswith('pool_context_') or obj.name in exceptions:
            continue
        min_y = world_min_y(obj)
        if min_y < 11.72:
            raise RuntimeError(f'context invades infinity-edge envelope: {obj.name} world_min_y={min_y:.3f}')

    if bpy.data.objects.get('upper_stone_spine') is not None:
        raise RuntimeError('stable Interior3 upper_stone_spine repair regressed')

    context_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.name.startswith('pool_context_')]
    if len(context_meshes) > 12:
        raise RuntimeError(f'Pool Context v3 draw-call budget regressed: {len(context_meshes)} context meshes')

    print(
        f'Pool context v3 boundary PASS — tour_pool frozen, context behind infinity edge, '
        f'{len(context_meshes)} context meshes after planting joins'
    )


def configure_pool_review_camera():
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for Pool context review')
        cam = cameras[0]

    cam.location = POOL_CAMERA
    cam.data.lens = 31
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 220.0
    cam.data.shift_y = 0.015
    target = mathutils.Vector(POOL_TARGET)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def build_scene():
    interior3.build_scene()
    refine_pool_context()
    assert_context_boundary()
    configure_pool_review_camera()


def save_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(RENDER_PATH)

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f'Warning: pack_all failed: {exc}')

    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
        export_extras=True,
        export_lights=False,
    )

    print(f'Rendered Pool Context v3 review: {RENDER_PATH}')
    print(f'Saved Pool Context v3 Blender source: {BLEND_PATH}')
    print(f'Exported Pool Context v3 GLB without punctual lights: {GLB_PATH}')


def main():
    print(f'Building {STAGE_ID}')
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Pool Context v3 — authored agave/ribbon-grass desert garden generated')


if __name__ == '__main__':
    main()
