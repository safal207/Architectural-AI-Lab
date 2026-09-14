import importlib.util
import math
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
L1_SOURCE = HERE / "run_v03_l1.py"

spec = importlib.util.spec_from_file_location("villa_v03_l1", L1_SOURCE)
l1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(l1)
m4 = l1.m4
m1 = l1.m1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-l2-light.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-l2.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-l2.glb"


def remove_lights():
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)


def add_light_stage_l2():
    """Balanced golden-hour correction over frozen Form + M4 materials.

    L2 addresses L1's amber horizon, crushed private volume, hot glazing streaks
    and overly dark foreground while preserving camera, geometry and materials.
    """
    remove_lights()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"

    # Slightly higher and less saturated than L1: still golden hour, but not orange.
    bpy.ops.object.light_add(type="SUN", location=(10.0, -12.0, 16.0))
    sun = bpy.context.object
    sun.name = "l2_golden_sun"
    sun.data.energy = 1.72
    sun.data.angle = math.radians(4.6)
    sun.data.color = (1.0, 0.84, 0.68)
    sun.rotation_euler = (math.radians(79.0), 0.0, math.radians(-50.0))

    # Cool ambient recovery for the shadow side and glazing.
    m1.r2.add_soft_area(
        "l2_sky_fill",
        (9.0, 15.0, 15.5),
        690,
        (0.55, 0.67, 0.84),
        15.0,
        (0.5, 1.5, 3.2),
    )

    # More readable foreground, still weaker than sky and sun.
    m1.r2.add_soft_area(
        "l2_front_bounce",
        (-8.0, -14.0, 8.0),
        205,
        (1.0, 0.90, 0.78),
        12.0,
        (0.0, 0.0, 2.7),
    )

    # Recover the dark private/right volume without flattening the entire facade.
    m1.r2.add_soft_area(
        "l2_private_volume_recovery",
        (12.0, -5.0, 9.0),
        185,
        (0.68, 0.75, 0.86),
        8.5,
        (4.0, 0.0, 4.3),
    )

    # Softer, less orange interior hospitality cues than L1.
    m1.r2.add_soft_area(
        "l2_living_interior_warmth",
        (-2.5, -2.4, 2.25),
        300,
        (1.0, 0.62, 0.38),
        4.8,
        (-2.5, -5.8, 2.0),
    )
    m1.r2.add_soft_area(
        "l2_master_interior_warmth",
        (1.5, -1.4, 5.3),
        225,
        (1.0, 0.64, 0.42),
        3.8,
        (1.5, -4.9, 5.0),
    )

    # Calmer desert dusk: less dust, slightly higher solar elevation, stronger
    # cool ambient component. This should remove the flat amber L1 horizon band.
    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(7.4)
    sky.sun_rotation = math.radians(220.0)
    sky.altitude = 0.15
    sky.air_density = 1.0
    sky.dust_density = 2.8
    sky.ozone_density = 1.15
    bg.inputs["Strength"].default_value = 0.40
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    try:
        scene.view_settings.exposure = -0.08
    except Exception:
        pass


def build_scene():
    # Rebuild the exact passed Form + M4 Material baseline; do not inherit L1
    # lights so L2 is a clean A/B lighting study.
    m4.build_scene()
    add_light_stage_l2()


def save_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    print(f"Rendered v0.3 L2 light study: {RENDER_PATH}")
    print(f"Saved v0.3 L2 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 L2 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 L2 — balanced golden-hour lighting study generated")


if __name__ == "__main__":
    main()
