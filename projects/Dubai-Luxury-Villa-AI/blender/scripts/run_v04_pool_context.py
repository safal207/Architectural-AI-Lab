import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_interior3.py'

spec = importlib.util.spec_from_file_location('villa_v04_interior3', SOURCE)
interior3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(interior3)
interior1 = interior3.interior1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-pool-context.png'
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context.glb'
STAGE_ID = 'v0.4-pool-context-v2'

POOL_CAMERA = (-0.55, 7.05, 1.65)
POOL_TARGET = (-3.75, 11.40, 0.46)


def remove_context():
    for obj in list(bpy.data.objects):
        if obj.name.startswith('pool_context_'):
            bpy.data.objects.remove(obj, do_unlink=True)


def smooth_ellipsoid(name, location, scale, material, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def add_grass_blade(name, location, height, lean, material):
    bpy.ops.mesh.primitive_cone_add(
        vertices=10,
        radius1=0.085,
        radius2=0.012,
        depth=height,
        location=(location[0], location[1], location[2] + height * 0.5),
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler.x = math.radians(lean)
    if material:
        obj.data.materials.append(material)
    return obj


def add_grass_clump(prefix, x, y, material):
    offsets = (
        (-0.15, -0.05, 0.54, -7),
        (-0.04, 0.04, 0.66, 5),
        (0.08, -0.02, 0.59, -3),
        (0.17, 0.06, 0.50, 8),
    )
    for index, (dx, dy, height, lean) in enumerate(offsets):
        add_grass_blade(
            f'{prefix}_{index:02d}',
            (x + dx, y + dy, 0.18),
            height,
            lean,
            material,
        )


def add_soft_tree(prefix, x, y, height, trunk_mat, crown_a, crown_b):
    trunk_height = height * 0.64
    interior1.cylinder(
        f'{prefix}_trunk',
        0.085,
        trunk_height,
        (x, y, trunk_height * 0.5),
        trunk_mat,
        14,
    )

    crown_z = trunk_height + 0.32
    crown_specs = (
        ((0.00, 0.00, 0.02), (0.58, 0.44, 0.38), crown_a),
        ((-0.32, 0.03, -0.08), (0.42, 0.34, 0.30), crown_b),
        ((0.30, -0.02, -0.04), (0.46, 0.35, 0.31), crown_a),
        ((0.04, 0.20, 0.20), (0.39, 0.31, 0.28), crown_b),
    )
    for index, ((dx, dy, dz), scale, material) in enumerate(crown_specs):
        smooth_ellipsoid(
            f'{prefix}_crown_{index:02d}',
            (x + dx, y + dy, crown_z + dz),
            scale,
            material,
            subdivisions=2,
        )


def add_dune(name, location, scale, material):
    dune = smooth_ellipsoid(name, location, scale, material, subdivisions=2)
    return dune


def refine_pool_context():
    """Add restrained desert-hospitality depth beyond the existing infinity edge.

    This stage is intentionally isolated from Interior3. It does not move the
    authored Pool Terrace navigation anchor, pool water, infinity lip, villa shell,
    interior lighting or camera route. Context begins behind the infinity edge and
    is intentionally low-poly enough for a browser-delivered GLB.
    """
    remove_context()

    limestone = bpy.data.materials.get('M4_OrganicWarmLimestone') or interior1.material(
        'V04_PoolContextLimestone', (0.54, 0.48, 0.40), 0.76
    )
    sand = interior1.material('V04_PoolContextSandV2', (0.37, 0.325, 0.265), 0.98)
    soil = interior1.material('V04_PoolContextSoilV2', (0.105, 0.095, 0.072), 0.99)
    olive_a = interior1.material('V04_PoolContextOliveA_V2', (0.075, 0.125, 0.085), 0.96)
    olive_b = interior1.material('V04_PoolContextOliveB_V2', (0.115, 0.155, 0.105), 0.96)
    dry_grass = interior1.material('V04_PoolContextDryGrassV2', (0.31, 0.29, 0.16), 0.98)
    trunk = interior1.material('V04_PoolContextTrunkV2', (0.105, 0.066, 0.041), 0.98)
    dune_mat = interior1.material('V04_PoolContextDuneV2', (0.43, 0.385, 0.32), 0.99)
    distant = interior1.material('V04_PoolContextDistantV2', (0.46, 0.445, 0.415), 0.98)

    # A quiet desert datum replaces the empty void beyond the infinity edge.
    interior1.cube(
        'pool_context_ground_v2',
        (30.0, 20.0, 0.14),
        (-0.55, 21.60, -0.05),
        sand,
        0.02,
    )

    # Keep the edge low: this is a planting datum, not a bright wall across the view.
    interior1.cube(
        'pool_context_planter_edge_v2',
        (14.65, 0.42, 0.22),
        (-0.55, 12.08, 0.10),
        limestone,
        0.045,
    )
    interior1.cube(
        'pool_context_soil_band_v2',
        (14.10, 1.05, 0.10),
        (-0.55, 12.70, 0.055),
        soil,
        0.02,
    )

    # Side-biased planting preserves a calm open visual axis through the infinity edge.
    shrubs = (
        (-6.25, 12.75, 0.39, (0.48, 0.34, 0.30), olive_a),
        (-5.45, 12.95, 0.35, (0.38, 0.30, 0.27), olive_b),
        (-4.55, 12.72, 0.37, (0.45, 0.32, 0.29), olive_a),
        (-3.75, 13.02, 0.32, (0.34, 0.27, 0.24), olive_b),
        (3.35, 12.92, 0.34, (0.40, 0.30, 0.27), olive_b),
        (4.25, 12.70, 0.39, (0.48, 0.34, 0.30), olive_a),
        (5.15, 12.96, 0.34, (0.39, 0.30, 0.27), olive_b),
        (6.00, 12.73, 0.37, (0.44, 0.32, 0.28), olive_a),
    )
    for index, (x, y, z, scale, material) in enumerate(shrubs):
        smooth_ellipsoid(f'pool_context_shrub_v2_{index:02d}', (x, y, z), scale, material)

    for index, (x, y) in enumerate(((-5.85, 12.78), (-4.95, 12.88), (4.55, 12.82), (5.55, 12.90))):
        add_grass_clump(f'pool_context_grass_v2_{index:02d}', x, y, dry_grass)

    # Small soft olive silhouettes frame the sides and sit further back than V1.
    add_soft_tree('pool_context_tree_v2_left', -8.05, 15.30, 2.05, trunk, olive_a, olive_b)
    add_soft_tree('pool_context_tree_v2_right', 7.35, 14.85, 1.90, trunk, olive_a, olive_b)

    # Overlapping flattened forms create a desert horizon instead of a blank plane.
    add_dune('pool_context_dune_v2_left', (-8.2, 26.0, 0.18), (7.8, 3.4, 0.90), dune_mat)
    add_dune('pool_context_dune_v2_mid', (0.2, 27.2, 0.10), (8.5, 3.6, 0.82), dune_mat)
    add_dune('pool_context_dune_v2_right', (8.4, 25.7, 0.16), (7.2, 3.1, 0.78), dune_mat)

    # Very distant residential silhouettes: enough scale/depth, deliberately not a city hero.
    distant_specs = (
        (-6.8, 31.5, 1.45, 2.25, 2.00),
        (-3.7, 32.7, 2.05, 2.10, 1.85),
        (-0.9, 33.0, 1.55, 2.55, 2.00),
        (2.5, 32.2, 2.45, 2.20, 2.10),
        (5.5, 33.1, 1.72, 2.35, 1.90),
        (8.0, 31.9, 1.35, 1.90, 1.80),
    )
    for index, (x, y, height, width, depth) in enumerate(distant_specs):
        interior1.cube(
            f'pool_context_distant_v2_{index:02d}',
            (width, depth, height),
            (x, y, height * 0.5 - 0.02),
            distant,
            0.09,
        )


def assert_context_boundary():
    anchor = bpy.data.objects.get('tour_pool')
    lip = bpy.data.objects.get('infinity_lip')
    if not anchor or not lip:
        raise RuntimeError('tour_pool or infinity_lip missing from inherited Interior3 scene')

    for actual, expected, label in zip(anchor.location, POOL_CAMERA, ('x', 'y', 'z')):
        if abs(actual - expected) > 0.015:
            raise RuntimeError(f'tour_pool {label} moved: expected {expected}, got {actual}')

    required = (
        'pool_context_ground_v2',
        'pool_context_planter_edge_v2',
        'pool_context_soil_band_v2',
        'pool_context_shrub_v2_00',
        'pool_context_tree_v2_left_trunk',
        'pool_context_tree_v2_right_trunk',
        'pool_context_dune_v2_mid',
        'pool_context_distant_v2_00',
    )
    for name in required:
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f'missing context object: {name}')

    # Only the below-grade ground datum may begin close to the lip. Everything
    # vertical/decorative stays behind the authored infinity edge at y=11.40.
    exceptions = {'pool_context_ground_v2'}
    for obj in bpy.data.objects:
        if not obj.name.startswith('pool_context_') or obj.name in exceptions:
            continue
        min_y = obj.location.y - obj.dimensions.y * 0.5
        if min_y < 11.72:
            raise RuntimeError(f'context invades infinity-edge envelope: {obj.name} min_y={min_y:.3f}')

    if bpy.data.objects.get('upper_stone_spine') is not None:
        raise RuntimeError('stable Interior3 upper_stone_spine repair regressed')

    print('Pool context v2 boundary PASS — tour_pool frozen and context remains beyond infinity edge')


def configure_pool_review_camera():
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for Pool context review')
        cam = cameras[0]

    cam.location = POOL_CAMERA
    cam.data.lens = 24
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 220.0
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

    print(f'Rendered Pool Context v2 review: {RENDER_PATH}')
    print(f'Saved Pool Context v2 Blender source: {BLEND_PATH}')
    print(f'Exported Pool Context v2 GLB without punctual lights: {GLB_PATH}')


def main():
    print(f'Building {STAGE_ID}')
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Pool Context v2 — restrained desert-hospitality context generated')


if __name__ == '__main__':
    main()
