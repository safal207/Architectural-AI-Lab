import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_interior2.py'

spec = importlib.util.spec_from_file_location('villa_v04_interior2', SOURCE)
interior2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(interior2)
interior1 = interior2.interior1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-interior3-upper-landing.png'
POOL_RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-interior3-pool-context.png'
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior3.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior3.glb'
STAGE_ID = 'v0.4-interior3-root-cause-repair-pool-context'

LANDING_CAMERA = (-3.65, 1.80, 4.95)
LANDING_TARGET = (-0.10, 1.45, 4.65)
POOL_CAMERA = (-0.55, 7.05, 1.65)
POOL_TARGET = (-3.75, 11.40, 0.38)


def remove_named(*names):
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)


def open_upper_circulation():
    """Replace the v0.3 solid stone mass with a real stair/landing circulation zone.

    The previous `upper_stone_spine` occupied the same volume as the v0.4
    staircase and Upper Landing camera. That was acceptable for an exterior
    massing render but invalid for a first-person interior tour: the camera was
    literally inside a solid architectural mass. Interior3 keeps the facade
    blade, removes the conflicting solid, restores a slim side boundary, and
    opens the master-suite door leaf inward.
    """

    limestone = bpy.data.materials.get('M4_OrganicWarmLimestone') or interior1.material(
        'V04_LandingLimestoneFallback', (0.58, 0.49, 0.39), 0.66
    )
    walnut = bpy.data.materials.get('M2_WalnutTimber') or interior1.material(
        'V04_LandingWalnutFallback', (0.18, 0.07, 0.03), 0.48
    )
    metal = bpy.data.materials.get('V04_CharcoalMetal') or interior1.material(
        'V04_CharcoalMetal', (0.025, 0.030, 0.034), 0.28, metallic=0.72
    )

    remove_named('upper_stone_spine')

    interior1.cube(
        'upper_landing_side_wall_v04_r4',
        (0.16, 5.20, 2.56),
        (-5.18, -0.25, 4.96),
        limestone,
        0.015,
    )

    remove_named('master_door_v04', 'master_door_handle_v04')
    interior1.cube(
        'master_door_open_v04_r4',
        (1.12, 0.10, 2.35),
        (-0.59, 1.26, 4.65),
        walnut,
        0.025,
    )
    interior1.cube(
        'master_door_handle_open_v04_r4',
        (0.04, 0.04, 0.42),
        (-0.10, 1.20, 4.62),
        metal,
        0.010,
    )

    interior2.set_tour_anchor('tour_stair_upper', LANDING_CAMERA)
    interior2.add_look_target('tour_look_stair_upper', LANDING_TARGET)


