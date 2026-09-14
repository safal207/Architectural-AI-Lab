import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R3_SOURCE = HERE / "run_v02_hero_r3.py"

spec = importlib.util.spec_from_file_location("villa_v02_r3", R3_SOURCE)
r3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r3)
r2 = r3.r2
base = r3.base


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


def configure_eevee_archviz():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False

    eevee = getattr(scene, "eevee", None)
    if eevee:
        set_if_present(eevee, "taa_render_samples", 96)
        set_if_present(eevee, "use_gtao", True)
        set_if_present(eevee, "gtao_distance", 3.5)
        set_if_present(eevee, "gtao_factor", 1.25)
        set_if_present(eevee, "use_soft_shadows", True)
        set_if_present(eevee, "use_ssr", True)
        set_if_present(eevee, "use_ssr_refraction", True)
        set_if_present(eevee, "ssr_thickness", 0.18)
        set_if_present(eevee, "ssr_quality", 0.75)
        set_if_present(eevee, "use_bloom", False)

    view = scene.view_settings
    set_if_present(view, "exposure", 0.85)
    set_if_present(view, "gamma", 1.0)
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Medium Low Contrast"):
        try:
            view.look = look
            break
        except Exception:
            continue

    world = scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    sky = nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_elevation = math.radians(1.8)
    sky.sun_rotation = math.radians(226)
    sky.altitude = 0.12
    sky.air_density = 1.0
    sky.dust_density = 3.0
    sky.ozone_density = 1.1
    bg.inputs["Strength"].default_value = 0.58

    links.new(sky.outputs["Color"], bg.inputs["Color"])
    links.new(bg.outputs["Background"], out.inputs["Surface"])


def make_simple_material(name, color, roughness=0.55, metallic=0.0):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def refine_materials_r4():
    stone = base.MATS.get("WarmTravertine")
    if stone and stone.use_nodes:
        for node in stone.node_tree.nodes:
            if node.bl_idname == "ShaderNodeValToRGB":
                elems = node.color_ramp.elements
                elems[0].color = (0.26, 0.19, 0.11, 1.0)
                elems[-1].color = (0.76, 0.66, 0.50, 1.0)
                for elem in elems[1:-1]:
                    elem.color = (0.54, 0.42, 0.28, 1.0)
            elif node.bl_idname == "ShaderNodeBump":
                node.inputs["Strength"].default_value = 0.045
                node.inputs["Distance"].default_value = 0.022

    plaster = base.MATS.get("WarmPlaster")
    if plaster and plaster.use_nodes:
        bsdf = plaster.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.68, 0.65, 0.59, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.58

    deck = base.MATS.get("DeckStone")
    if deck and deck.use_nodes:
        bsdf = deck.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.48, 0.42, 0.34, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.46

    wood = base.MATS.get("NaturalTimber")
    if wood and wood.use_nodes:
        for node in wood.node_tree.nodes:
            if node.bl_idname == "ShaderNodeValToRGB":
                elems = node.color_ramp.elements
                elems[0].color = (0.035, 0.012, 0.004, 1.0)
                elems[-1].color = (0.28, 0.09, 0.025, 1.0)
            elif node.bl_idname == "ShaderNodeBump":
                node.inputs["Strength"].default_value = 0.09

    glass = base.MATS.get("GlassNeutral")
    if glass and glass.use_nodes:
        bsdf = glass.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.035, 0.075, 0.095, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.10
            bsdf.inputs["Metallic"].default_value = 0.12
            set_input(bsdf, ("Transmission Weight", "Transmission"), 0.22)
            set_input(bsdf, ("Specular IOR Level", "Specular"), 0.48)
            if "IOR" in bsdf.inputs:
                bsdf.inputs["IOR"].default_value = 1.45
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 1.0
        set_if_present(glass, "use_screen_refraction", True)

    water = base.MATS.get("PoolWater")
    if water and water.use_nodes:
        bsdf = water.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.018, 0.22, 0.28, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.08
            bsdf.inputs["Metallic"].default_value = 0.08
            set_input(bsdf, ("Transmission Weight", "Transmission"), 0.18)
            set_input(bsdf, ("Specular IOR Level", "Specular"), 0.58)
            if "IOR" in bsdf.inputs:
                bsdf.inputs["IOR"].default_value = 1.333
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 1.0

        nt = water.node_tree
        tex = nt.nodes.get("r4_water_noise")
        if not tex:
            tex = nt.nodes.new("ShaderNodeTexNoise")
            tex.name = "r4_water_noise"
            tex.inputs["Scale"].default_value = 4.0
            tex.inputs["Detail"].default_value = 2.0
            tex.inputs["Roughness"].default_value = 0.55
            bump = nt.nodes.new("ShaderNodeBump")
            bump.name = "r4_water_bump"
            bump.inputs["Strength"].default_value = 0.055
            bump.inputs["Distance"].default_value = 0.028
            nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
            nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    leaf = base.MATS.get("LeafOlive")
    if leaf and leaf.use_nodes:
        bsdf = leaf.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.10, 0.22, 0.08, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.68


