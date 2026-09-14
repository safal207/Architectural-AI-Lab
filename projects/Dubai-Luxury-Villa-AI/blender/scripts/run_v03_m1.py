import importlib.util
import math
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
R12_SOURCE = HERE / "run_v03_r12.py"

spec = importlib.util.spec_from_file_location("villa_v03_r12", R12_SOURCE)
r12 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r12)
r11 = r12.r11
r1 = r12.r1
r9 = r1.r9
r8 = r1.r8
r7 = r1.r7
r6 = r1.r6
r5 = r1.r5
r4 = r1.r4
r2 = r1.r2
base = r1.base

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-m1-material.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-m1.glb"


def set_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def apply_material(obj, material):
    if not obj or obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def simple_material(name, color, roughness=0.55, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def make_glass_m1():
    mat = bpy.data.materials.get("M1_ArchitecturalGlass") or bpy.data.materials.new(name="M1_ArchitecturalGlass")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.055, 0.082, 0.095, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.085
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.62)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.52)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.48
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = 1.0
    try:
        mat.use_screen_refraction = True
    except Exception:
        pass
    return mat


def make_water_m1():
    mat = bpy.data.materials.get("M1_PoolWater") or bpy.data.materials.new(name="M1_PoolWater")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.018, 0.105, 0.125, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.055
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.52)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.58)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.333

    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (0.75, 3.2, 1.0)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.2
    noise.inputs["Detail"].default_value = 2.2
    noise.inputs["Roughness"].default_value = 0.48
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.055
    bump.inputs["Distance"].default_value = 0.022

    nt.links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_m1_materials():
    # Use the same CC0 maps as the prior verified pipeline, but tune them to the
    # v0.3 quiet-luxury palette instead of relying on generic glossy materials.
    limestone = r5.build_pbr_material(
        "M1_Limestone",
        "beige_wall_001_diff_1k.jpg",
        "beige_wall_001_nor_gl_1k.jpg",
        "beige_wall_001_rough_1k.jpg",
        scale=(3.7, 3.7, 3.7),
        value=1.12,
        saturation=0.42,
    )
    plaster = r5.build_pbr_material(
        "M1_MineralPlaster",
        "beige_wall_001_diff_1k.jpg",
        "beige_wall_001_nor_gl_1k.jpg",
        "beige_wall_001_rough_1k.jpg",
        scale=(5.2, 5.2, 5.2),
        value=1.18,
        saturation=0.18,
    )
    walnut = r5.build_pbr_material(
        "M1_WalnutTimber",
        "synthetic_wood_diff_1k.jpg",
        "synthetic_wood_nor_gl_1k.jpg",
        "synthetic_wood_rough_1k.jpg",
        scale=(1.2, 2.4, 1.2),
        value=0.72,
        saturation=0.66,
    )

    # Tune normal intensity down: premium stone/plaster should read as tactile,
    # not noisy or game-like.
    for mat, strength in ((limestone, 0.26), (plaster, 0.14), (walnut, 0.30)):
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.bl_idname == "ShaderNodeNormalMap":
                node.inputs["Strength"].default_value = strength

    graphite = simple_material("M1_GraphiteMetal", (0.035, 0.040, 0.045), roughness=0.30, metallic=0.78)
    deck = simple_material("M1_DeckStone", (0.53, 0.48, 0.41), roughness=0.66, metallic=0.0)
    soil = simple_material("M1_Soil", (0.08, 0.055, 0.035), roughness=0.92)
    glass = make_glass_m1()
    water = make_water_m1()

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