def refine_master_suite_luxury():
    """Add a restrained quiet-luxury composition pass to the master suite.

    Navigation and shell geometry stay frozen. The refinement layers the bed,
    feature wall and foreground so the first-person browser frame reads as an
    authored bedroom rather than a furnished whitebox.
    """
    limestone = bpy.data.materials.get('M4_OrganicWarmLimestone') or interior1.material(
        'V04_MasterLimestoneFallback', (0.58, 0.49, 0.39), 0.66
    )
    walnut = bpy.data.materials.get('M2_WalnutTimber') or interior1.material(
        'V04_MasterWalnutFallback', (0.18, 0.07, 0.03), 0.50
    )
    quiet_fabric = bpy.data.materials.get('V04_QuietFabric') or interior1.material(
        'V04_MasterQuietFabric', (0.36, 0.31, 0.27), 0.92
    )
    rug = bpy.data.materials.get('V04_MasterRugTaupe') or interior1.material(
        'V04_MasterRugTaupe', (0.24, 0.205, 0.175), 0.94
    )
    linen = bpy.data.materials.get('V04_MasterLinen') or interior1.material(
        'V04_MasterLinen', (0.74, 0.70, 0.63), 0.96
    )
    throw = bpy.data.materials.get('V04_MasterThrow') or interior1.material(
        'V04_MasterThrow', (0.22, 0.18, 0.16), 0.96
    )
    warm_light = bpy.data.materials.get('V04_WarmEmissive') or interior1.material(
        'V04_MasterWarmEmissive',
        (0.92, 0.65, 0.35),
        0.30,
        emission=(1.0, 0.55, 0.20),
        emission_strength=2.0,
    )

    remove_named(
        'master_feature_stone_v04_r5',
        'master_feature_fin_left_v04_r5',
        'master_feature_fin_right_v04_r5',
        'master_rug_v04_r5',
        'master_bench_base_v04_r5',
        'master_bench_cushion_v04_r5',
        'master_headboard_cove_v04_r5',
        'master_pillow_left_v04_r6',
        'master_pillow_right_v04_r6',
        'master_lumbar_v04_r6',
        'master_throw_v04_r6',
    )

    interior1.cube(
        'master_feature_stone_v04_r5',
        (3.55, 0.08, 1.82),
        (1.75, -0.82, 4.92),
        limestone,
        0.018,
    )
    interior1.cube(
        'master_feature_fin_left_v04_r5',
        (0.15, 0.10, 2.28),
        (0.18, -0.80, 4.98),
        walnut,
        0.018,
    )
    interior1.cube(
        'master_feature_fin_right_v04_r5',
        (0.15, 0.10, 2.28),
        (3.32, -0.80, 4.98),
        walnut,
        0.018,
    )

    interior1.cube(
        'master_rug_v04_r5',
        (3.85, 3.10, 0.035),
        (1.75, 0.54, 3.755),
        rug,
        0.035,
    )

    interior1.cube(
        'master_bench_base_v04_r5',
        (1.72, 0.46, 0.22),
        (1.75, 1.72, 3.88),
        walnut,
        0.045,
    )
    interior1.cube(
        'master_bench_cushion_v04_r5',
        (1.62, 0.43, 0.18),
        (1.75, 1.72, 4.07),
        quiet_fabric,
        0.055,
    )

    pillow_left = interior1.cube(
        'master_pillow_left_v04_r6',
        (0.84, 0.46, 0.18),
        (1.24, -0.24, 4.48),
        linen,
        0.10,
    )
    pillow_left.rotation_euler.z = math.radians(5.0)
    pillow_right = interior1.cube(
        'master_pillow_right_v04_r6',
        (0.84, 0.46, 0.18),
        (2.26, -0.24, 4.48),
        linen,
        0.10,
    )
    pillow_right.rotation_euler.z = math.radians(-5.0)
    interior1.cube(
        'master_lumbar_v04_r6',
        (1.18, 0.26, 0.16),
        (1.75, 0.03, 4.51),
        quiet_fabric,
        0.08,
    )
    interior1.cube(
        'master_throw_v04_r6',
        (2.02, 0.58, 0.06),
        (1.75, 0.98, 4.40),
        throw,
        0.035,
    )

    interior1.cube(
        'master_headboard_cove_v04_r5',
        (3.08, 0.05, 0.055),
        (1.75, -0.765, 5.67),
        warm_light,
        0.010,
    )


