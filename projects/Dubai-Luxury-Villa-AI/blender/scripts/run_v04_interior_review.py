import importlib.util
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'run_v04_interior1.py'

spec = importlib.util.spec_from_file_location('villa_v04_interior1', SOURCE)
interior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(interior)

PROJECT_ROOT = HERE.parents[1]
RENDER_DIR = PROJECT_ROOT / 'renders' / 'v0.4-interior-review'

VIEWS = [
    {
        'name': 'living-to-dining',
        'location': (-0.60, 2.25, 1.65),
        'target': (3.00, 1.15, 1.55),
        'lens': 24,
    },
    {
        'name': 'stair-hall',
        'location': (-2.60, -2.60, 1.65),
        'target': (-4.15, 0.45, 1.85),
        'lens': 25,
    },
    {
        'name': 'master-suite',
        'location': (1.75, 2.05, 4.95),
        'target': (1.75, 0.10, 4.35),
        'lens': 25,
    },
]


def configure_camera(location, target, lens):
    cam = bpy.data.objects.get('hero_camera_v02')
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('No camera available for interior review')
        cam = cameras[0]

    cam.location = location
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.06
    cam.data.clip_end = 160.0
    target_vec = mathutils.Vector(target)
    cam.rotation_euler = (target_vec - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def configure_review_render():
    scene = bpy.context.scene
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 80
    scene.render.image_settings.file_format = 'PNG'

    if scene.render.engine == 'CYCLES':
        scene.cycles.samples = min(getattr(scene.cycles, 'samples', 64), 32)
        scene.cycles.use_denoising = True
    elif hasattr(scene, 'eevee'):
        try:
            scene.eevee.taa_render_samples = 48
        except Exception:
            pass


def main():
    interior.build_scene()
    configure_review_render()
    RENDER_DIR.mkdir(parents=True, exist_ok=True)

    for view in VIEWS:
        configure_camera(view['location'], view['target'], view['lens'])
        path = RENDER_DIR / f"{view['name']}.png"
        bpy.context.scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered first-person review view: {path}")

    print('Dubai Luxury Villa AI v0.4 interior first-person review complete')


if __name__ == '__main__':
    main()
