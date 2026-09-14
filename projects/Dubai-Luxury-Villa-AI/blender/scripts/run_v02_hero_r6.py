import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R5_SOURCE = HERE / "run_v02_hero_r5.py"

spec = importlib.util.spec_from_file_location("villa_v02_r5", R5_SOURCE)
r5 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r5)
r4 = r5.r4
r3 = r5.r3
r2 = r5.r2
base = r5.base


def set_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def make_arch_glass_r6():
    mat = bpy.data.materials.get("ArchitecturalGlassR6") or bpy.data.materials.new(name="ArchitecturalGlassR6")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.035, 0.08, 0.10, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.09
    bsdf.inputs["Metallic"].default_value = 0.06
    set_input(bsdf, ("Transmission Weight", "Transmission"), 0.22)
    set_input(bsdf, ("Specular IOR Level", "Specular"), 0.52)
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = 1.45
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = 1.0
    try:
        mat.use_screen_refraction = True
    except Exception:
        pass
    return mat


def make_emitter_r6():
    mat = bpy.data.materials.get("WarmEmitterR6") or bpy.data.materials.new(name="WarmEmitterR6")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (1.0, 0.30, 0.075, 1.0)
    emit.inputs["Strength"].default_value = 1.8
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def architectural_detail_r6():
    glass = make_arch_glass_r6()
    metal = base.MATS["CharcoalMetal"]
    fabric = base.MATS["FabricCream"]
    timber = bpy.data.materials.get("TimberCladdingPBR_R5") or base.MATS["NaturalTimber"]
    emitter = make_emitter_r6()

    # Complete the upper facade with a slim balcony edge and readable depth.
    panel_centers = [-0.55, 1.25, 3.05]
    for i, x in enumerate(panel_centers):
        base.cube(f"balcony_glass_r6_{i:02d}", (1.72, 0.055, 0.92), (x, 3.62, 4.25), glass, 0.012)
    base.cube("balcony_top_rail_r6", (5.95, 0.07, 0.07), (1.25, 3.62, 4.73), metal, 0.015)
    base.cube("master_side_frame_left_r6", (0.10, 0.22, 2.58), (-1.78, 3.10, 5.04), metal, 0.015)
    base.cube("master_side_frame_right_r6", (0.10, 0.22, 2.58), (4.40, 3.10, 5.04), metal, 0.015)

    # Thin shadow gaps add facade scale cues without over-texturing.
    for i, z in enumerate((0.78, 1.55, 2.32)):
        base.cube(f"right_core_shadow_gap_r6_{i:02d}", (2.84, 0.035, 0.030), (6.9, 3.41, z), metal)
    for i, x in enumerate((-8.8, -7.5, -6.2)):
        base.cube(f"left_core_vertical_gap_r6_{i:02d}", (0.028, 0.040, 3.05), (x, 4.205, 1.69), metal)

    # Warm textile/interior cues visible behind the dark glass.
    base.cube("living_curtain_left_r6", (0.68, 0.07, 2.58), (-4.35, 3.70, 1.68), fabric, 0.025)
    base.cube("living_curtain_right_r6", (0.68, 0.07, 2.58), (4.42, 3.70, 1.68), fabric, 0.025)
    base.cube("master_curtain_left_r6", (0.52, 0.06, 2.15), (-1.40, 2.77, 5.05), fabric, 0.020)
    base.cube("master_curtain_right_r6", (0.52, 0.06, 2.15), (3.95, 2.77, 5.05), fabric, 0.020)

    # Linear warm details under soffits and inside the living pavilion.
    base.cube("living_linear_light_r6", (7.9, 0.035, 0.030), (-0.05, 3.56, 2.92), emitter)
    base.cube("upper_linear_light_r6", (5.4, 0.035, 0.030), (1.25, 2.86, 6.10), emitter)
    base.cube("cantilever_linear_light_r6", (7.6, 0.035, 0.030), (1.9, 5.21, 6.43), emitter)

    # Three restrained pendant elements add human scale behind glazing.
    for i, x in enumerate((2.55, 3.15, 3.75)):
        base.cylinder(f"dining_pendant_r6_{i:02d}", 0.075, 0.24, (x, 2.05, 2.22), metal, vertices=20)
        base.cylinder(f"dining_pendant_glow_r6_{i:02d}", 0.045, 0.10, (x, 2.05, 2.08), emitter, vertices=20)

    # Richer balcony soffit reads as a deliberate timber plane.
    base.cube("balcony_soffit_r6", (6.2, 1.05, 0.055), (1.25, 3.83, 3.60), timber, 0.018)


