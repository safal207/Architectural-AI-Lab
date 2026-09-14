import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R6_SOURCE = HERE / "run_v02_hero_r6.py"

spec = importlib.util.spec_from_file_location("villa_v02_r6", R6_SOURCE)
r6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r6)
r5 = r6.r5
r4 = r6.r4
r3 = r6.r3
r2 = r6.r2
base = r6.base


def configure_world_split_r7():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100

    try:
        scene.view_settings.exposure = 0.08
    except Exception:
        pass

    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputWorld")
    mix = nodes.new("ShaderNodeMixShader")
    light_path = nodes.new("ShaderNodeLightPath")

    # Real HDRI remains the lighting/reflection source.
    env_bg = nodes.new("ShaderNodeBackground")
    env_bg.inputs["Strength"].default_value = 0.48
    env = nodes.new("ShaderNodeTexEnvironment")
    env.image = r5.load_image("toposcope_sunset_2k.exr", non_color=False)
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value[2] = math.radians(118)

    # Camera sees a clean low-sun sky rather than a non-Dubai mountain horizon.
    camera_bg = nodes.new("ShaderNodeBackground")
    camera_bg.inputs["Strength"].default_value = 0.48
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(0.7)
    sky.sun_rotation = math.radians(225)
    sky.altitude = 0.15
    sky.air_density = 1.05
    sky.dust_density = 4.2
    sky.ozone_density = 1.0

    links.new(coord.outputs["Normal"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    links.new(env.outputs["Color"], env_bg.inputs["Color"])
    links.new(sky.outputs["Color"], camera_bg.inputs["Color"])
    links.new(light_path.outputs["Is Camera Ray"], mix.inputs[0])
    links.new(env_bg.outputs["Background"], mix.inputs[1])
    links.new(camera_bg.outputs["Background"], mix.inputs[2])
    links.new(mix.outputs["Shader"], out.inputs["Surface"])


def delete_tokens(tokens):
    for obj in list(bpy.data.objects):
        lower = obj.name.lower()
        if any(token in lower for token in tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def grass_blade(name, origin, angle, height, width, lean, material):
    ox, oy, oz = origin
    dx, dy = math.cos(angle), math.sin(angle)
    px, py = -dy, dx
    segments = 5
    verts = []
    faces = []

    for i in range(segments + 1):
        t = i / segments
        half = width * (1.0 - 0.82 * t) * 0.5
        sway = lean * (t ** 1.65)
        cx = ox + dx * sway
        cy = oy + dy * sway
        cz = oz + height * t
        verts.append((cx + px * half, cy + py * half, cz))
        verts.append((cx - px * half, cy - py * half, cz))
        if i < segments:
            j = i * 2
            faces.append((j, j + 1, j + 3, j + 2))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    solid = obj.modifiers.new("blade_thickness", "SOLIDIFY")
    solid.thickness = 0.008
    return obj


def ribbon_grass_cluster(prefix, location, count=28, scale=1.0):
    mat = r4.make_simple_material("RibbonGrassR7", (0.075, 0.18, 0.065), roughness=0.72)
    x, y, z = location
    for i in range(count):
        angle = (i / count) * math.tau + (i % 5) * 0.11
        ring = 0.10 + 0.05 * (i % 4)
        gx = x + math.cos(angle) * ring * scale
        gy = y + math.sin(angle) * ring * scale
        height = (0.48 + 0.32 * ((i * 3) % 7) / 6.0) * scale
        width = (0.035 + 0.016 * (i % 3)) * scale
        lean = (0.12 + 0.12 * (i % 4) / 3.0) * scale
        grass_blade(f"{prefix}_{i:02d}", (gx, gy, z), angle, height, width, lean, mat)


def landscape_r7():
    # Remove every earlier cylinder-grass generation while keeping the agaves.
    delete_tokens(("grass_left", "grass_right", "fine_grass", "grass_r5"))
    ribbon_grass_cluster("ribbon_left_r7", (-6.55, 6.18, 0.57), count=34, scale=1.0)
    ribbon_grass_cluster("ribbon_right_r7", (6.55, 5.08, 0.57), count=30, scale=0.92)
    ribbon_grass_cluster("ribbon_far_r7", (9.05, 5.40, 0.56), count=22, scale=0.72)


def pool_r7():
    # Point sources in r6 produced circular CG hotspots on the water.
    delete_tokens(("pool_underwater_r6",))

    water = bpy.data.objects.get("pool_water")
    if water and water.data.materials:
        mat = water.data.materials[0]
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (0.012, 0.145, 0.19, 1.0)
                bsdf.inputs["Roughness"].default_value = 0.055
                bsdf.inputs["Metallic"].default_value = 0.08
                r6.set_input(bsdf, ("Transmission Weight", "Transmission"), 0.025)
                r6.set_input(bsdf, ("Specular IOR Level", "Specular"), 0.58)

    soft = bpy.data.objects.get("water_soft_r5")
    if soft and soft.type == "LIGHT":
        soft.data.energy = 135
        soft.data.color = (0.18, 0.42, 0.58)
        if hasattr(soft.data, "size"):
            soft.data.size = 9.5


def camera_r7():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (25.8, 28.4, 3.35)
    cam.data.lens = 55
    cam.data.shift_y = 0.018
    target = mathutils.Vector((-0.65, 4.45, 2.35))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def foreground_r7():
    # Reduce the heavy black edge from the large site context.
    ground = bpy.data.objects.get("context_ground_r4")
    if ground and ground.data.materials:
        mat = ground.data.materials[0]
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (0.38, 0.32, 0.25, 1.0)
                bsdf.inputs["Roughness"].default_value = 0.76

    garden = bpy.data.objects.get("garden_field")
    if garden and garden.data.materials:
        mat = garden.data.materials[0]
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (0.055, 0.085, 0.050, 1.0)
                bsdf.inputs["Roughness"].default_value = 0.86


def lighting_r7():
    # Keep r6/r5 system but soften the directional key for a more photographic dusk balance.
    sun = bpy.data.objects.get("sunset_key_r5")
    if sun and sun.type == "LIGHT":
        sun.data.energy = 0.88
        sun.data.color = (1.0, 0.66, 0.48)

    front = bpy.data.objects.get("front_fill_r5")
    if front and front.type == "LIGHT":
        front.data.energy = 245

    living = bpy.data.objects.get("living_warm_r5")
    if living and living.type == "LIGHT":
        living.data.energy = 330

    upper = bpy.data.objects.get("upper_warm_r5")
    if upper and upper.type == "LIGHT":
        upper.data.energy = 235


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

    configure_world_split_r7()
    landscape_r7()
    pool_r7()
    camera_r7()
    foreground_r7()
    lighting_r7()

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r7 generated")


if __name__ == "__main__":
    main()
