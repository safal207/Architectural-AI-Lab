import importlib.util
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R9_SOURCE = HERE / "run_v02_hero_r9.py"

spec = importlib.util.spec_from_file_location("villa_v02_r9", R9_SOURCE)
r9 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r9)
r8 = r9.r8
r7 = r9.r7
r6 = r9.r6
r5 = r9.r5
r4 = r9.r4
r3 = r9.r3
r2 = r9.r2
base = r9.base

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.3-r1-clay.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.3-r1-massing.glb"


def set_box(name, dimensions=None, location=None):
    obj = bpy.data.objects.get(name)
    if not obj:
        print(f"Warning: missing object {name}")
        return None
    if dimensions is not None:
        obj.dimensions = dimensions
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.select_set(False)
    if location is not None:
        obj.location = location
    return obj


def delete_prefix(prefixes):
    if isinstance(prefixes, str):
        prefixes = (prefixes,)
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def refine_architecture_v03_r1():
    """P0 massing pass: fewer gestures, deeper outdoor room, cleaner pool axis."""

    # 1) Ground pavilion: open the pool frontage and make the private core quieter.
    set_box(
        "ground_right_private_core",
        dimensions=(2.20, 6.65, 3.12),
        location=(7.62, -0.45, 1.57),
    )
    set_box(
        "ground_front_header",
        dimensions=(11.55, 0.42, 0.30),
        location=(0.05, 4.22, 3.08),
    )
    set_box(
        "ground_front_reveal",
        dimensions=(11.70, 0.48, 0.18),
        location=(0.05, 3.92, 0.33),
    )

    # 2) Terrace becomes a real outdoor room rather than a thin strip.
    set_box(
        "terrace_deck",
        dimensions=(22.80, 7.75, 0.20),
        location=(0.75, 6.72, 0.09),
    )

    # 3) Upper floor: lighter asymmetry with one stone anchor and one calm glass/private volume.
    set_box(
        "upper_floor_slab",
        dimensions=(14.70, 7.45, 0.20),
        location=(1.72, 0.02, 3.46),
    )
    set_box(
        "upper_private_volume",
        dimensions=(6.95, 5.55, 2.80),
        location=(3.18, 0.26, 4.92),
    )
    set_box(
        "upper_stone_spine",
        dimensions=(2.85, 6.80, 3.08),
        location=(-3.92, -0.03, 5.00),
    )
    set_box(
        "stone_spine_front_blade_r9",
        dimensions=(0.38, 2.35, 3.00),
        location=(-5.02, 3.30, 5.00),
    )

    # 4) One confident horizontal roof/cantilever gesture.
    set_box(
        "signature_cantilever",
        dimensions=(12.35, 3.80, 0.22),
        location=(2.90, 4.58, 6.60),
    )
    set_box(
        "roof_plane",
        dimensions=(15.75, 8.55, 0.20),
        location=(1.68, -0.03, 6.70),
    )
    set_box(
        "signature_timber_soffit",
        dimensions=(11.20, 3.10, 0.045),
        location=(2.90, 4.52, 6.45),
    )
    set_box(
        "signature_dark_edge",
        dimensions=(12.40, 0.09, 0.15),
        location=(2.90, 6.49, 6.60),
    )
    set_box(
        "cantilever_linear_light_r6",
        dimensions=(9.80, 0.028, 0.024),
        location=(2.70, 5.95, 6.40),
    )

    # 5) Pool: longer, calmer and visually aligned with the living pavilion.
    set_box(
        "pool_basin",
        dimensions=(13.85, 4.30, 0.40),
        location=(-0.55, 9.25, 0.05),
    )
    set_box(
        "pool_water",
        dimensions=(13.42, 3.86, 0.10),
        location=(-0.55, 9.25, 0.30),
    )
    set_box(
        "pool_shallow_shelf",
        dimensions=(2.75, 3.35, 0.14),
        location=(4.85, 9.25, 0.29),
    )
    set_box(
        "infinity_lip",
        dimensions=(13.88, 0.14, 0.18),
        location=(-0.55, 11.40, 0.18),
    )

    # 6) Remove lifestyle clutter from the massing review. It returns in later Life passes.
    delete_prefix((
        "sunken_",
        "upper_planter_r9",
        "upper_planter_soil_r9",
        "upper_ribbon_r9",
    ))

    # 7) Two restrained architectural datum lines reinforce precision without ornament.
    metal = base.MATS["CharcoalMetal"]
    base.cube(
        "living_shadow_datum_v03",
        (11.35, 0.045, 0.045),
        (0.05, 4.27, 2.83),
        metal,
        0.008,
    )
    base.cube(
        "pool_edge_shadow_v03",
        (13.65, 0.055, 0.055),
        (-0.55, 7.08, 0.22),
        metal,
        0.008,
    )

    # 8) Slightly broader arrival canopy: a single calm portal gesture.
    timber = bpy.data.materials.get("TimberCladdingPBR_R5") or base.MATS["NaturalTimber"]
    base.cube(
        "arrival_canopy_v03",
        (4.50, 2.85, 0.22),
        (-3.60, -4.35, 3.32),
        timber,
        0.035,
    )


