import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_interior1.py'

spec = importlib.util.spec_from_file_location('villa_v04_interior1', SOURCE)
interior1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(interior1)

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-interior2.png'
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior2.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-interior2.glb'

TOUR_CAMERA_LOCATIONS = {
    'tour_entry': (-3.55, -2.20, 1.65),
    'tour_living': (-2.20, 0.65, 1.65),
    'tour_dining': (4.65, 1.65, 1.65),
    'tour_stair_ground': (-4.75, -2.95, 1.65),
    'tour_stair_upper': (-3.05, 1.90, 4.95),
    'tour_master': (4.75, 2.40, 5.00),
    'tour_pool': (-0.55, 7.05, 1.65),
}

TOUR_LOOK_TARGETS = {
    'tour_look_entry': (-0.65, 0.20, 1.50),
    'tour_look_living': (3.15, 0.35, 1.25),
    'tour_look_dining': (2.65, -1.62, 1.15),
    'tour_look_stair_ground': (-4.15, 0.30, 2.35),
    'tour_look_stair_upper': (-0.90, 1.85, 4.72),
    'tour_look_master': (1.60, 0.15, 4.30),
    'tour_look_pool': (-0.15, 3.90, 1.45),
}


def remove_objects(prefixes):
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def beam_between(name, a, b, radius, mat):
    start = mathutils.Vector(a)
    end = mathutils.Vector(b)
    vector = end - start
    length = vector.length
    midpoint = (start + end) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = mathutils.Vector((0, 0, 1)).rotation_difference(vector.normalized())
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_refined_stair_guard():
    remove_objects(('stair_post_v04_', 'stair_marker_v04_', 'stair_handrail_v04'))

    metal = bpy.data.materials.get('V04_CharcoalMetal')
    glass = bpy.data.materials.get('M3_SmokeArchitecturalGlass')
    if not metal:
        metal = interior1.material('V04_CharcoalMetal', (0.025, 0.030, 0.034), 0.28, metallic=0.72)
    if not glass:
        glass = interior1.material('V04_GuardGlass', (0.16, 0.22, 0.25), 0.18)

    x = -3.33
    start = (x, -2.25, 1.34)
    end = (x, 1.455, 4.27)
    beam_between('stair_top_rail_v04_r2', start, end, 0.026, metal)

    dy = end[1] - start[1]
    dz = end[2] - start[2]
    angle = math.atan2(dz, dy)
    length = math.sqrt(dy * dy + dz * dz)
    guard = interior1.cube(
        'stair_glass_guard_v04_r2',
        (0.035, length, 0.68),
        (x, (start[1] + end[1]) * 0.5, (start[2] + end[2]) * 0.5 - 0.22),
        glass,
        0.0,
    )
    guard.rotation_euler.x = angle

    for suffix, y, z in (
        ('lower', start[1], start[2] - 0.28),
        ('upper', end[1], end[2] - 0.28),
    ):
        interior1.cylinder(f'stair_end_post_v04_r2_{suffix}', 0.026, 0.82, (x, y, z), metal, 16)


def set_tour_anchor(name, location):
    obj = bpy.data.objects.get(name)
    if not obj:
        obj = interior1.add_tour_anchor(name, location, name.replace('tour_', '').replace('_', ' ').title(), 0, 'tour-camera')
    obj.location = location
    obj['tour_camera'] = True
    return obj


def add_look_target(name, location):
    existing = bpy.data.objects.get(name)
    if existing:
        existing.location = location
        return existing
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=location)
    target = bpy.context.object
    target.name = name
    target['tour_look_target'] = True
    return target


def refine_tour_path():
    for name, location in TOUR_CAMERA_LOCATIONS.items():
        set_tour_anchor(name, location)
    for name, location in TOUR_LOOK_TARGETS.items():
        add_look_target(name, location)


def simplify_master_suite():
    remove_objects(('master_bed_r2', 'master_bed_headboard'))


def build_master_room_shell():
    # The v0.3 private upper volume was a solid exterior mass. For a first-person tour
    # we replace that mass with an actual room shell and a physical stair-to-suite bridge.
    remove_objects((
        'upper_private_volume',
        'upper_interior_back',
        'master_door_v04',
        'master_door_handle_v04',
    ))

    plaster = bpy.data.materials.get('M3_IvoryPlaster') or interior1.material('V04_MasterPlaster', (0.76, 0.72, 0.64), 0.82)
    floor_mat = bpy.data.materials.get('M4_OrganicWarmLimestone') or interior1.material('V04_MasterFloor', (0.58, 0.49, 0.39), 0.66)
    walnut = bpy.data.materials.get('M2_WalnutTimber') or interior1.material('V04_MasterWalnut', (0.18, 0.07, 0.03), 0.48)
    metal = bpy.data.materials.get('V04_CharcoalMetal') or interior1.material('V04_CharcoalMetal', (0.025, 0.030, 0.034), 0.28, metallic=0.72)

    # Rear part of the master floor and ceiling meets the existing glazed-front strip.
    interior1.cube('master_floor_v04_r3', (7.30, 4.20, 0.10), (2.50, -0.85, 3.68), floor_mat, 0.0)
    interior1.cube('master_ceiling_v04_r3', (7.30, 4.20, 0.10), (2.50, -0.85, 6.24), plaster, 0.0)

    # Rear and right perimeter walls.
    interior1.cube('master_rear_wall_v04_r3', (7.30, 0.16, 2.56), (2.50, -3.00, 4.96), plaster, 0.0)
    interior1.cube('master_right_wall_v04_r3', (0.16, 5.70, 2.56), (6.15, -0.10, 4.96), plaster, 0.0)

    # Left wall is split to leave a real door opening from the upper landing/corridor.
    interior1.cube('master_left_wall_rear_v04_r3', (0.16, 4.15, 2.56), (-1.15, -0.875, 4.96), plaster, 0.0)
    interior1.cube('master_left_wall_front_v04_r3', (0.16, 0.25, 2.56), (-1.15, 2.625, 4.96), plaster, 0.0)

    # Bridge overlaps both the stair landing and the front master floor, creating a real visual connection.
    interior1.cube('upper_corridor_bridge_v04_r3', (2.25, 1.25, 0.16), (-2.175, 1.85, 3.55), floor_mat, 0.015)

    # Actual master-suite entry door located in the left-wall opening.
    interior1.cube('master_door_v04', (0.10, 1.18, 2.35), (-1.15, 1.85, 4.65), walnut, 0.025)
    interior1.cube('master_door_handle_v04', (0.04, 0.04, 0.42), (-1.08, 2.25, 4.62), metal, 0.010)


def configure_review_camera():
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for v0.4 Interior2 review')
        cam = cameras[0]

    cam.location = TOUR_CAMERA_LOCATIONS['tour_living']
    cam.data.lens = 24
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 160.0
    target = mathutils.Vector(TOUR_LOOK_TARGETS['tour_look_living'])
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def build_scene():
    interior1.build_scene()
    simplify_master_suite()
    build_master_room_shell()
    add_refined_stair_guard()
    refine_tour_path()
    configure_review_camera()


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
        export_lights=True,
    )

    print(f'Rendered v0.4 Interior2 review: {RENDER_PATH}')
    print(f'Saved v0.4 Interior2 Blender source: {BLEND_PATH}')
    print(f'Exported v0.4 Interior2 GLB: {GLB_PATH}')


def main():
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Interior2 — real upper master room shell, staircase connection, furniture, doors, lights, camera anchors and look targets generated')


if __name__ == '__main__':
    main()
