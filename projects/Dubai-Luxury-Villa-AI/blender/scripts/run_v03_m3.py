import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
M2_SOURCE = HERE / "run_v03_m2.py"

spec = importlib.util.spec_from_file_location("villa_v03_m2", M2_SOURCE)
m2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m2)
m1 = m2.m1
r5 = m2.r5

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-m3-material.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m3.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m3.glb"


def set_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def make_travertine_m3():
    """Warm large-scale stone with subtle horizontal tonal structure.

    The range is intentionally narrow: the goal is mineral depth at hero distance,
    not decorative stripes or noisy texture wallpaper.
    """
    mat = bpy.data.materials.get("M3_WarmTravertine") or bpy.data.materials.new(name="M3_WarmTravertine")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.61

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 1.0, 3.4)

    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = 1.55
    wave.inputs["Distortion"].default_value = 2.0
    wave.inputs["Detail"].default_value = 2.0
    wave.inputs["Detail Scale"].default_value = 1.2

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.28
    ramp.color_ramp.elements[0].color = (0.34, 0.20, 0.105, 1.0)
    ramp.color_ramp.elements[-1].position = 0.76
    ramp.color_ramp.elements[-1].color = (0.58, 0.39, 0.205, 1.0)

    normal_tex = nt.nodes.new("ShaderNodeTexImage")
    normal_tex.image = r5.load_image("beige_wall_001_nor_gl_1k.jpg", non_color=True)
    normal_map = nt.nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.16

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    nt.links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    nt.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def make_ivory_plaster_m3():
    return m2.micro_material(
        "M3_IvoryPlaster",
        (0.72, 0.64, 0.53),
        0.76,
        "beige_wall_001_nor_gl_1k.jpg",
        normal_strength=0.075,
        normal_scale=(6.3, 6.3, 6.3),
    )


def make_deck_m3():
    return m2.micro_material(
        "M3_DeckStone",
        (0.27, 0.205, 0.15),
        0.80,
        "beige_wall_001_nor_gl_1k.jpg",
        normal_strength=0.10,
        normal_scale=(4.6, 4.6, 4.6),
    )


def make_glass_m3():
    mat = bpy.data.materials.get("M3_SmokeArchitecturalGlass") or bpy.data.materials.new(name="M3_SmokeArchitecturalGlass")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.16, 0.235, 0.255, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.13
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.52)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.50)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.48
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = 0.82
    try:
        mat.use_screen_refraction = True
    except Exception:
        pass
    try:
        mat.blend_method = "BLEND"
    except Exception:
        pass
    return mat


def make_water_m3():
    mat = bpy.data.materials.get("M3_MineralAquaWater") or bpy.data.materials.new(name="M3_MineralAquaWater")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.012, 0.17, 0.205, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.065
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.20)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.58)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.333

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (0.65, 3.8, 1.0)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 4.8
    noise.inputs["Detail"].default_value = 2.6
    noise.inputs["Roughness"].default_value = 0.48
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.085
    bump.inputs["Distance"].default_value = 0.022

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_m3_materials():
    walnut = m2.make_walnut_m2()
    # Lift the wood one final increment without pushing it orange.
    if walnut.use_nodes:
        for node in walnut.node_tree.nodes:
            if node.bl_idname == "ShaderNodeHueSaturation":
                node.inputs["Value"].default_value = 0.94
                node.inputs["Saturation"].default_value = 0.56

    return {
        "limestone": make_travertine_m3(),
        "plaster": make_ivory_plaster_m3(),
        "walnut": walnut,
        "graphite": m1.simple_material("M3_GraphiteMetal", (0.047, 0.052, 0.057), roughness=0.36, metallic=0.72),
        "deck": make_deck_m3(),
        "soil": m1.simple_material("M3_Soil", (0.072, 0.048, 0.030), roughness=0.93),
        "glass": make_glass_m3(),
        "water": make_water_m3(),
    }


def build_scene():
    # M2 already reconstructs the exact frozen v0.3-r1.2 geometry and locked camera.
    m2.build_scene()
    mats = build_m3_materials()
    m1.assign_m1_materials(mats)

    # Keep M1/M2 neutral lighting, only lower review exposure enough to reveal
    # value separation honestly. This is not the cinematic Light stage.
    scene = bpy.context.scene
    try:
        scene.view_settings.exposure = -0.12
    except Exception:
        pass


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

    print(f"Rendered v0.3 M3 material gate study: {RENDER_PATH}")
    print(f"Saved v0.3 M3 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 M3 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 M3 — final material gate study generated")


if __name__ == "__main__":
    main()
