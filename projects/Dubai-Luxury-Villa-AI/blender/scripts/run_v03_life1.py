import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
L2_SOURCE = HERE / "run_v03_l2.py"

spec = importlib.util.spec_from_file_location("villa_v03_l2", L2_SOURCE)
l2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(l2)
m1 = l2.m1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-life1.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-life1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-life1.glb"


def simple_material(name, color, roughness=0.75, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    return mat


def apply_material(obj, material):
    if not obj or obj.type != "MESH" or material is None:
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def first_material_containing(token):
    token = token.lower()
    for mat in bpy.data.materials:
        if token in mat.name.lower():
            return mat
    return None


def curate_life_stage():
    """Turn on a restrained first Life pass without changing the frozen gates.

    We intentionally reveal only a small subset of already-authored landscape and
    interior objects. The goal is hospitality scale and desert-luxury context, not
    decorative density.
    """
    reveal_prefixes = (
        "olive_left",
        "olive_right",
        "grass_left_a",
        "grass_left_b",
        "grass_right_a",
        "grass_right_b",
        "living_sofa_main",
        "living_sofa_side",
        "living_table",
        "living_rug",
        "dining_table",
        "dining_chair_",
        "curtain_",
        "pendant_",
    )

    revealed = []
    for obj in bpy.data.objects:
        lower = obj.name.lower()
        if any(lower.startswith(prefix) for prefix in reveal_prefixes):
            obj.hide_render = False
            obj.hide_viewport = False
            revealed.append(obj.name)

    # Quiet desert palette: muted silvery olive + dry architectural grasses.
    olive_leaf = simple_material("Life1_OliveLeaf", (0.095, 0.135, 0.065), roughness=0.84)
    dry_grass = simple_material("Life1_DryGrass", (0.27, 0.285, 0.13), roughness=0.88)
    fabric = simple_material("Life1_WarmFabric", (0.46, 0.405, 0.335), roughness=0.90)
    rug = simple_material("Life1_QuietRug", (0.25, 0.205, 0.165), roughness=0.94)
    trunk = simple_material("Life1_OliveTrunk", (0.105, 0.065, 0.038), roughness=0.92)

    walnut = first_material_containing("walnut") or first_material_containing("timber")
    limestone = bpy.data.materials.get("M4_OrganicWarmLimestone") or first_material_containing("limestone")

    for obj in bpy.data.objects:
        if obj.hide_render or obj.type != "MESH":
            continue
        lower = obj.name.lower()

        if lower.startswith(("olive_left_crown", "olive_right_crown")):
            apply_material(obj, olive_leaf)
        elif lower.startswith(("olive_left_trunk", "olive_right_trunk")):
            apply_material(obj, trunk)
        elif lower.startswith(("grass_left_", "grass_right_")):
            apply_material(obj, dry_grass)
        elif lower.startswith(("living_sofa", "dining_chair_", "curtain_")):
            apply_material(obj, fabric)
        elif lower.startswith("living_rug"):
            apply_material(obj, rug)
        elif lower.startswith("dining_table") and walnut:
            apply_material(obj, walnut)
        elif lower.startswith("living_table") and limestone:
            apply_material(obj, limestone)

    print(f"Life1 revealed {len(revealed)} curated objects")
    for name in sorted(revealed):
        print(f"  LIFE1: {name}")


def build_scene():
    # Rebuild exact frozen Form + Material + L2 Light baseline first.
    l2.build_scene()
    curate_life_stage()


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

    print(f"Rendered v0.3 Life1 study: {RENDER_PATH}")
    print(f"Saved v0.3 Life1 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 Life1 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 Life1 — curated landscape/interior study generated")


if __name__ == "__main__":
    main()
