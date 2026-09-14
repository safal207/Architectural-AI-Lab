import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R7_SOURCE = HERE / "run_v02_hero_r7.py"

spec = importlib.util.spec_from_file_location("villa_v02_r7", R7_SOURCE)
r7 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r7)
r6 = r7.r6
r5 = r7.r5
r4 = r7.r4
r3 = r7.r3
r2 = r7.r2
base = r7.base


def pure_sky_world_r8():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    try:
        scene.view_settings.exposure = 0.02
    except Exception:
        pass

    world = scene.world
    world.use_nodes = True
    nt = world.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    env = nodes.new("ShaderNodeTexEnvironment")
    env.image = r5.load_image("qwantani_dusk_2_puresky_2k.exr", non_color=False)
    coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Rotation"].default_value[2] = math.radians(82)
    bg.inputs["Strength"].default_value = 0.56

    links.new(coord.outputs["Normal"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], env.inputs["Vector"])
    links.new(env.outputs["Color"], bg.inputs["Color"])
    links.new(bg.outputs["Background"], out.inputs["Surface"])


def stone_pbr_r8():
    stone = r5.build_pbr_material(
        "CreamStonePBR_R8",
        "marble_01_diff_2k.jpg",
        "marble_01_nor_gl_2k.jpg",
        "marble_01_rough_2k.jpg",
        scale=(2.45, 2.45, 2.45),
        value=0.96,
        saturation=0.78,
    )

    names = {
        "ground_left_stone_core",
        "upper_stone_spine",
        "signature_cantilever",
        "roof_plane",
        "ground_floor_slab",
        "upper_floor_slab",
        "pool_coping_left",
        "pool_coping_right",
        "pool_coping_near",
        "left_planter",
        "right_planter",
    }
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj:
            r5.apply_material(obj, stone)


def camera_r8():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (26.1, 28.9, 3.02)
    cam.data.lens = 58
    cam.data.shift_y = 0.016
    target = mathutils.Vector((-0.55, 4.48, 2.34))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def light_balance_r8():
    sun = bpy.data.objects.get("sunset_key_r5")
    if sun and sun.type == "LIGHT":
        sun.data.energy = 0.74
        sun.data.color = (1.0, 0.68, 0.50)

    cool = bpy.data.objects.get("cool_fill_r5")
    if cool and cool.type == "LIGHT":
        cool.data.energy = 350
        cool.data.color = (0.34, 0.48, 0.72)

    front = bpy.data.objects.get("front_fill_r5")
    if front and front.type == "LIGHT":
        front.data.energy = 225

    living = bpy.data.objects.get("living_warm_r5")
    if living and living.type == "LIGHT":
        living.data.energy = 350

    upper = bpy.data.objects.get("upper_warm_r5")
    if upper and upper.type == "LIGHT":
        upper.data.energy = 255


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

    r7.configure_world_split_r7()
    r7.landscape_r7()
    r7.pool_r7()
    r7.camera_r7()
    r7.foreground_r7()
    r7.lighting_r7()

    pure_sky_world_r8()
    stone_pbr_r8()
    camera_r8()
    light_balance_r8()

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r8 generated")


if __name__ == "__main__":
    main()