def agave_leaf(name, origin, angle, length, width, height, material):
    segments = 7
    verts = []
    faces = []
    ox, oy, oz = origin
    dx, dy = math.cos(angle), math.sin(angle)
    px, py = -dy, dx

    for i in range(segments + 1):
        t = i / segments
        half = width * (1.0 - 0.88 * t) * 0.5
        radius = length * t
        cx = ox + dx * radius
        cy = oy + dy * radius
        cz = oz + height * math.sin(t * math.pi * 0.72) - 0.08 * (t ** 2)
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
    solid = obj.modifiers.new("leaf_thickness", "SOLIDIFY")
    solid.thickness = 0.014
    return obj


def add_agave(prefix, location, scale=1.0):
    leaf_mat = r4.make_simple_material("AgaveLeafR6", (0.055, 0.19, 0.105), roughness=0.56)
    x, y, z = location
    for i in range(18):
        angle = (i / 18.0) * math.tau + 0.12
        ring = 1.0 if i < 12 else 0.68
        length = (0.78 + 0.22 * ((i * 7) % 5) / 4.0) * scale * ring
        width = (0.18 + 0.04 * (i % 3)) * scale
        height = (0.48 + 0.20 * (i % 4) / 3.0) * scale
        agave_leaf(f"{prefix}_leaf_{i:02d}", (x, y, z), angle, length, width, height, leaf_mat)


def landscape_r6():
    for obj in list(bpy.data.objects):
        lower = obj.name.lower()
        if "planting_" in lower or "context_shrub_r4" in lower or "shrub_r3" in lower:
            bpy.data.objects.remove(obj, do_unlink=True)

    add_agave("agave_left_r6", (-8.25, 6.28, 0.63), 1.05)
    add_agave("agave_right_r6", (7.75, 5.02, 0.63), 0.92)
    add_agave("agave_far_r6", (9.55, 5.40, 0.60), 0.72)

    # Finer ornamental grass rhythm around the agaves.
    base.add_grass_cluster("fine_grass_left_r6", (-6.55, 6.20, 0.56), count=20, scale=0.82)
    base.add_grass_cluster("fine_grass_right_r6", (6.55, 5.10, 0.56), count=18, scale=0.78)


def pool_r6():
    water = bpy.data.objects.get("pool_water")
    if water and water.data.materials:
        mat = water.data.materials[0]
        if mat and mat.use_nodes:
            bsdf = mat.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Base Color"].default_value = (0.012, 0.17, 0.22, 1.0)
                bsdf.inputs["Roughness"].default_value = 0.07
                bsdf.inputs["Metallic"].default_value = 0.12
                set_input(bsdf, ("Transmission Weight", "Transmission"), 0.02)
                set_input(bsdf, ("Emission Color", "Emission"), (0.002, 0.035, 0.05, 1.0))
                set_input(bsdf, ("Emission Strength",), 0.16)

    # Subtle underwater lights along the long pool edge.
    for i, x in enumerate((-4.0, -0.8, 2.4)):
        bpy.ops.object.light_add(type="POINT", location=(x, 8.9, 0.05))
        lamp = bpy.context.object
        lamp.name = f"pool_underwater_r6_{i:02d}"
        lamp.data.energy = 42
        lamp.data.color = (0.10, 0.52, 0.72)
        lamp.data.shadow_soft_size = 0.85


def camera_r6():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (24.0, 25.8, 3.28)
    cam.data.lens = 52
    cam.data.shift_y = 0.028
    target = mathutils.Vector((-0.35, 4.50, 2.33))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def tune_lighting_r6():
    # Preserve r5's balanced HDRI/key setup but increase interior presence.
    for name, factor in (("living_warm_r5", 1.22), ("upper_warm_r5", 1.18)):
        light = bpy.data.objects.get(name)
        if light and light.type == "LIGHT":
            light.data.energy *= factor

    cool = bpy.data.objects.get("cool_fill_r5")
    if cool and cool.type == "LIGHT":
        cool.data.energy *= 0.92

    scene = bpy.context.scene
    try:
        scene.view_settings.exposure = 0.12
    except Exception:
        pass


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

    architectural_detail_r6()
    landscape_r6()
    pool_r6()
    camera_r6()
    tune_lighting_r6()

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r6 generated")


if __name__ == "__main__":
    main()
