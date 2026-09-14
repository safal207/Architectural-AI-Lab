import importlib.util
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
M3_SOURCE = HERE / "run_v03_m3.py"

spec = importlib.util.spec_from_file_location("villa_v03_m3", M3_SOURCE)
m3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m3)
m2 = m3.m2
m1 = m3.m1
r5 = m3.r5

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-m4-material.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m4.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m4.glb"


def make_organic_limestone_m4():
    """Warm mineral stone with non-repeating organic tonal variation.

    M3 proved the colour hierarchy but its visible wave bands were too procedural.
    M4 keeps the same warm range while replacing the stripes with low-amplitude noise.
    """
    mat = bpy.data.materials.get("M4_OrganicWarmLimestone") or bpy.data.materials.new(name="M4_OrganicWarmLimestone")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.62

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.35, 1.35, 1.65)

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 2.25
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.34
    noise.inputs["Distortion"].default_value = 0.16

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (0.40, 0.265, 0.145, 1.0)
    mid = ramp.color_ramp.elements.new(0.53)
    mid.color = (0.47, 0.325, 0.19, 1.0)
    ramp.color_ramp.elements[-1].position = 0.80
    ramp.color_ramp.elements[-1].color = (0.545, 0.395, 0.245, 1.0)

    normal_tex = nt.nodes.new("ShaderNodeTexImage")
    normal_tex.image = r5.load_image("beige_wall_001_nor_gl_1k.jpg", non_color=True)
    normal_map = nt.nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.14

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    nt.links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    nt.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def deepen_water(material):
    if not material or not material.use_nodes:
        return
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            node.inputs["Base Color"].default_value = (0.010, 0.145, 0.185, 1.0)
            node.inputs["Roughness"].default_value = 0.07
            break


def build_scene():
    # Reconstruct M3 exact baseline first; geometry/camera/lighting remain frozen.
    m3.build_scene()
    mats = m3.build_m3_materials()
    mats["limestone"] = make_organic_limestone_m4()
    deepen_water(mats["water"])
    m1.assign_m1_materials(mats)

    # Keep the exact neutral review exposure from M3.
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

    print(f"Rendered v0.3 M4 material gate study: {RENDER_PATH}")
    print(f"Saved v0.3 M4 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 M4 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 M4 — organic stone cleanup generated")


if __name__ == "__main__":
    main()
