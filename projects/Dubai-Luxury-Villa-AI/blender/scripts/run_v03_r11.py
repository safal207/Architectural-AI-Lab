import importlib.util
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R1_SOURCE = HERE / "run_v03_r1.py"

spec = importlib.util.spec_from_file_location("villa_v03_r1", R1_SOURCE)
r1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r1)
base = r1.base

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-r1.1-clay.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1.1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1.1-massing.glb"


def set_prefix_y(prefix, y):
    for obj in bpy.data.objects:
        if obj.name.startswith(prefix):
            obj.location.y = y


def refine_form_v03_r11():
    """Resolve the five blocking form issues recorded after v0.3-r1 clay review."""

    # 1) Roof hierarchy: thinner and less laterally dominant.
    r1.set_box(
        "signature_cantilever",
        dimensions=(10.90, 3.25, 0.16),
        location=(2.85, 4.40, 6.56),
    )
    r1.set_box(
        "roof_plane",
        dimensions=(14.60, 7.95, 0.14),
        location=(1.55, -0.05, 6.66),
    )
    r1.set_box(
        "signature_timber_soffit",
        dimensions=(10.00, 2.62, 0.035),
        location=(2.85, 4.35, 6.43),
    )
    r1.set_box(
        "signature_dark_edge",
        dimensions=(10.95, 0.08, 0.10),
        location=(2.85, 6.03, 6.55),
    )
    r1.set_box(
        "cantilever_linear_light_r6",
        dimensions=(8.80, 0.024, 0.020),
        location=(2.70, 5.62, 6.39),
    )

    # 2) Left ground core: reduce the monolithic box and introduce one controlled recess.
    r1.set_box(
        "ground_left_stone_core",
        dimensions=(3.55, 7.80, 3.22),
        location=(-7.30, -0.05, 1.61),
    )
    glass = bpy.data.materials.get("ArchitecturalGlassR6") or base.MATS["GlassNeutral"]
    base.cube(
        "left_core_recess_glass_v0311",
        (1.12, 0.075, 2.35),
        (-6.92, 3.88, 1.53),
        glass,
        0.012,
    )
    metal = base.MATS["CharcoalMetal"]
    base.cube(
        "left_core_recess_header_v0311",
        (1.36, 0.10, 0.10),
        (-6.92, 3.90, 2.76),
        metal,
        0.010,
    )

    # 3) Upper facade depth: the glass plane sits behind a thinner frame instead of on the box face.
    r1.set_box(
        "upper_private_volume",
        dimensions=(6.75, 5.20, 2.72),
        location=(3.22, 0.12, 4.88),
    )
    set_prefix_y("master_glass_", 2.82)
    set_prefix_y("master_mullion_", 2.84)

    r1.set_box(
        "master_frame_top",
        dimensions=(6.55, 0.22, 0.17),
        location=(2.34, 3.10, 6.24),
    )
    r1.set_box(
        "master_frame_bottom",
        dimensions=(6.55, 0.22, 0.14),
        location=(2.34, 3.10, 3.74),
    )
    r1.set_box(
        "master_side_frame_left_r6",
        dimensions=(0.12, 0.28, 2.48),
        location=(-0.88, 3.08, 4.96),
    )
    r1.set_box(
        "master_side_frame_right_r6",
        dimensions=(0.12, 0.28, 2.48),
        location=(5.56, 3.08, 4.96),
    )

    set_prefix_y("balcony_glass_r6_", 3.54)
    r1.set_box(
        "balcony_top_rail_r6",
        dimensions=(6.25, 0.06, 0.055),
        location=(2.32, 3.54, 4.72),
    )
    r1.set_box(
        "balcony_soffit_r6",
        dimensions=(6.30, 0.88, 0.045),
        location=(2.32, 3.48, 3.58),
    )

    # 4) Foreground base: visually thinner layers so the villa does not read as a scale model.
    r1.set_box(
        "context_ground_r4",
        dimensions=(86.0, 72.0, 0.08),
        location=(0.0, 2.0, -0.28),
    )
    r1.set_box(
        "garden_field",
        dimensions=(38.0, 32.0, 0.10),
        location=(0.0, 1.0, -0.18),
    )
    r1.set_box(
        "site_plinth",
        dimensions=(30.0, 23.0, 0.12),
        location=(0.0, 1.8, -0.06),
    )
    r1.set_box(
        "terrace_deck",
        dimensions=(22.80, 7.75, 0.14),
        location=(0.75, 6.72, 0.07),
    )

    # 5) Pool/terrace integration: fewer stacked bands, thinner basin and water almost flush with deck.
    r1.delete_prefix("pool_edge_shadow_v03")
    r1.set_box(
        "pool_basin",
        dimensions=(13.85, 4.30, 0.20),
        location=(-0.55, 9.25, 0.08),
    )
    r1.set_box(
        "pool_water",
        dimensions=(13.42, 3.86, 0.06),
        location=(-0.55, 9.25, 0.19),
    )
    r1.set_box(
        "pool_shallow_shelf",
        dimensions=(2.75, 3.35, 0.08),
        location=(4.85, 9.25, 0.18),
    )
    r1.set_box(
        "infinity_lip",
        dimensions=(13.88, 0.12, 0.10),
        location=(-0.55, 11.40, 0.13),
    )


def assert_ab_camera_contract():
    """The r1.1 review must use exactly the r1 camera for a valid A/B comparison."""
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        raise RuntimeError("hero_camera_v02 missing")

    expected_location = mathutils.Vector((24.8, 28.6, 1.72))
    if (cam.location - expected_location).length > 1e-6:
        raise RuntimeError(f"A/B camera location drifted: {tuple(cam.location)}")
    if abs(cam.data.lens - 40.0) > 1e-6:
        raise RuntimeError(f"A/B camera lens drifted: {cam.data.lens}")
    if abs(cam.data.shift_y - 0.075) > 1e-6:
        raise RuntimeError(f"A/B camera shift drifted: {cam.data.shift_y}")

    print("A/B camera contract OK: location, 40mm lens and shift are identical to v0.3-r1")


def save_review_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    # Preserve the editable/material scene and a GLB before the clay override.
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

    print(f"Saved editable v0.3 r1.1 source: {BLEND_PATH}")
    print(f"Exported v0.3 r1.1 massing GLB: {GLB_PATH}")
    print(f"Rendered v0.3 r1.1 clay review: {RENDER_PATH}")


def main():
    r1.build_scene()
    refine_form_v03_r11()
    assert_ab_camera_contract()
    save_review_outputs()
    print("Dubai Luxury Villa AI v0.3 r1.1 — form refinement clay review generated")


if __name__ == "__main__":
    main()
