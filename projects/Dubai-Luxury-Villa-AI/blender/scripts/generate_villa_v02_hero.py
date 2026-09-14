import bpy
import math
from pathlib import Path
import mathutils

PROJECT_NAME = "Dubai Luxury Villa AI"
VERSION = "v0.2-hero"
GLB_NAME = "villa-v0.2-hero.glb"
BLEND_NAME = "villa-v0.2-hero.blend"
RENDER_NAME = "villa-v0.2-hero.png"

MATS = {}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass


def set_bsdf_input(bsdf, names, value):
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return True
    return False


def basic_material(name, color, roughness=0.5, metallic=0.0, alpha=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if transmission:
        set_bsdf_input(bsdf, ["Transmission Weight", "Transmission"], transmission)
        set_bsdf_input(bsdf, ["IOR"], 1.45)
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
        mat.use_screen_refraction = True if hasattr(mat, "use_screen_refraction") else False
    MATS[name] = mat
    return mat


def stone_material():
    mat = bpy.data.materials.new(name="WarmTravertine")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.52

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 4.2
    noise.inputs["Detail"].default_value = 2.0
    noise.inputs["Roughness"].default_value = 0.7

    mapping = nt.nodes.new("ShaderNodeMapping")
    tex = nt.nodes.new("ShaderNodeTexCoord")
    mapping.inputs["Scale"].default_value = (0.55, 5.0, 0.8)

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.22, 0.15, 0.095, 1)
    ramp.color_ramp.elements[1].color = (0.72, 0.57, 0.38, 1)
    ramp.color_ramp.elements.new(0.58).color = (0.47, 0.35, 0.22, 1)

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.14
    bump.inputs["Distance"].default_value = 0.08

    nt.links.new(tex.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    MATS[mat.name] = mat
    return mat


def wood_material():
    mat = bpy.data.materials.new(name="NaturalTimber")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.38

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.5
    noise.inputs["Detail"].default_value = 2.2
    noise.inputs["Roughness"].default_value = 0.58

    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (7.0, 0.55, 1.0)
    tex = nt.nodes.new("ShaderNodeTexCoord")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.055, 0.018, 0.007, 1)
    ramp.color_ramp.elements[1].color = (0.34, 0.105, 0.028, 1)

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.04

    nt.links.new(tex.outputs["Generated"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    MATS[mat.name] = mat
    return mat


def setup_materials():
    stone_material()
    wood_material()
    basic_material("WarmPlaster", (0.72, 0.67, 0.58), roughness=0.68)
    basic_material("CharcoalMetal", (0.018, 0.021, 0.025), roughness=0.24, metallic=0.78)
    basic_material("GlassNeutral", (0.13, 0.19, 0.22), roughness=0.08, alpha=0.28, transmission=0.72)
    basic_material("PoolWater", (0.018, 0.22, 0.25), roughness=0.08, alpha=0.72, transmission=0.62)
    basic_material("DeckStone", (0.43, 0.36, 0.27), roughness=0.58)
    basic_material("GardenDark", (0.055, 0.083, 0.047), roughness=0.92)
    basic_material("Soil", (0.085, 0.055, 0.035), roughness=0.95)
    basic_material("LeafOlive", (0.11, 0.19, 0.075), roughness=0.78)
    basic_material("Trunk", (0.13, 0.065, 0.028), roughness=0.88)
    basic_material("InteriorWarm", (0.64, 0.38, 0.16), roughness=0.52)
    basic_material("FabricCream", (0.55, 0.49, 0.39), roughness=0.88)


def cube(name, size, location, material=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new(name="micro_bevel", type="BEVEL")
        mod.width = bevel
        mod.segments = 3
    if material:
        obj.data.materials.append(material)
    return obj


def cylinder(name, radius, depth, location, material=None, vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def sphere(name, location, scale, material=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    return obj


def add_room_anchor(name, location, area, floor):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=location)
    obj = bpy.context.object
    obj.name = name
    obj["room_name"] = name.replace("_", " ").title()
    obj["area_sqm"] = area
    obj["floor"] = floor
    return obj


def add_glass_bay(prefix, x_start, count, y, z, width=1.55, height=2.7, spacing=1.72):
    glass = MATS["GlassNeutral"]
    metal = MATS["CharcoalMetal"]
    for i in range(count):
        x = x_start + i * spacing
        cube(f"{prefix}_glass_{i+1:02d}", (width, 0.07, height), (x, y, z), glass, 0.015)
        cube(f"{prefix}_mullion_{i+1:02d}", (0.07, 0.12, height + 0.08), (x + width / 2 + 0.04, y - 0.01, z), metal)


def add_tree(prefix, location, scale=1.0):
    trunk = MATS["Trunk"]
    leaf = MATS["LeafOlive"]
    x, y, z = location
    cylinder(f"{prefix}_trunk", 0.18 * scale, 3.5 * scale, (x, y, z + 1.75 * scale), trunk, vertices=12)
    for idx, offset in enumerate([(-0.65, 0.0, 3.4), (0.55, 0.15, 3.55), (0.0, -0.45, 3.9), (0.15, 0.55, 3.75)], 1):
        ox, oy, oz = offset
        sphere(
            f"{prefix}_crown_{idx}",
            (x + ox * scale, y + oy * scale, z + oz * scale),
            (1.15 * scale, 0.85 * scale, 0.7 * scale),
            leaf,
        )


def add_grass_cluster(prefix, location, count=9, scale=1.0):
    leaf = MATS["LeafOlive"]
    x, y, z = location
    for i in range(count):
        angle = (i / count) * math.tau
        r = 0.12 + (i % 3) * 0.08
        gx = x + math.cos(angle) * r
        gy = y + math.sin(angle) * r
        cylinder(f"{prefix}_{i:02d}", 0.025 * scale, (0.7 + (i % 4) * 0.08) * scale, (gx, gy, z + 0.35 * scale), leaf, vertices=6)


def add_area_light(name, location, energy, color, size, target):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = color
    light.data.shape = "RECTANGLE"
    light.data.size = size
    light.data.size_y = size * 0.6
    direction = mathutils.Vector(target) - light.location
    light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return light


def build_architecture():
    stone = MATS["WarmTravertine"]
    plaster = MATS["WarmPlaster"]
    timber = MATS["NaturalTimber"]
    metal = MATS["CharcoalMetal"]
    deck = MATS["DeckStone"]
    water = MATS["PoolWater"]
    soil = MATS["Soil"]
    garden = MATS["GardenDark"]
    interior = MATS["InteriorWarm"]
    fabric = MATS["FabricCream"]

    # Site and terrace — low, horizontal, deliberately restrained.
    cube("site_plinth", (30.0, 23.0, 0.26), (0.0, 1.8, -0.13), deck, 0.06)
    cube("garden_field", (38.0, 32.0, 0.22), (0.0, 1.0, -0.35), garden)
    cube("terrace_deck", (21.5, 6.8, 0.22), (0.8, 6.4, 0.08), deck, 0.04)

    # Ground floor is an open pavilion rather than a solid box.
    cube("ground_floor_slab", (18.4, 9.0, 0.28), (-0.5, 0.1, 0.14), stone, 0.04)
    cube("ground_left_stone_core", (4.0, 8.4, 3.35), (-7.5, 0.0, 1.68), stone, 0.08)
    cube("ground_right_private_core", (3.1, 7.6, 3.25), (6.9, -0.4, 1.63), plaster, 0.08)
    cube("ground_back_wall", (11.2, 0.34, 3.1), (0.5, -4.0, 1.55), plaster, 0.03)

    # Deep reveal / horizontal shadow line at living facade.
    cube("ground_front_header", (11.0, 0.48, 0.42), (0.0, 4.18, 3.05), metal, 0.025)
    cube("ground_front_reveal", (11.2, 0.62, 0.24), (0.0, 3.86, 0.35), metal, 0.02)
    add_glass_bay("living", -4.25, 6, 4.03, 1.68, width=1.46, height=2.78, spacing=1.72)

    # Defined recessed entry on the arrival side.
    cube("entry_portal_left", (0.34, 2.2, 3.15), (-4.95, -4.1, 1.58), timber, 0.03)
    cube("entry_portal_right", (0.34, 2.2, 3.15), (-2.15, -4.1, 1.58), timber, 0.03)
    cube("entry_portal_top", (3.14, 2.2, 0.32), (-3.55, -4.1, 3.0), timber, 0.03)
    cube("entry_door", (1.55, 0.10, 2.55), (-3.55, -3.25, 1.35), timber, 0.02)

    # Upper residence: split stone core + lighter plaster/glass volume.
    cube("upper_floor_slab", (13.6, 7.2, 0.24), (1.15, -0.2, 3.48), stone, 0.035)
    cube("upper_stone_spine", (3.0, 6.7, 3.1), (-3.6, -0.25, 5.02), stone, 0.07)
    cube("upper_private_volume", (7.9, 6.5, 3.0), (1.85, -0.25, 5.0), plaster, 0.07)

    # Upper glazing set back behind cantilever.
    add_glass_bay("master", -1.0, 4, 3.02, 5.05, width=1.35, height=2.35, spacing=1.55)
    cube("master_frame_top", (7.2, 0.36, 0.28), (1.25, 3.10, 6.30), metal)
    cube("master_frame_bottom", (7.2, 0.36, 0.22), (1.25, 3.10, 3.78), metal)

    # Signature cantilever and roof create the hero silhouette.
    cube("signature_cantilever", (10.2, 2.7, 0.26), (2.2, 4.1, 6.62), stone, 0.05)
    cube("roof_plane", (14.6, 8.5, 0.24), (1.2, -0.25, 6.72), stone, 0.05)

    # Timber privacy fins on upper right.
    for i in range(8):
        x = 4.2 + i * 0.32
        cube(f"timber_fin_{i:02d}", (0.09, 0.78, 2.55), (x, 3.28, 5.03), timber, 0.018)

    # Slim columns keep the living frontage open.
    for x in (-4.8, 4.95):
        cube(f"living_column_{x:+.1f}", (0.20, 0.20, 3.05), (x, 3.95, 1.55), metal, 0.02)

    # Architectural pool aligned with living axis.
    cube("pool_basin", (13.0, 4.6, 0.42), (-0.9, 9.0, 0.05), stone, 0.12)
    cube("pool_water", (12.55, 4.15, 0.12), (-0.9, 9.0, 0.30), water, 0.04)
    cube("pool_shallow_shelf", (3.2, 3.6, 0.16), (3.45, 9.0, 0.29), deck, 0.04)
    cube("infinity_lip", (13.0, 0.18, 0.22), (-0.9, 11.22, 0.18), metal, 0.02)

    # Sunken lounge / fire composition without resort clutter.
    cube("sunken_lounge_base", (3.5, 2.4, 0.16), (7.0, 7.2, 0.14), deck, 0.04)
    cube("sunken_seat_back", (3.25, 0.44, 0.52), (7.0, 8.12, 0.42), fabric, 0.10)
    cube("sunken_seat_left", (0.44, 1.9, 0.52), (5.62, 7.25, 0.42), fabric, 0.10)
    cube("sunken_fire", (1.25, 0.65, 0.20), (7.0, 7.2, 0.28), metal, 0.08)

    # Interior hints — only what the hero camera can read.
    cube("living_rug", (4.4, 2.8, 0.05), (-0.5, 1.95, 0.34), fabric, 0.03)
    cube("living_sofa_main", (3.6, 0.95, 0.72), (-1.15, 1.55, 0.72), fabric, 0.16)
    cube("living_sofa_side", (0.95, 2.3, 0.72), (1.05, 2.2, 0.72), fabric, 0.16)
    cube("living_table", (1.55, 0.82, 0.30), (-0.2, 2.65, 0.55), stone, 0.10)
    cube("dining_table", (2.9, 1.2, 0.12), (3.15, 0.4, 0.88), timber, 0.05)
    for i in range(6):
        row = -1 if i < 3 else 1
        col = i % 3
        cube(f"dining_chair_{i:02d}", (0.48, 0.48, 0.78), (2.3 + col * 0.85, 0.4 + row * 0.78, 0.58), fabric, 0.08)

    # Warm interior ceiling strips visible through glazing.
    cube("living_ceiling_warm", (9.2, 4.7, 0.08), (0.15, 1.25, 3.06), interior, 0.02)

    # Landscape framing — asymmetrical and restrained.
    cube("left_planter", (5.8, 1.25, 0.52), (-8.1, 6.4, 0.30), stone, 0.06)
    cube("right_planter", (4.5, 1.25, 0.52), (8.0, 5.0, 0.30), stone, 0.06)
    cube("left_planter_soil", (5.45, 0.92, 0.20), (-8.1, 6.4, 0.55), soil)
    cube("right_planter_soil", (4.15, 0.92, 0.20), (8.0, 5.0, 0.55), soil)

    add_tree("olive_left", (-8.7, 6.25, 0.58), 1.15)
    add_tree("olive_right", (8.25, 4.8, 0.58), 0.95)
    add_grass_cluster("grass_left_a", (-6.8, 6.35, 0.60), 10, 1.0)
    add_grass_cluster("grass_left_b", (-7.7, 6.25, 0.60), 9, 0.85)
    add_grass_cluster("grass_right_a", (6.9, 5.0, 0.60), 10, 0.9)
    add_grass_cluster("grass_right_b", (7.6, 5.2, 0.60), 8, 0.75)

    # Room anchors for later viewer integration.
    add_room_anchor("living_room", (-0.4, 1.7, 1.2), 78, 1)
    add_room_anchor("master_bedroom", (1.8, 0.5, 5.0), 55, 2)
    add_room_anchor("pool_terrace", (-0.9, 7.0, 0.5), 52, 1)


def setup_scene():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    try:
        scene.view_settings.view_transform = "AgX"
    except Exception:
        pass

    world = scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.018, 0.032, 0.055, 1.0)
    bg.inputs["Strength"].default_value = 0.24


def setup_camera_and_lighting():
    scene = bpy.context.scene

    bpy.ops.object.camera_add(location=(22.5, 24.0, 10.2))
    cam = bpy.context.object
    cam.name = "hero_camera_v02"
    cam.data.lens = 48
    cam.data.sensor_width = 36
    target = mathutils.Vector((-0.2, 2.8, 2.55))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    # Warm low sun for blue-hour/sunset transition.
    bpy.ops.object.light_add(type="SUN", location=(12, 10, 18))
    sun = bpy.context.object
    sun.name = "sunset_sun"
    sun.data.energy = 2.1
    sun.data.color = (1.0, 0.53, 0.28)
    sun.rotation_euler = (math.radians(63), 0.0, math.radians(-38))

    # Broad cool fill prevents the facade from becoming crushed black.
    add_area_light("sky_fill", (4.0, 14.0, 15.0), 900, (0.30, 0.48, 0.72), 11.0, (0.0, 1.5, 2.7))

    # Warm interior life visible through glass.
    add_area_light("living_warm_1", (-2.0, 1.5, 2.55), 850, (1.0, 0.43, 0.18), 4.0, (-1.5, 4.3, 1.5))
    add_area_light("living_warm_2", (2.2, 0.7, 2.45), 700, (1.0, 0.40, 0.16), 3.5, (2.2, 4.3, 1.5))
    add_area_light("master_warm", (1.2, 0.0, 5.9), 620, (1.0, 0.40, 0.16), 3.2, (1.2, 3.2, 5.0))

    # Architectural/landscape accents kept subtle.
    for idx, loc in enumerate([(-6.0, 5.2, 0.55), (-1.0, 5.4, 0.55), (4.6, 5.2, 0.55), (8.0, 4.0, 0.65)]):
        bpy.ops.object.light_add(type="POINT", location=loc)
        lamp = bpy.context.object
        lamp.name = f"landscape_light_{idx:02d}"
        lamp.data.energy = 105
        lamp.data.color = (1.0, 0.36, 0.11)
        lamp.data.shadow_soft_size = 1.0

    for idx, x in enumerate([-4.0, -1.0, 2.0, 5.0]):
        bpy.ops.object.light_add(type="POINT", location=(x, 3.45, 2.85))
        lamp = bpy.context.object
        lamp.name = f"soffit_light_{idx:02d}"
        lamp.data.energy = 85
        lamp.data.color = (1.0, 0.42, 0.15)
        lamp.data.shadow_soft_size = 0.45


def export_and_render():
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parents[1]
    export_dir = project_root / "exports"
    render_dir = project_root / "renders"
    export_dir.mkdir(parents=True, exist_ok=True)
    render_dir.mkdir(parents=True, exist_ok=True)

    glb_path = export_dir / GLB_NAME
    blend_path = export_dir / BLEND_NAME
    render_path = render_dir / RENDER_NAME

    bpy.context.scene.render.filepath = str(render_path)
    bpy.ops.render.render(write_still=True)

    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))

    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )

    print(f"Rendered hero: {render_path}")
    print(f"Saved Blender source: {blend_path}")
    print(f"Exported GLB: {glb_path}")
    return render_path, blend_path, glb_path


def main():
    clear_scene()
    setup_materials()
    setup_scene()
    build_architecture()
    setup_camera_and_lighting()
    export_and_render()
    print(f"{PROJECT_NAME} {VERSION}: generated")


if __name__ == "__main__":
    main()