def camera_v03_r1():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        raise RuntimeError("hero_camera_v02 missing")

    # Human-eye architectural photography rather than a high CG viewpoint.
    cam.location = (24.8, 28.6, 1.72)
    cam.data.lens = 40
    cam.data.sensor_width = 36
    cam.data.shift_y = 0.075
    cam.data.clip_start = 0.1
    cam.data.clip_end = 250.0
    target = mathutils.Vector((-0.10, 4.65, 2.30))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def neutral_review_lighting():
    # Clay review is about proportion, depth and shadow. Remove marketing mood-lighting bias.
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.hide_render = True

    bpy.ops.object.light_add(type="SUN", location=(12.0, -8.0, 18.0))
    sun = bpy.context.object
    sun.name = "v03_clay_sun"
    sun.data.energy = 2.0
    sun.data.angle = 0.14
    sun.data.color = (1.0, 0.91, 0.78)
    sun.rotation_euler = (0.83, -0.18, -0.72)

    bpy.ops.object.light_add(type="AREA", location=(5.0, 15.0, 13.0))
    fill = bpy.context.object
    fill.name = "v03_clay_fill"
    fill.data.energy = 950
    fill.data.shape = "DISK"
    fill.data.size = 12.0
    fill.data.color = (0.65, 0.75, 0.90)
    direction = mathutils.Vector((0.0, 3.5, 2.5)) - fill.location
    fill.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

    world = bpy.context.scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.12, 0.15, 0.18, 1.0)
        bg.inputs["Strength"].default_value = 0.32

    scene = bpy.context.scene
    try:
        scene.view_settings.exposure = 0.15
    except Exception:
        pass


def make_clay_material(name, color, roughness):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


def prepare_clay_review():
    clay = make_clay_material("V03Clay", (0.67, 0.62, 0.55), 0.72)
    dark = make_clay_material("V03ClayGlass", (0.085, 0.11, 0.13), 0.32)
    water = make_clay_material("V03ClayWater", (0.19, 0.31, 0.34), 0.22)

    hide_tokens = (
        "agave_",
        "ribbon_",
        "olive_",
        "grass_",
        "fine_grass_",
        "context_shrub_",
        "living_sofa",
        "living_table",
        "living_rug",
        "dining_",
        "curtain_",
        "pendant_",
        "planter_soil",
    )

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        lower = obj.name.lower()
        if any(token in lower for token in hide_tokens):
            obj.hide_render = True
            continue

        material = clay
        if "glass" in lower or "window" in lower:
            material = dark
        elif "pool_water" in lower or lower == "pool_water":
            material = water

        obj.data.materials.clear()
        obj.data.materials.append(material)


def build_scene():
    base.clear_scene()
    base.setup_materials()
    r2.setup_scene_compat()
    base.build_architecture()
    base.setup_camera_and_lighting()

    r2.refine_materials()
    r2.refine_architecture()
    r2.refine_camera_and_lighting()
    r2.refine_landscape()

    r3.refine_materials_r3()
    r3.pool_r3()
    r3.landscape_r3()

    r4.configure_eevee_archviz()
    r4.refine_materials_r4()
    r4.reduce_emitter_glare()
    r4.context_r4()

    r5.configure_hdri_world_r5()
    r5.apply_real_pbr_r5()
    r5.refine_pool_r5()
    r5.landscape_r5()
    r5.camera_r5()
    r5.lighting_r5()

    r6.architectural_detail_r6()
    r6.landscape_r6()
    r6.pool_r6()
    r6.camera_r6()
    r6.tune_lighting_r6()

    r7.configure_world_split_r7()
    r7.landscape_r7()
    r7.pool_r7()
    r7.camera_r7()
    r7.foreground_r7()
    r7.lighting_r7()

    r8.pure_sky_world_r8()
    r8.stone_pbr_r8()
    r8.camera_r8()
    r8.light_balance_r8()

    r9.rebuild_massing_r9()
    r9.camera_r9()
    r9.tune_r9()

    refine_architecture_v03_r1()
    camera_v03_r1()


def save_review_outputs():
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Preserve editable source and a review GLB before clay override.
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

    neutral_review_lighting()
    prepare_clay_review()
    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)

    print(f"Saved editable v0.3 r1 source: {BLEND_PATH}")
    print(f"Exported v0.3 r1 massing GLB: {GLB_PATH}")
    print(f"Rendered v0.3 r1 clay review: {RENDER_PATH}")


def main():
    build_scene()
    save_review_outputs()
    print("Dubai Luxury Villa AI v0.3 r1 — architectural clay review generated")


if __name__ == "__main__":
    main()
