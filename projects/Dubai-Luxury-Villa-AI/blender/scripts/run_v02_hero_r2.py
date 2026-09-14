import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "generate_villa_v02_hero.py"

spec = importlib.util.spec_from_file_location("villa_v02", SOURCE)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def setup_scene_compat():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except (TypeError, ValueError):
        scene.render.engine = "BLENDER_EEVEE"

    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    try:
        scene.view_settings.view_transform = "AgX"
    except Exception:
        pass
    for look in ("AgX - Medium High Contrast", "AgX - Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except Exception:
            pass

    world = scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    sky = nodes.new("ShaderNodeTexSky")
    try:
        sky.sky_type = "NISHITA"
        sky.sun_elevation = math.radians(4.0)
        sky.sun_rotation = math.radians(220.0)
        sky.altitude = 0.1
        sky.air_density = 1.25
        sky.dust_density = 3.2
        sky.ozone_density = 1.0
    except Exception:
        pass
    bg.inputs["Strength"].default_value = 0.18
    links.new(sky.outputs["Color"], bg.inputs["Color"])
    links.new(bg.outputs["Background"], output.inputs["Surface"])


def delete_prefixes(prefixes):
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def add_soft_area(name, location, energy, color, size, target):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = color
    light.data.shape = "RECTANGLE"
    light.data.size = size
    light.data.size_y = max(0.35, size * 0.35)
    direction = mathutils.Vector(target) - light.location
    light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return light


def uv_canopy(name, location, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(base.MATS["LeafOlive"])
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def add_olive_r2(prefix, location, scale=1.0):
    x, y, z = location
    base.cylinder(f"{prefix}_trunk", 0.16 * scale, 3.4 * scale, (x, y, z + 1.7 * scale), base.MATS["Trunk"], vertices=20)
    trunk = bpy.context.object
    for poly in trunk.data.polygons:
        poly.use_smooth = True
    uv_canopy(f"{prefix}_canopy_a", (x - 0.42 * scale, y, z + 3.55 * scale), (0.95 * scale, 0.72 * scale, 0.63 * scale))
    uv_canopy(f"{prefix}_canopy_b", (x + 0.48 * scale, y + 0.1 * scale, z + 3.62 * scale), (0.92 * scale, 0.68 * scale, 0.62 * scale))
    uv_canopy(f"{prefix}_canopy_c", (x, y - 0.34 * scale, z + 3.90 * scale), (0.82 * scale, 0.66 * scale, 0.58 * scale))


def add_palm(prefix, location, scale=1.0):
    x, y, z = location
    trunk_mat = base.MATS["Trunk"]
    leaf_mat = base.MATS["LeafOlive"]
    base.cylinder(f"{prefix}_trunk", 0.15 * scale, 5.0 * scale, (x, y, z + 2.5 * scale), trunk_mat, vertices=24)
    trunk = bpy.context.object
    trunk.rotation_euler[1] = math.radians(-3.0)
    for poly in trunk.data.polygons:
        poly.use_smooth = True

    crown_z = z + 5.0 * scale
    for i in range(12):
        angle = (i / 12.0) * math.tau
        length = (2.4 + (i % 3) * 0.25) * scale
        cx = x + math.cos(angle) * length * 0.38
        cy = y + math.sin(angle) * length * 0.38
        cz = crown_z + (0.18 if i % 2 == 0 else -0.08) * scale
        bpy.ops.mesh.primitive_cube_add(location=(cx, cy, cz))
        frond = bpy.context.object
        frond.name = f"{prefix}_frond_{i:02d}"
        frond.dimensions = (length, 0.16 * scale, 0.045 * scale)
        frond.rotation_euler = (math.radians(3 + (i % 3) * 3), math.radians(-8), angle)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        frond.data.materials.append(leaf_mat)


def refine_materials():
    stone = base.MATS.get("WarmTravertine")
    if stone and stone.use_nodes:
        for node in stone.node_tree.nodes:
            if node.bl_idname == "ShaderNodeValToRGB":
                node.color_ramp.elements[0].color = (0.32, 0.22, 0.13, 1)
                node.color_ramp.elements[-1].color = (0.78, 0.66, 0.48, 1)
                for elem in node.color_ramp.elements[1:-1]:
                    elem.color = (0.52, 0.39, 0.24, 1)

    glass = base.MATS.get("GlassNeutral")
    if glass and glass.use_nodes:
        bsdf = glass.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.12, 0.20, 0.23, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.04
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 0.18
            for key in ("Transmission Weight", "Transmission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.80
                    break

    water = base.MATS.get("PoolWater")
    if water and water.use_nodes:
        bsdf = water.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.018, 0.30, 0.34, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.035
            for key in ("Transmission Weight", "Transmission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.55
                    break


def refine_architecture():
    # Open up the upper floor behind the glazing so it reads as a room, not glass pasted to a wall.
    upper = bpy.data.objects.get("upper_private_volume")
    if upper:
        upper.dimensions.y = 4.35
        upper.location.y = -1.35

    plaster = base.MATS["WarmPlaster"]
    timber = base.MATS["NaturalTimber"]
    metal = base.MATS["CharcoalMetal"]
    stone = base.MATS["WarmTravertine"]
    fabric = base.MATS["FabricCream"]

    # Upper interior depth visible through glass.
    base.cube("upper_interior_floor", (7.4, 2.05, 0.10), (1.45, 1.85, 3.68), stone, 0.025)
    base.cube("upper_interior_ceiling", (7.4, 2.05, 0.08), (1.45, 1.85, 6.25), timber, 0.02)
    base.cube("upper_interior_back", (7.2, 0.16, 2.45), (1.45, 0.95, 4.95), plaster, 0.02)
    base.cube("master_bed_r2", (2.3, 1.8, 0.52), (0.8, 1.65, 4.00), fabric, 0.11)
    base.cube("master_bed_headboard", (2.55, 0.16, 1.05), (0.8, 0.85, 4.45), timber, 0.04)

    # Signature soffit and dark edge make the cantilever look designed rather than like a slab.
    base.cube("signature_timber_soffit", (9.7, 2.30, 0.07), (2.2, 4.10, 6.46), timber, 0.025)
    base.cube("signature_dark_edge", (10.35, 0.10, 0.20), (2.2, 5.46, 6.59), metal, 0.02)
    base.cube("roof_dark_edge", (14.75, 0.11, 0.16), (1.2, 4.00, 6.70), metal, 0.02)

    # Stone joints/reveals provide scale cues.
    for idx, z in enumerate((0.92, 1.78, 2.64)):
        base.cube(f"left_core_joint_{idx:02d}", (3.78, 0.035, 0.025), (-7.5, 4.205, z), metal)
    for idx, z in enumerate((4.30, 5.15, 6.00)):
        base.cube(f"upper_spine_joint_{idx:02d}", (2.82, 0.035, 0.025), (-3.6, 3.105, z), metal)

    # Sharper pool coping and a readable water edge.
    base.cube("pool_coping_left", (0.18, 4.65, 0.12), (-7.43, 9.0, 0.35), stone, 0.02)
    base.cube("pool_coping_right", (0.18, 4.65, 0.12), (5.63, 9.0, 0.35), stone, 0.02)
    base.cube("pool_coping_near", (13.15, 0.18, 0.12), (-0.9, 6.72, 0.35), stone, 0.02)


def refine_camera_and_lighting():
    cam = bpy.data.objects.get("hero_camera_v02")
    if cam:
        cam.location = (20.5, 22.0, 7.15)
        cam.data.lens = 52
        target = mathutils.Vector((-0.2, 4.4, 2.45))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

    # Remove debug-looking pools of light from the first pass.
    delete_prefixes(("landscape_light_", "soffit_light_"))

    # Keep interior lights but reduce their intensity for a calmer luxury look.
    for name in ("living_warm_1", "living_warm_2", "master_warm"):
        obj = bpy.data.objects.get(name)
        if obj and hasattr(obj.data, "energy"):
            obj.data.energy *= 0.62

    # Large soft architectural fills/grazers instead of naked point lights.
    add_soft_area("facade_fill_r2", (9.5, 14.0, 8.5), 720, (0.48, 0.60, 0.78), 8.0, (0.0, 2.6, 2.8))
    add_soft_area("terrace_soft_r2", (0.0, 5.8, 4.2), 180, (1.0, 0.47, 0.22), 7.0, (0.0, 6.4, 0.25))
    add_soft_area("pool_soft_r2", (-1.0, 10.5, 5.5), 240, (0.28, 0.52, 0.72), 8.5, (-1.0, 9.0, 0.3))
    add_soft_area("upper_warm_r2", (1.2, 1.6, 5.8), 300, (1.0, 0.43, 0.20), 5.0, (1.2, 3.2, 5.0))


def refine_landscape():
    delete_prefixes(("olive_left_", "olive_right_"))
    add_olive_r2("olive_left_r2", (-8.7, 6.25, 0.58), 1.05)
    add_palm("palm_right_r2", (8.25, 4.8, 0.58), 0.88)


def main():
    base.clear_scene()
    base.setup_materials()
    setup_scene_compat()
    base.build_architecture()
    base.setup_camera_and_lighting()

    refine_materials()
    refine_architecture()
    refine_camera_and_lighting()
    refine_landscape()

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r2 generated")


if __name__ == "__main__":
    main()