def low_poly_shrub(name, location, scale, mat):
    """One low-poly organic volume; cheap enough for the web GLB."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def refine_pool_context():
    """Give the infinity edge real depth without turning the villa into a city scene.

    The Pool Terrace camera and walk anchor remain untouched. Context begins beyond
    the authored infinity lip at y=11.40, so it cannot become a hidden navigation
    obstacle. Geometry is intentionally low-poly: a sand datum, one planter band,
    restrained planting at the sides, and low-contrast distant neighborhood massing.
    """
    limestone = bpy.data.materials.get('M4_OrganicWarmLimestone') or interior1.material(
        'V04_PoolContextLimestone', (0.56, 0.49, 0.40), 0.74
    )
    sand = interior1.material('V04_PoolContextSand', (0.39, 0.34, 0.27), 0.96)
    olive = interior1.material('V04_PoolContextOlive', (0.085, 0.135, 0.095), 0.93)
    olive_soft = interior1.material('V04_PoolContextOliveSoft', (0.12, 0.17, 0.115), 0.94)
    trunk = interior1.material('V04_PoolContextTrunk', (0.12, 0.075, 0.045), 0.96)
    distant = interior1.material('V04_PoolContextMassing', (0.34, 0.32, 0.29), 0.96)

    for obj in list(bpy.data.objects):
        if obj.name.startswith('pool_context_'):
            bpy.data.objects.remove(obj, do_unlink=True)

    # Ground datum begins below/behind the infinity edge and extends only into the
    # visual background. Its low top surface cannot interfere with the pool route.
    interior1.cube(
        'pool_context_desert_ground_v04',
        (26.0, 14.0, 0.14),
        (-0.55, 18.15, -0.04),
        sand,
        0.02,
    )
    interior1.cube(
        'pool_context_planter_v04',
        (15.10, 0.68, 0.38),
        (-0.55, 12.28, 0.22),
        limestone,
        0.055,
    )

    shrub_specs = (
        (-6.15, 12.45, 0.63, (0.72, 0.46, 0.42), olive),
        (-5.00, 12.60, 0.59, (0.54, 0.40, 0.36), olive_soft),
        (-3.82, 12.42, 0.61, (0.66, 0.43, 0.39), olive),
        (2.95, 12.48, 0.60, (0.62, 0.42, 0.38), olive_soft),
        (4.25, 12.58, 0.65, (0.72, 0.45, 0.42), olive),
        (5.62, 12.43, 0.58, (0.56, 0.38, 0.35), olive_soft),
    )
    for index, (x, y, z, scale, mat) in enumerate(shrub_specs):
        low_poly_shrub(f'pool_context_shrub_{index:02d}', (x, y, z), scale, mat)

    # Two vertical accents frame rather than block the infinity axis.
    for side, x, y, height in (
        ('left', -6.75, 13.35, 2.35),
        ('right', 6.15, 13.15, 2.15),
    ):
        interior1.cylinder(
            f'pool_context_tree_{side}_trunk',
            0.12,
            height,
            (x, y, height * 0.5),
            trunk,
            12,
        )
        low_poly_shrub(
            f'pool_context_tree_{side}_crown',
            (x, y, height + 0.35),
            (0.95, 0.78, 0.62),
            olive,
        )

    # Distant massing is deliberately low and desaturated: enough parallax/depth
    # to avoid a blank horizon, but still subordinate to the villa and water.
    distant_specs = (
        (-8.2, 21.8, 2.2, 3.2, 2.8),
        (-4.6, 22.8, 3.0, 3.0, 2.6),
        (-0.8, 23.4, 2.4, 4.0, 2.8),
        (3.8, 22.4, 3.8, 3.4, 2.9),
        (7.9, 23.2, 2.7, 3.1, 2.7),
    )
    for index, (x, y, height, width, depth) in enumerate(distant_specs):
        interior1.cube(
            f'pool_context_distant_{index:02d}',
            (width, depth, height),
            (x, y, height * 0.5 - 0.02),
            distant,
            0.06,
        )


def point_inside_axis_aligned_box(point, obj, clearance=0.0):
    half = obj.dimensions * 0.5
    return (
        obj.location.x - half.x - clearance <= point.x <= obj.location.x + half.x + clearance
        and obj.location.y - half.y - clearance <= point.y <= obj.location.y + half.y + clearance
        and obj.location.z - half.z - clearance <= point.z <= obj.location.z + half.z + clearance
    )


def assert_upper_landing_clearance():
    anchor = bpy.data.objects.get('tour_stair_upper')
    if not anchor:
        raise RuntimeError('tour_stair_upper missing after Interior3 refinement')

    blockers = [
        'upper_landing_side_wall_v04_r4',
        'master_left_wall_rear_v04_r3',
        'master_left_wall_front_v04_r3',
        'master_door_open_v04_r4',
        'master_floor_v04_r3',
        'master_ceiling_v04_r3',
    ]
    for name in blockers:
        obj = bpy.data.objects.get(name)
        if obj and point_inside_axis_aligned_box(anchor.location, obj, clearance=0.06):
            raise RuntimeError(f'Upper Landing camera intersects blocker: {name}')

    if bpy.data.objects.get('upper_stone_spine') is not None:
        raise RuntimeError('upper_stone_spine must be removed for Interior3 walkthrough')

    door = bpy.data.objects.get('master_door_open_v04_r4')
    if not door:
        raise RuntimeError('open master door missing')

    print(f'Upper Landing clearance PASS at {tuple(round(v, 3) for v in anchor.location)}')


def assert_pool_context_clearance():
    anchor = bpy.data.objects.get('tour_pool')
    lip = bpy.data.objects.get('infinity_lip')
    if not anchor or not lip:
        raise RuntimeError('Pool route anchor or infinity lip missing')

    if abs(anchor.location.x - POOL_CAMERA[0]) > 0.01 or abs(anchor.location.y - POOL_CAMERA[1]) > 0.01:
        raise RuntimeError(f'Pool navigation anchor moved unexpectedly: {tuple(anchor.location)}')

    required = (
        'pool_context_planter_v04',
        'pool_context_shrub_00',
        'pool_context_tree_left_trunk',
        'pool_context_tree_right_trunk',
        'pool_context_distant_00',
    )
    for name in required:
        if bpy.data.objects.get(name) is None:
            raise RuntimeError(f'Missing Pool context object: {name}')

    # Excluding the below-grade desert datum, all vertical context begins safely
    # behind the infinity edge and outside the walkable/pool presentation envelope.
    for obj in bpy.data.objects:
        if not obj.name.startswith('pool_context_') or obj.name == 'pool_context_desert_ground_v04':
            continue
        min_y = obj.location.y - obj.dimensions.y * 0.5
        if min_y < 11.72:
            raise RuntimeError(f'Pool context leaked into infinity-edge envelope: {obj.name} min_y={min_y:.3f}')

    print('Pool context clearance PASS — navigation anchor frozen and context stays beyond infinity edge')


def configure_upper_landing_review_camera():
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for Interior3 review')
        cam = cameras[0]

    cam.location = LANDING_CAMERA
    cam.data.lens = 28
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 160.0
    target = mathutils.Vector(LANDING_TARGET)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def configure_pool_context_review_camera():
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
    cam.data.clip_end = 180.0
    target = mathutils.Vector(POOL_TARGET)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def build_scene():
    interior2.build_scene()
    open_upper_circulation()
    refine_master_suite_luxury()
    refine_pool_context()
    assert_upper_landing_clearance()
    assert_pool_context_clearance()
    configure_upper_landing_review_camera()


def save_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f'Warning: pack_all failed: {exc}')

    configure_upper_landing_review_camera()
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)

    configure_pool_context_review_camera()
    scene.render.filepath = str(POOL_RENDER_PATH)
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

    print(f'Rendered v0.4 Interior3 Upper Landing review: {RENDER_PATH}')
    print(f'Rendered v0.4 Pool context review: {POOL_RENDER_PATH}')
    print(f'Saved v0.4 Interior3 Blender source: {BLEND_PATH}')
    print(f'Exported v0.4 Interior3 GLB without punctual lights: {GLB_PATH}')


def main():
    print(f'Building {STAGE_ID}')
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Interior3 — clear circulation, quiet-luxury master suite and restrained infinity-pool landscape context generated')


if __name__ == '__main__':
    main()
