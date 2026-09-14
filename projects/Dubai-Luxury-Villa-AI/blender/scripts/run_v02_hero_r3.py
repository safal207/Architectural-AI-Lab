import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R2_SOURCE = HERE / "run_v02_hero_r2.py"

spec = importlib.util.spec_from_file_location("villa_v02_r2", R2_SOURCE)
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
base = r2.base


def configure_cycles_and_blue_hour():
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    try:
        scene.cycles.use_adaptive_sampling = True
        scene.cycles.adaptive_threshold = 0.03
    except Exception:
        pass
    try:
        scene.cycles.max_bounces = 6
        scene.cycles.diffuse_bounces = 3
        scene.cycles.glossy_bounces = 3
        scene.cycles.transmission_bounces = 4
    except Exception:
        pass

    # Controlled architectural blue hour: deep navy overhead, a restrained
    # desaturated warm band around the horizon, no full-frame orange field.
    world = scene.world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new("ShaderNodeOutputWorld")
    background = nodes.new("ShaderNodeBackground")
    background.inputs["Strength"].default_value = 0.34
    texcoord = nodes.new("ShaderNodeTexCoord")
    separate = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.008, 0.012, 0.025, 1.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.035, 0.10, 0.24, 1.0)
    h1 = ramp.color_ramp.elements.new(0.48)
    h1.color = (0.16, 0.075, 0.055, 1.0)
    h2 = ramp.color_ramp.elements.new(0.56)
    h2.color = (0.09, 0.13, 0.23, 1.0)

    links.new(texcoord.outputs["Normal"], separate.inputs["Vector"])
    links.new(separate.outputs["Z"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], background.inputs["Color"])
    links.new(background.outputs["Background"], output.inputs["Surface"])


