import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
M1_SOURCE = HERE / "run_v03_m1.py"

spec = importlib.util.spec_from_file_location("villa_v03_m1", M1_SOURCE)
m1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m1)
r12 = m1.r12
r11 = m1.r11
r1 = m1.r1
r5 = m1.r5
base = m1.base

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-m2-material.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m2.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m2.glb"


def set_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def micro_material(name, base_color, roughness, normal_file, normal_strength=0.18, normal_scale=(3.0, 3.0, 3.0)):
    """Controlled luxury material: fixed palette + real micro-normal map.

    M1 proved that using the diffuse texture as the colour source pulled the villa
    too grey. M2 keeps real surface relief but locks the architectural palette.
    """
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = normal_scale
    normal_tex = nt.nodes.new("ShaderNodeTexImage")
    normal_tex.image = r5.load_image(normal_file, non_color=True)
    normal = nt.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    nt.links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    nt.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_walnut_m2():
    mat = r5.build_pbr_material(
        "M2_WalnutTimber",
        "synthetic_wood_diff_1k.jpg",
        "synthetic_wood_nor_gl_1k.jpg",
        "synthetic_wood_rough_1k.jpg",
        scale=(1.10, 2.15, 1.10),
        value=0.86,
        saturation=0.62,
    )
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.bl_idname == "ShaderNodeNormalMap":
                node.inputs["Strength"].default_value = 0.24
    return mat


def make_glass_m2():
    mat = bpy.data.materials.get("M2_ArchitecturalGlass") or bpy.data.materials.new(name="M2_ArchitecturalGlass")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.14, 0.20, 0.22, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.10
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.68)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.50)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.48
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = 0.94
    try:
        mat.use_screen_refraction = True
    except Exception:
        pass
    try:
        mat.blend_method = "BLEND"
    except Exception:
        pass
    return mat


def make_water_m2():
    mat = bpy.data.materials.get("M2_PoolWater") or bpy.data.materials.new(name="M2_PoolWater")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.025, 0.205, 0.235, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.07
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.30)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.56)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.333

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (0.70, 3.5, 1.0)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.0
    noise.inputs["Detail"].default_value = 2.4
    noise.inputs["Roughness"].default_value = 0.50
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.075
    bump.inputs["Distance"].default_value = 0.025

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_m2_materials():
    limestone = micro_material(
        "M2_WarmLimestone",
        (0.58, 0.46, 0.33),
        0.58,
        "beige_wall_001_nor_gl_1k.jpg",
        normal_strength=0.20,
        normal_scale=(3.8, 3.8, 3.8),
    )
    plaster = micro_material(
        "M2_IvoryMineralPlaster",
        (0.73, 0.68, 0.60),
        0.72,
        "beige_wall_001_nor_gl_1k.jpg",
        normal_strength=0.10,
        normal_scale=(5.8, 5.8, 5.8),
    )
    deck = micro_material(
        "M2_WarmDeckStone",
        (0.38, 0.31, 0.24),
        0.76,
        "beige_wall_001_nor_gl_1k.jpg",
        normal_strength=0.12,
        normal_scale=(4.2, 4.2, 4.2),
    )
    walnut = make_walnut_m2()
    graphite = m1.simple_material("M2_GraphiteMetal", (0.055, 0.060, 0.064), roughness=0.34, metallic=0.72)
    soil = m1.simple_material("M2_Soil", (0.08, 0.055, 0.035), roughness=0.92)
    glass = make_glass_m2()
    water = make_water_m2()
    return {
        "limestone": limestone,
        "plaster": plaster,
        "walnut": walnut,
        "graphite": graphite,
        "deck": deck,
        "soil": soil,
        "glass": glass,
        "water": water,
    }


def build_scene():
    # Exact same geometry/camera contract as M1; only materials change.
    r1.build_scene()
    r11.refine_form_v03_r11()
    r12.refine_form_v03_r12()
    r11.assert_ab_camera_contract()

    mats = build_m2_materials()
    m1.assign_m1_materials(mats)
    m1.hide_life_stage_objects()
    m1.material_review_lighting()


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

    print(f"Rendered v0.3 M2 material study: {RENDER_PATH}")
    print(f"Saved v0.3 M2 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 M2 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 M2 — warm quiet luxury material refinement generated")


if __name__ == "__main__":
    main()
