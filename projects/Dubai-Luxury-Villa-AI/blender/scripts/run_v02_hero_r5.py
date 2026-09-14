import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R4_SOURCE = HERE / "run_v02_hero_r4.py"
PROJECT_ROOT = HERE.parents[1]
ASSET_DIR = PROJECT_ROOT / "assets" / "third-party" / "polyhaven"

spec = importlib.util.spec_from_file_location("villa_v02_r4", R4_SOURCE)
r4 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r4)
r3 = r4.r3
r2 = r4.r2
base = r4.base


def set_if_present(obj, name, value):
    if hasattr(obj, name):
        try:
            setattr(obj, name, value)
            return True
        except Exception:
            return False
    return False


def set_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def load_image(filename, non_color=False):
    path = ASSET_DIR / filename
    if not path.is_file():
        raise FileNotFoundError(f"Missing runtime visual asset: {path}")
    image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        try:
            image.colorspace_settings.name = "Non-Color"
        except Exception:
            pass
    return image


def build_pbr_material(name, diffuse_file, normal_file, rough_file, scale=(1.0, 1.0, 1.0), value=1.0, saturation=1.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = scale

    diffuse = nodes.new("ShaderNodeTexImage")
    diffuse.image = load_image(diffuse_file, non_color=False)
    hue = nodes.new("ShaderNodeHueSaturation")
    hue.inputs["Saturation"].default_value = saturation
    hue.inputs["Value"].default_value = value

    rough = nodes.new("ShaderNodeTexImage")
    rough.image = load_image(rough_file, non_color=True)

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.image = load_image(normal_file, non_color=True)
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.42

    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], diffuse.inputs["Vector"])
    links.new(mapping.outputs["Vector"], rough.inputs["Vector"])
    links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
    links.new(diffuse.outputs["Color"], hue.inputs["Color"])
    links.new(hue.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    return mat


def apply_material(obj, mat):
    if not obj or obj.type != "MESH":
        return
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def apply_real_pbr_r5():
    mineral = build_pbr_material(
        "MineralFacadePBR_R5",
        "beige_wall_001_diff_1k.jpg",
        "beige_wall_001_nor_gl_1k.jpg",
        "beige_wall_001_rough_1k.jpg",
        scale=(2.1, 2.1, 2.1),
        value=1.05,
        saturation=0.72,
    )
    stone = build_pbr_material(
        "WarmStonePBR_R5",
        "beige_wall_001_diff_1k.jpg",
        "beige_wall_001_nor_gl_1k.jpg",
        "beige_wall_001_rough_1k.jpg",
        scale=(3.2, 3.2, 3.2),
        value=0.92,
        saturation=0.88,
    )
    timber = build_pbr_material(
        "TimberCladdingPBR_R5",
        "synthetic_wood_diff_1k.jpg",
        "synthetic_wood_nor_gl_1k.jpg",
        "synthetic_wood_rough_1k.jpg",
        scale=(1.45, 1.45, 1.45),
        value=0.68,
        saturation=0.78,
    )

    stone_names = {
        "ground_left_stone_core",
        "upper_stone_spine",
        "ground_floor_slab",
        "upper_floor_slab",
        "site_plinth",
        "pool_coping_left",
        "pool_coping_right",
        "pool_coping_near",
    }
    mineral_names = {
        "ground_right_private_core",
        "ground_back_wall",
        "upper_private_volume",
        "rear_boundary_r4",
        "left_boundary_r4",
    }

    for obj in bpy.data.objects:
        if obj.name in stone_names:
            apply_material(obj, stone)
        elif obj.name in mineral_names:
            apply_material(obj, mineral)
        elif (
            "timber" in obj.name.lower()
            or "entry_portal" in obj.name.lower()
            or obj.name == "entry_door"
            or obj.name == "signature_timber_soffit"
        ):
            apply_material(obj, timber)


def configure_hdri_world_r5():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False

    eevee = getattr(scene, "eevee", None)
    if eevee:
        set_if_present(eevee, "taa_render_samples", 128)
        set_if_present(eevee, "use_gtao", True)
        set_if_present(eevee, "gtao_distance", 3.2)
        set_if_present(eevee, "gtao_factor", 1.15)
        set_if_present(eevee, "use_soft_shadows", True)
        set_if_present(eevee, "use_ssr", True)
        set_if_present(eevee, "use_ssr_refraction", True)
        set_if_present(eevee, "ssr_thickness", 0.16)
        set_if_present(eevee, "ssr_quality", 0.9)

    view = scene.view_settings
    set_if_present(view, "exposure", 0.05)
    set_if_present(view, "gamma", 1.0)
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Medium Low Contrast"):
        try:
            view.look = look
            break
        except Exception:
            continue

    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    env = nodes.new("ShaderNodeTexEnvironment")
    env.image = load_image("toposcope_sunset_2k.exr", non_color=False)
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value[2] = math.radians(118)
    bg.inputs["Strength"].default_value = 0.50

    links.new(coord.outputs["Normal"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    links.new(env.outputs["Color"], bg.inputs["Color"])
    links.new(bg.outputs["Background"], out.inputs["Surface"])


def make_pool_material_r5():
    mat = bpy.data.materials.get("PoolWaterR5") or bpy.data.materials.new(name="PoolWaterR5")
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.010, 0.11, 0.15, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.11
    bsdf.inputs["Metallic"].default_value = 0.18
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.04)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.56)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.333

    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.0
    noise.inputs["Detail"].default_value = 2.2
    noise.inputs["Roughness"].default_value = 0.52
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 2.6, 1.0)
    coord = nodes.new("ShaderNodeTexCoord")
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.075
    bump.inputs["Distance"].default_value = 0.025

    links.new(coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def refine_pool_r5():
    water = bpy.data.objects.get("pool_water")
    if water:
        apply_material(water, make_pool_material_r5())
        water.location.z = 0.145

    floor = bpy.data.objects.get("pool_floor_r3")
    if floor:
        floor_mat = r4.make_simple_material("PoolFloorR5", (0.035, 0.14, 0.16), roughness=0.54)
        apply_material(floor, floor_mat)


def delete_tokens(tokens):
    for obj in list(bpy.data.objects):
        lower = obj.name.lower()
        if any(token in lower for token in tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def make_cluster_shrub(prefix, location, scale=1.0):
    leaf = r4.make_simple_material("LandscapeLeafR5", (0.055, 0.16, 0.06), roughness=0.72)
    x, y, z = location
    parts = [
        (-0.55, -0.08, 0.20, 0.62, 0.45, 0.38),
        (-0.12, 0.12, 0.30, 0.74, 0.52, 0.48),
        (0.42, -0.06, 0.22, 0.58, 0.43, 0.36),
        (0.08, -0.36, 0.18, 0.52, 0.38, 0.32),
        (0.48, 0.30, 0.18, 0.46, 0.34, 0.30),
    ]
    for i, (ox, oy, oz, sx, sy, sz) in enumerate(parts):
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=2,
            radius=1.0,
            location=(x + ox * scale, y + oy * scale, z + oz * scale),
        )
        obj = bpy.context.object
        obj.name = f"{prefix}_{i:02d}"
        obj.scale = (sx * scale, sy * scale, sz * scale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.rotation_euler[2] = (i * 0.71) % math.tau
        obj.data.materials.append(leaf)
        r3.smooth_object(obj)


def landscape_r5():
    delete_tokens(("palm_r3", "shrub_r3", "context_shrub_r4"))

    make_cluster_shrub("planting_left_r5", (-8.3, 6.2, 0.47), 1.10)
    make_cluster_shrub("planting_right_r5", (7.8, 5.0, 0.47), 0.95)
    make_cluster_shrub("planting_far_right_r5", (10.2, 5.7, 0.44), 0.78)

    # Restrained ornamental grasses create finer silhouettes near the terrace.
    base.add_grass_cluster("grass_r5_left", (-6.2, 6.15, 0.42), count=14, scale=1.05)
    base.add_grass_cluster("grass_r5_right", (6.6, 5.2, 0.42), count=13, scale=0.95)


def lighting_r5():
    r4.delete_lights()

    bpy.ops.object.light_add(type="SUN", location=(0.0, 0.0, 12.0))
    sun = bpy.context.object
    sun.name = "sunset_key_r5"
    sun.data.energy = 1.05
    sun.data.color = (1.0, 0.62, 0.42)
    sun.rotation_euler = (math.radians(72), 0.0, math.radians(-49))

    r2.add_soft_area(
        "cool_fill_r5", (15.0, 17.0, 11.0), 430, (0.38, 0.52, 0.78), 14.0, (0.0, 3.5, 3.0)
    )
    r2.add_soft_area(
        "front_fill_r5", (2.0, 19.0, 6.5), 210, (0.68, 0.76, 0.95), 11.0, (0.0, 3.0, 2.7)
    )
    r2.add_soft_area(
        "living_warm_r5", (-0.5, 1.0, 2.3), 260, (1.0, 0.42, 0.18), 5.0, (-0.2, 4.0, 1.5)
    )
    r2.add_soft_area(
        "upper_warm_r5", (1.0, 1.1, 5.2), 195, (1.0, 0.40, 0.16), 4.2, (1.0, 3.1, 5.0)
    )
    r2.add_soft_area(
        "water_soft_r5", (1.0, 10.5, 2.8), 105, (0.20, 0.40, 0.56), 8.0, (-0.9, 9.0, 0.15)
    )


def camera_r5():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (25.5, 27.5, 3.45)
    cam.data.lens = 55
    cam.data.shift_y = 0.025
    target = mathutils.Vector((-0.15, 4.45, 2.35))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def main():
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

    configure_hdri_world_r5()
    apply_real_pbr_r5()
    refine_pool_r5()
    landscape_r5()
    camera_r5()
    lighting_r5()

    # Preserve runtime-downloaded PBR/HDRI data inside the generated Blender source.
    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r5 generated")


if __name__ == "__main__":
    main()