def delete_contains(tokens):
    for obj in list(bpy.data.objects):
        if any(token in obj.name.lower() for token in tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def smooth_object(obj):
    if obj and getattr(obj, "type", None) == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = True


def make_emission_material():
    mat = bpy.data.materials.get("ArchitecturalWarmEmitter")
    if mat:
        return mat
    mat = bpy.data.materials.new(name="ArchitecturalWarmEmitter")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (1.0, 0.20, 0.055, 1.0)
    emit.inputs["Strength"].default_value = 3.0
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def make_pool_floor_material():
    mat = bpy.data.materials.get("PoolInterior")
    if mat:
        return mat
    mat = bpy.data.materials.new(name="PoolInterior")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.10, 0.25, 0.28, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.36
    return mat


def refine_materials_r3():
    stone = base.MATS.get("WarmTravertine")
    if stone and stone.use_nodes:
        for node in stone.node_tree.nodes:
            if node.bl_idname == "ShaderNodeTexNoise":
                node.inputs["Scale"].default_value = 5.5
                node.inputs["Detail"].default_value = 3.0
                node.inputs["Roughness"].default_value = 0.58
            elif node.bl_idname == "ShaderNodeBump":
                node.inputs["Strength"].default_value = 0.075
                node.inputs["Distance"].default_value = 0.035
            elif node.bl_idname == "ShaderNodeValToRGB":
                elems = node.color_ramp.elements
                elems[0].color = (0.22, 0.15, 0.085, 1.0)
                elems[-1].color = (0.73, 0.61, 0.43, 1.0)
                for elem in elems[1:-1]:
                    elem.color = (0.46, 0.33, 0.19, 1.0)

    plaster = base.MATS.get("WarmPlaster")
    if plaster and plaster.use_nodes:
        bsdf = plaster.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.53, 0.49, 0.42, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.62

    deck = base.MATS.get("DeckStone")
    if deck and deck.use_nodes:
        bsdf = deck.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.34, 0.29, 0.22, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.48

    glass = base.MATS.get("GlassNeutral")
    if glass and glass.use_nodes:
        bsdf = glass.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.055, 0.095, 0.12, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.055
            if "IOR" in bsdf.inputs:
                bsdf.inputs["IOR"].default_value = 1.45
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 1.0
            for key in ("Transmission Weight", "Transmission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.88
                    break

    water = base.MATS.get("PoolWater")
    if water and water.use_nodes:
        bsdf = water.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = (0.015, 0.17, 0.22, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.06
            if "IOR" in bsdf.inputs:
                bsdf.inputs["IOR"].default_value = 1.333
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = 1.0
            for key in ("Transmission Weight", "Transmission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = 0.82
                    break


def create_frond(name, origin, angle, length, width, droop, material):
    segments = 7
    verts = []
    faces = []
    dx = math.cos(angle)
    dy = math.sin(angle)
    px = -dy
    py = dx
    ox, oy, oz = origin

    for i in range(segments + 1):
        t = i / segments
        half = width * (1.0 - 0.68 * t) * 0.5
        cx = ox + dx * length * t
        cy = oy + dy * length * t
        cz = oz + math.sin(math.pi * t) * 0.20 - droop * (t ** 1.8)
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
    solidify = obj.modifiers.new("frond_thickness", "SOLIDIFY")
    solidify.thickness = 0.012
    return obj


def add_palm_r3(prefix, location, scale=1.0):
    x, y, z = location
    bpy.ops.mesh.primitive_cone_add(
        vertices=28,
        radius1=0.17 * scale,
        radius2=0.095 * scale,
        depth=4.8 * scale,
        location=(x, y, z + 2.4 * scale),
    )
    trunk = bpy.context.object
    trunk.name = f"{prefix}_trunk"
    trunk.data.materials.append(base.MATS["Trunk"])
    smooth_object(trunk)

    crown = (x, y, z + 4.82 * scale)
    leaf = base.MATS["LeafOlive"]
    for i in range(14):
        angle = (i / 14.0) * math.tau + 0.16
        length = (2.15 + 0.22 * (i % 4)) * scale
        droop = (0.52 + 0.08 * (i % 3)) * scale
        create_frond(
            f"{prefix}_frond_{i:02d}",
            crown,
            angle,
            length,
            0.44 * scale,
            droop,
            leaf,
        )


def add_shrub(name, location, scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=14, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(base.MATS["LeafOlive"])
    smooth_object(obj)
    return obj


def landscape_r3():
    delete_contains(("olive", "palm"))

    # Keep the architecture dominant: one palm as a silhouette, low layered shrubs.
    add_palm_r3("palm_r3", (8.6, 3.5, 0.58), 0.92)

    shrub_specs = [
        (-8.5, 6.3, 0.82, 1.10, 0.54, 0.46),
        (-7.2, 6.2, 0.76, 0.88, 0.46, 0.38),
        (-6.2, 6.35, 0.72, 0.72, 0.42, 0.34),
        (6.9, 4.9, 0.72, 0.74, 0.42, 0.34),
        (7.7, 5.0, 0.76, 0.86, 0.46, 0.38),
    ]
    for idx, (x, y, z, sx, sy, sz) in enumerate(shrub_specs):
        add_shrub(f"shrub_r3_{idx:02d}", (x, y, z), (sx, sy, sz))


def camera_r3():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (21.8, 23.4, 5.15)
    cam.data.lens = 55
    cam.data.shift_y = 0.02
    target = mathutils.Vector((-0.55, 4.7, 2.35))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def lighting_r3():
    # Remove lighting inherited from previous passes and rebuild with a visible logic.
    delete_contains((
        "sunset_sun", "sky_fill", "living_warm", "master_warm",
        "facade_fill_r2", "terrace_soft_r2", "pool_soft_r2", "upper_warm_r2",
        "landscape_light", "soffit_light",
    ))

    # Low warm directional sun grazes stone and timber.
    bpy.ops.object.light_add(type="SUN", location=(10.0, -8.0, 16.0))
    sun = bpy.context.object
    sun.name = "blue_hour_sun_r3"
    sun.data.energy = 1.35
    sun.data.color = (1.0, 0.46, 0.24)
    sun.rotation_euler = (math.radians(70), 0.0, math.radians(-52))

    # Cool sky fill, broad enough to preserve shadow modelling.
    r2.add_soft_area("cool_facade_fill_r3", (12.0, 16.0, 10.0), 330, (0.22, 0.38, 0.70), 10.0, (0.0, 2.8, 2.9))

    # Warm interior sources, deliberately lower than r2.
    r2.add_soft_area("living_interior_r3", (-0.5, 1.0, 2.45), 240, (1.0, 0.34, 0.12), 5.0, (-0.5, 4.0, 1.5))
    r2.add_soft_area("upper_interior_r3", (1.0, 1.35, 5.35), 180, (1.0, 0.33, 0.11), 4.2, (1.0, 3.1, 5.0))

    emitter = make_emission_material()
    base.cube("ground_linear_light_r3", (8.2, 0.045, 0.035), (-0.1, 3.72, 2.94), emitter)
    base.cube("upper_linear_light_r3", (7.4, 0.045, 0.035), (1.35, 3.17, 6.17), emitter)
    base.cube("cantilever_linear_light_r3", (7.8, 0.045, 0.035), (1.7, 5.16, 6.43), emitter)

    # Small supporting area sources sit near the visible strips.
    r2.add_soft_area("ground_strip_support_r3", (0.0, 3.45, 2.78), 75, (1.0, 0.34, 0.12), 6.5, (0.0, 5.0, 0.4))
    r2.add_soft_area("upper_strip_support_r3", (1.2, 2.8, 5.95), 55, (1.0, 0.32, 0.10), 5.0, (1.2, 4.0, 4.2))


def pool_r3():
    basin = bpy.data.objects.get("pool_basin")
    water = bpy.data.objects.get("pool_water")
    shelf = bpy.data.objects.get("pool_shallow_shelf")
    if basin:
        basin.location.z = -0.14
        basin.dimensions.z = 0.30
    if water:
        water.location.z = 0.16
        water.dimensions.z = 0.075
    if shelf:
        shelf.location.z = 0.05
        shelf.dimensions.z = 0.12

    pool_floor_mat = make_pool_floor_material()
    base.cube("pool_floor_r3", (12.25, 3.85, 0.09), (-0.9, 9.0, -0.02), pool_floor_mat, 0.02)


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

    configure_cycles_and_blue_hour()
    refine_materials_r3()
    pool_r3()
    landscape_r3()
    camera_r3()
    lighting_r3()

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r3 generated")


if __name__ == "__main__":
    main()