def delete_lights():
    for obj in list(bpy.data.objects):
        if obj.type == "LIGHT":
            bpy.data.objects.remove(obj, do_unlink=True)


def lighting_r4():
    delete_lights()

    bpy.ops.object.light_add(type="SUN", location=(0.0, 0.0, 12.0))
    sun = bpy.context.object
    sun.name = "low_sun_r4"
    sun.data.energy = 1.6
    sun.data.color = (1.0, 0.63, 0.42)
    sun.rotation_euler = (math.radians(69), 0.0, math.radians(-52))

    r2.add_soft_area(
        "cool_sky_fill_r4",
        (13.0, 15.0, 10.5),
        780,
        (0.36, 0.50, 0.78),
        13.0,
        (0.0, 3.5, 3.2),
    )
    r2.add_soft_area(
        "soft_front_fill_r4",
        (0.0, 18.0, 7.0),
        420,
        (0.68, 0.76, 1.0),
        11.0,
        (0.0, 3.0, 2.8),
    )
    r2.add_soft_area(
        "living_warm_r4",
        (-0.6, 1.0, 2.3),
        360,
        (1.0, 0.40, 0.16),
        5.2,
        (-0.2, 4.2, 1.5),
    )
    r2.add_soft_area(
        "upper_warm_r4",
        (1.0, 1.1, 5.1),
        270,
        (1.0, 0.38, 0.14),
        4.4,
        (1.0, 3.2, 5.0),
    )
    r2.add_soft_area(
        "pool_fill_r4",
        (0.0, 10.4, 2.4),
        240,
        (0.18, 0.45, 0.62),
        7.5,
        (-0.8, 8.9, 0.2),
    )
    r2.add_soft_area(
        "stone_graze_r4",
        (-8.5, 6.6, 4.0),
        165,
        (1.0, 0.56, 0.30),
        3.0,
        (-6.8, 0.8, 2.5),
    )


def camera_r4():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (22.2, 24.0, 3.55)
    cam.data.lens = 52
    cam.data.shift_y = 0.035
    target = mathutils.Vector((-0.4, 4.55, 2.40))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def context_r4():
    sand = make_simple_material("ContextSand", (0.31, 0.26, 0.20), roughness=0.82)
    curb = make_simple_material("ContextCurb", (0.42, 0.38, 0.31), roughness=0.68)

    base.cube("context_ground_r4", (86.0, 72.0, 0.22), (0.0, 2.0, -0.58), sand)
    base.cube("rear_boundary_r4", (35.0, 0.32, 1.10), (0.0, -10.6, 0.18), curb, 0.03)
    base.cube("left_boundary_r4", (0.32, 25.0, 0.85), (-17.2, 0.0, 0.05), curb, 0.03)

    # A few low architectural planting masses soften the hard procedural edge.
    leaf = base.MATS["LeafOlive"]
    for i, (x, y, s) in enumerate([
        (-11.5, 7.5, 1.0),
        (-10.4, 7.0, 0.8),
        (10.8, 6.7, 0.9),
        (11.6, 6.3, 0.7),
        (9.9, 5.9, 0.65),
    ]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=s, location=(x, y, 0.58))
        obj = bpy.context.object
        obj.name = f"context_shrub_r4_{i:02d}"
        obj.scale = (1.5, 0.78, 0.62)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(leaf)
        r3.smooth_object(obj)


def reduce_emitter_glare():
    for mat_name in ("ArchitecturalWarmEmitter",):
        mat = bpy.data.materials.get(mat_name)
        if not mat or not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.bl_idname == "ShaderNodeEmission":
                node.inputs["Strength"].default_value = 1.45
                node.inputs["Color"].default_value = (1.0, 0.32, 0.10, 1.0)


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

    configure_eevee_archviz()
    refine_materials_r4()
    reduce_emitter_glare()
    context_r4()
    camera_r4()
    lighting_r4()

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r4 generated")


if __name__ == "__main__":
    main()