def assign_m1_materials(mats):
    stone_names = {
        "ground_left_stone_core",
        "upper_stone_spine",
        "stone_spine_front_blade_r9",
        "ground_floor_slab",
        "upper_floor_slab",
        "roof_plane",
        "signature_cantilever",
        "pool_basin",
        "left_planter",
        "right_planter",
    }
    plaster_names = {
        "ground_right_private_core",
        "ground_back_wall",
        "upper_private_volume",
    }
    deck_names = {
        "terrace_deck",
        "site_plinth",
        "pool_shallow_shelf",
    }

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        lower = obj.name.lower()

        if obj.name in stone_names or "stone_spine" in lower:
            apply_material(obj, mats["limestone"])
        elif obj.name in plaster_names:
            apply_material(obj, mats["plaster"])
        elif obj.name in deck_names:
            apply_material(obj, mats["deck"])
        elif "glass" in lower or "window" in lower:
            apply_material(obj, mats["glass"])
        elif obj.name == "pool_water" or "pool_water" in lower:
            apply_material(obj, mats["water"])
        elif (
            "timber" in lower
            or "entry_portal" in lower
            or obj.name == "entry_door"
            or obj.name == "arrival_canopy_v03"
            or "soffit" in lower
        ):
            apply_material(obj, mats["walnut"])
        elif (
            "mullion" in lower
            or "frame" in lower
            or "metal" in lower
            or "shadow" in lower
            or "dark_edge" in lower
            or "infinity_lip" in lower
            or "reveal" in lower
            or "column" in lower
        ):
            apply_material(obj, mats["graphite"])
        elif "soil" in lower:
            apply_material(obj, mats["soil"])


def hide_life_stage_objects():
    # Material review deliberately excludes lifestyle styling and vegetation.
    hide_tokens = (
        "agave_",
        "ribbon_",
        "olive_",
        "grass_",
        "fine_grass_",
        "context_shrub_",
        "planting_",
        "living_sofa",
        "living_table",
        "living_rug",
        "dining_",
        "curtain_",
        "pendant_",
    )
    for obj in bpy.data.objects:
        if any(token in obj.name.lower() for token in hide_tokens):
            obj.hide_render = True


def material_review_lighting():
    # Neutral late-afternoon setup: enough modelling to judge texture scale,
    # roughness, glass and water without using dramatic mood to disguise them.
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"

    bpy.ops.object.light_add(type="SUN", location=(8.0, -10.0, 16.0))
    sun = bpy.context.object
    sun.name = "m1_material_sun"
    sun.data.energy = 1.35
    sun.data.angle = math.radians(6.0)
    sun.data.color = (1.0, 0.88, 0.72)
    sun.rotation_euler = (math.radians(64), 0.0, math.radians(-42))

    r2.add_soft_area(
        "m1_sky_fill",
        (7.0, 15.0, 13.0),
        620,
        (0.54, 0.65, 0.82),
        13.0,
        (0.0, 3.6, 2.8),
    )
    r2.add_soft_area(
        "m1_front_fill",
        (-7.0, 17.0, 7.5),
        260,
        (0.78, 0.80, 0.82),
        10.0,
        (0.0, 3.0, 2.5),
    )

    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(9.5)
    sky.sun_rotation = math.radians(222)
    sky.altitude = 0.15
    sky.air_density = 1.0
    sky.dust_density = 3.2
    sky.ozone_density = 1.0
    bg.inputs["Strength"].default_value = 0.48
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    try:
        scene.view_settings.exposure = 0.08
    except Exception:
        pass


def build_scene():
    # Freeze the exact v0.3 r1.2 geometry that passed the FORM gate.
    r1.build_scene()
    r11.refine_form_v03_r11()
    r12.refine_form_v03_r12()
    r11.assert_ab_camera_contract()

    mats = build_m1_materials()
    assign_m1_materials(mats)
    hide_life_stage_objects()
    material_review_lighting()


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

    print(f"Rendered v0.3 M1 material study: {RENDER_PATH}")
    print(f"Saved v0.3 M1 Blender source: {BLEND_PATH}")
    print(f"Exported v0.3 M1 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.3 M1 — quiet luxury material study generated")


if __name__ == "__main__":
    main()
