import importlib.util
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_pool_context.py'

spec = importlib.util.spec_from_file_location('villa_v04_pool_context_v3', SOURCE)
v3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v3)

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / 'renders' / 'villa-v0.4-pool-context-v4.png'
BLEND_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context-v4.blend'
GLB_PATH = PROJECT_ROOT / 'exports' / 'villa-v0.4-pool-context-v4.glb'
STAGE_ID = 'v0.4-pool-context-v4-guided-hero'

# Explore keeps v3.POOL_CAMERA / tour_pool untouched. Guided presentation gets
# a deliberately authored camera on the far/right landscape shelf, looking
# diagonally back across the water toward the villa. This is intentionally not
# a walkable navigation point.
PRESENTATION_CAMERA = (8.80, 14.65, 2.05)
PRESENTATION_TARGET = (0.35, 4.45, 2.15)


def add_presentation_empty(name, location, role):
    existing = bpy.data.objects.get(name)
    if existing:
        existing.location = location
        obj = existing
    else:
        bpy.ops.object.empty_add(type='PLAIN_AXES', location=location)
        obj = bpy.context.object
        obj.name = name
    obj['presentation_role'] = role
    obj['tour_stop'] = 'pool'
    obj['navigation_authority'] = False
    return obj


def author_pool_presentation_camera():
    add_presentation_empty('tour_present_pool', PRESENTATION_CAMERA, 'guided-camera')
    add_presentation_empty('tour_present_look_pool', PRESENTATION_TARGET, 'guided-look-target')


def assert_presentation_boundary():
    route = bpy.data.objects.get('tour_pool')
    present = bpy.data.objects.get('tour_present_pool')
    target = bpy.data.objects.get('tour_present_look_pool')
    if not route or not present or not target:
        raise RuntimeError('Pool route/presentation anchors incomplete')

    for actual, expected, label in zip(route.location, v3.POOL_CAMERA, ('x', 'y', 'z')):
        if abs(actual - expected) > 0.015:
            raise RuntimeError(f'tour_pool {label} moved while authoring hero camera')

    if (present.location - route.location).length < 3.0:
        raise RuntimeError('Pool presentation camera is not meaningfully separated from route anchor')

    if present.get('navigation_authority', True):
        raise RuntimeError('Pool presentation camera must not claim navigation authority')

    print(
        'Pool presentation boundary PASS — Explore remains on tour_pool; '
        'Guided has independent authored hero camera and look target'
    )


def configure_guided_review_camera():
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for Pool Context v4 review')
        cam = cameras[0]

    cam.location = PRESENTATION_CAMERA
    cam.data.lens = 36
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 240.0
    cam.data.shift_y = 0.035
    target = mathutils.Vector(PRESENTATION_TARGET)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def build_scene():
    v3.build_scene()
    author_pool_presentation_camera()
    assert_presentation_boundary()
    configure_guided_review_camera()


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

    print(f'Rendered Pool Context v4 guided hero review: {RENDER_PATH}')
    print(f'Saved Pool Context v4 Blender source: {BLEND_PATH}')
    print(f'Exported Pool Context v4 GLB: {GLB_PATH}')


def main():
    print(f'Building {STAGE_ID}')
    build_scene()
    save_outputs()
    print('Dubai Luxury Villa AI v0.4 Pool Context v4 — independent Guided hero camera authored without moving Explore route')


if __name__ == '__main__':
    main()
