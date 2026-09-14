import importlib.util
import math
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
M4_SOURCE = HERE / "run_v03_m4.py"

spec = importlib.util.spec_from_file_location("villa_v03_m4", M4_SOURCE)
m4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m4)
m1 = m4.m1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-l1-light.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-l1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-l1.glb"


def remove_lights():
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)


def add_light_stage_l1():
    """Golden-hour light study over the frozen FORM + MATERIAL baselines.

    This stage intentionally changes lighting only. Lifestyle props remain hidden so
    the review can judge architectural hierarchy, facade depth, glazing, stone,
    timber, water and interior warmth without mixing in the Life stage.
    """
    remove_lights()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"

    # Low warm sun: grazing light should reveal the facade relief without turning
    # the limestone orange or crushing the quiet plaster.
    bpy.ops.object.light_add(type="SUN", location=(10.0, -12.0, 16.0))
    sun = bpy.context.object
    sun.name = "l1_golden_sun"
    sun.data.energy = 2.05
    sun.data.angle = math.radians(3.8)
    sun.data.color = (1.0, 0.76, 0.54)
    sun.rotation_euler = (math.radians(81.5), 0.0, math.radians(-52.0))

    # Broad cool sky fill keeps the shadow side premium instead of black.
    m1.r2.add_soft_area(
        "l1_sky_fill",
        (9.0, 15.0, 14.0),
        520,
        (0.48, 0.60, 0.78),
        14.0,
        (0.0, 2.0, 3.0),
    )

    # Very restrained camera-side bounce. This is intentionally weaker than the
    # sky fill so the image keeps direction and depth.
    m1.r2.add_soft_area(
        "l1_front_bounce",
        (-8.0, -14.0, 8.5),
        135,
        (1.0, 0.82, 0.66),
        11.0,
        (0.0, 0.0, 3.0),
    )

    # Warm interior pools of light behind the main glazing. These are lighting
    # cues only; no lifestyle geometry is introduced at the Light gate.
    m1.r2.add_soft_area(
        "l1_living_interior_warmth",
        (-2.5, -2.7, 2.15),
        360,
        (1.0, 0.48, 0.24),
        4.0,
        (-2.5, -5.6, 2.0),
    )
    m1.r2.add_soft_area(
        "l1_master_interior_warmth",
        (1.5, -1.6, 5.25),
        260,
        (1.0, 0.50, 0.27),
        3.2,
        (1.5, -4.8, 5.0),
    )

    # Desert-compatible dusk sky without baking a non-Dubai landscape into the
    # background. Nishita gives us photographic sky colour while keeping context
    # claims honest.
    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(4.8)
    sky.sun_rotation = math.radians(218.0)
    sky.altitude = 0.15
    sky.air_density = 1.0
    sky.dust_density = 4.8
    sky.ozone_density = 1.1
    bg.inputs["Strength"].default_value = 0.34
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    try:
        scene.view_settings.exposure = -0.18
    except Exception:
        pass


def build_scene():
    # M4 reconstructs the passed v0.3-r1.2 form and frozen M4 material system.
    m4.build_scene()
    add_light_stage_l1()


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

    print(f"Rendered v0.3 L1 light study: {RENDER_PATH}")
    print(f"Saved v0.3 L1 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 L1 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 L1 — golden-hour lighting study generated")


if __name__ == "__main__":
    main()
