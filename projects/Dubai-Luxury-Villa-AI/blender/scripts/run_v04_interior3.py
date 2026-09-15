import importlib.util
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
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior3.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior3.glb'
STAGE_ID = 'v0.4-interior3-root-cause-repair'

LANDING_CAMERA = (-3.65, 1.80, 4.95)
LANDING_TARGET = (-0.10, 1.45, 4.65)


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

    # Root-cause repair: this v0.3 exterior mass intersected the stair and camera.
    remove_named('upper_stone_spine')

    # Keep a thin architectural boundary outside the walking envelope instead
    # of a solid block through the circulation volume.
    interior1.cube(
        'upper_landing_side_wall_v04_r4',
        (0.16, 5.20, 2.56),
        (-5.18, -0.25, 4.96),
        limestone,
        0.015,
    )

    # The prior master door completely filled the opening. For a virtual tour,
    # show it opened 90 degrees inward so the threshold actually reads as a path.
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

    # Re-author the landing bead after the geometry repair. The eye point stays
    # on the real stair/bridge zone and looks through the now-open threshold.
    interior2.set_tour_anchor('tour_stair_upper', LANDING_CAMERA)
    interior2.add_look_target('tour_look_stair_upper', LANDING_TARGET)


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


def build_scene():
    interior2.build_scene()
    open_upper_circulation()
    assert_upper_landing_clearance()
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
        # The browser owns Day / Evening / Night lighting. Blender's authored
        # light rig uses Blender energy units that export to very large glTF
        # punctual-light intensities and then stack on top of the Three.js rig.
        # Keep emissive fixture meshes, but strip punctual lights at the engine boundary.
        export_lights=False,
    )

    print(f'Rendered v0.4 Interior3 Upper Landing review: {RENDER_PATH}')
    print(f'Saved v0.4 Interior3 Blender source: {BLEND_PATH}')
    print(f'Exported v0.4 Interior3 GLB without punctual lights: {GLB_PATH}')


def main():
    print(f'Building {STAGE_ID}')
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Interior3 — clear upper circulation, open master threshold and browser-safe lighting boundary generated')


if __name__ == '__main__':
    main()
