import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
LIFE1_SOURCE = HERE / "run_v03_life1.py"

spec = importlib.util.spec_from_file_location("villa_v03_life1", LIFE1_SOURCE)
life1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(life1)

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-life2.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-life2.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-life2.glb"


def numeric_suffix(name):
    try:
        return int(name.rsplit("_", 1)[-1])
    except Exception:
        return 0


def set_visible(obj, value=True):
    obj.hide_render = not value
    obj.hide_viewport = not value


def curate_current_desert_landscape():
    """Reveal the current v0.3 desert assets, not the obsolete Life1 prefixes.

    The architecture, M4 material baseline, L2 light rig and hero camera are not
    touched. Only Life-stage objects are revealed/re-toned.
    """
    agave_a = life1.simple_material("Life2_AgaveGreyGreen_A", (0.105, 0.175, 0.135), roughness=0.80)
    agave_b = life1.simple_material("Life2_AgaveGreyGreen_B", (0.135, 0.205, 0.155), roughness=0.82)
    agave_far = life1.simple_material("Life2_AgaveFar", (0.115, 0.155, 0.115), roughness=0.86)
    grass_a = life1.simple_material("Life2_DryRibbon_A", (0.315, 0.275, 0.135), roughness=0.91)
    grass_b = life1.simple_material("Life2_DryRibbon_B", (0.245, 0.225, 0.115), roughness=0.93)

    reveal_prefixes = (
        "agave_left_r6_",
        "agave_right_r6_",
        "agave_far_r6_",
        "ribbon_left_r7_",
        "ribbon_right_r7_",
    )
    keep_hidden_prefixes = (
        "ribbon_far_r7_",
    )

    revealed = []
    hidden = []

    for obj in bpy.data.objects:
        lower = obj.name.lower()

        if any(lower.startswith(prefix) for prefix in keep_hidden_prefixes):
            set_visible(obj, False)
            hidden.append(obj.name)
            continue

        if not any(lower.startswith(prefix) for prefix in reveal_prefixes):
            continue

        set_visible(obj, True)
        revealed.append(obj.name)

        if obj.type != "MESH":
            continue

        idx = numeric_suffix(lower)
        if lower.startswith("agave_far_r6_"):
            life1.apply_material(obj, agave_far)
        elif lower.startswith(("agave_left_r6_", "agave_right_r6_")):
            life1.apply_material(obj, agave_a if idx % 2 == 0 else agave_b)
        elif lower.startswith(("ribbon_left_r7_", "ribbon_right_r7_")):
            # Two quiet straw/olive tones prevent a single flat colour carpet.
            life1.apply_material(obj, grass_a if idx % 3 else grass_b)

    # Life1's six identical dining chairs are useful as scale but too repetitive.
    # Keep four and remove two from the hero render without deleting geometry.
    for name in ("dining_chair_04", "dining_chair_05"):
        obj = bpy.data.objects.get(name)
        if obj:
            set_visible(obj, False)

    # Make the remaining interior fabric quieter/lighter so it does not become a
    # brown block behind the smoke-blue glazing.
    quiet_fabric = life1.simple_material("Life2_QuietWarmFabric", (0.56, 0.515, 0.445), roughness=0.92)
    for obj in bpy.data.objects:
        lower = obj.name.lower()
        if obj.hide_render or obj.type != "MESH":
            continue
        if lower.startswith(("living_sofa", "dining_chair_")):
            life1.apply_material(obj, quiet_fabric)

    print(f"Life2 revealed {len(revealed)} current desert landscape objects")
    print(f"Life2 kept {len(hidden)} far ribbon objects hidden for hierarchy")


def build_scene():
    # Life1 reconstructs the exact frozen Form + Material + L2 Light baseline and
    # its restrained interior cues. Life2 adds only the current landscape layer.
    life1.build_scene()
    curate_current_desert_landscape()


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

    print(f"Rendered v0.3 Life2 study: {RENDER_PATH}")
    print(f"Saved v0.3 Life2 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 Life2 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 Life2 — current desert landscape study generated")


if __name__ == "__main__":
    main()
