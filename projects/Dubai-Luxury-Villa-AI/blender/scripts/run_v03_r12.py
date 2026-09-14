import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
R11_SOURCE = HERE / "run_v03_r11.py"

spec = importlib.util.spec_from_file_location("villa_v03_r11", R11_SOURCE)
r11 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r11)
r1 = r11.r1
base = r11.base

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-r1.2-clay.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1.2.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1.2-massing.glb"


def refine_form_v03_r12():
    """Surgical correction after r1.1 A/B exposed a screen-space/world-space target mismatch."""

    # Remove the r1.1 reveal that landed on the opposite core in the hero camera.
    r1.delete_prefix((
        "left_core_recess_glass_v0311",
        "left_core_recess_header_v0311",
    ))

    # The large blank block on screen-left is ground_right_private_core in world space.
    # Reduce its mass and introduce exactly one controlled vertical recess on the camera-facing plane.
    r1.set_box(
        "ground_right_private_core",
        dimensions=(1.95, 5.95, 3.05),
        location=(7.56, -0.22, 1.53),
    )

    glass = bpy.data.materials.get("ArchitecturalGlassR6") or base.MATS["GlassNeutral"]
    metal = base.MATS["CharcoalMetal"]

    base.cube(
        "screen_left_core_recess_glass_v0312",
        (0.88, 0.075, 2.28),
        (7.42, 2.79, 1.48),
        glass,
        0.012,
    )
    base.cube(
        "screen_left_core_recess_header_v0312",
        (1.08, 0.10, 0.09),
        (7.42, 2.81, 2.68),
        metal,
        0.010,
    )

    # Keep the low ground-floor roof datum quieter around the corrected core.
    r1.set_box(
        "ground_front_header",
        dimensions=(11.25, 0.38, 0.26),
        location=(0.00, 4.20, 3.06),
    )


def save_review_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    r1.neutral_review_lighting()
    r1.prepare_clay_review()

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)

    print(f"Saved editable v0.3 r1.2 source: {BLEND_PATH}")
    print(f"Exported v0.3 r1.2 massing GLB: {GLB_PATH}")
    print(f"Rendered v0.3 r1.2 clay review: {RENDER_PATH}")


def main():
    r1.build_scene()
    r11.refine_form_v03_r11()
    refine_form_v03_r12()
    r11.assert_ab_camera_contract()
    save_review_outputs()
    print("Dubai Luxury Villa AI v0.3 r1.2 — screen-space form correction generated")


if __name__ == "__main__":
    main()
