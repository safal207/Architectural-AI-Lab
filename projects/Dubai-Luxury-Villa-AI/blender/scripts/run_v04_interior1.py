import importlib.util
import math
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
LIFE2_SOURCE = HERE / "run_v03_life2.py"

spec = importlib.util.spec_from_file_location("villa_v03_life2", LIFE2_SOURCE)
life2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(life2)
life1 = life2.life1

PROJECT_ROOT = HERE.parents[1]
RENDER_PATH = PROJECT_ROOT / "renders" / "villa-v0.4-interior1.png"
BLEND_PATH = PROJECT_ROOT / "exports" / "villa-v0.4-interior1.blend"
GLB_PATH = PROJECT_ROOT / "exports" / "villa-v0.4-interior1.glb"


def material(name, color, roughness=0.65, metallic=0.0, emission=None, emission_strength=0.0):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if emission:
            for key in ("Emission Color", "Emission"):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = (*emission, 1.0)
                    break
            for key in ("Emission Strength",):
                if key in bsdf.inputs:
                    bsdf.inputs[key].default_value = emission_strength
    return mat


def cube(name, size, location, mat=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new(name="soft_edge", type="BEVEL")
        mod.width = bevel
        mod.segments = 3
    if mat:
        obj.data.materials.append(mat)
    return obj


def cylinder(name, radius, depth, location, mat=None, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_point_light(name, location, energy=220.0, color=(1.0, 0.73, 0.47), radius=0.22):
    bpy.ops.object.light_add(type="POINT", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.color = color
    light.data.shadow_soft_size = radius
    return light


def add_tour_anchor(name, location, label, floor, feature):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=location)
    anchor = bpy.context.object
    anchor.name = name
    anchor["tour_label"] = label
    anchor["floor"] = floor
    anchor["tour_feature"] = feature
    return anchor


def add_staircase(stone, metal, warm_light):
    # A real traversable visual staircase linking the ground and upper presentation floors.
    x = -4.15
    start_y = -2.25
    tread = 0.285
    rise = 0.225
    step_width = 1.55
    steps = 14

    for i in range(steps):
        y = start_y + i * tread
        z = 0.38 + i * rise
        cube(
            f"stair_step_v04_{i:02d}",
            (step_width, tread + 0.025, 0.20),
            (x, y, z),
            stone,
            0.018,
        )

    top_y = start_y + (steps - 1) * tread + 0.46
    cube("stair_landing_v04", (2.2, 1.15, 0.20), (x, top_y, 3.43), stone, 0.025)

    # Minimal dark handrail with warm marker lights at the stair edge.
    rail_x = x + step_width * 0.53
    for i in range(0, steps, 2):
        y = start_y + i * tread
        z = 1.22 + i * rise
        cylinder(f"stair_post_v04_{i:02d}", 0.022, 0.95, (rail_x, y, z), metal, 12)
        cylinder(f"stair_marker_v04_{i:02d}", 0.035, 0.03, (rail_x - 0.06, y, z - 0.35), warm_light, 16)

    rail = cube(
        "stair_handrail_v04",
        (0.055, steps * tread + 0.25, 0.055),
        (rail_x, start_y + (steps - 1) * tread / 2, 2.42),
        metal,
        0.012,
    )
    rail.rotation_euler.x = math.radians(-28.5)

    add_tour_anchor("tour_stair_ground", (x + 1.55, start_y - 0.35, 1.65), "Stair Hall", 1, "stairs")
    add_tour_anchor("tour_stair_upper", (x + 1.45, top_y + 0.55, 4.95), "Upper Landing", 2, "stairs")


def add_kitchen_and_dining(walnut, stone, fabric, metal, warm_light):
    # Kitchen wall and island sit behind the dining zone already present in Life2.
    for i in range(4):
        cube(
            f"kitchen_base_v04_{i:02d}",
            (1.25, 0.62, 0.92),
            (1.15 + i * 1.27, -3.48, 0.78),
            walnut,
            0.025,
        )
    cube("kitchen_counter_v04", (5.05, 0.72, 0.10), (3.06, -3.48, 1.29), stone, 0.018)
    cube("kitchen_tall_unit_v04", (1.15, 0.72, 2.55), (5.58, -3.48, 1.55), walnut, 0.03)

    cube("kitchen_island_v04", (3.05, 1.12, 0.92), (2.65, -1.62, 0.78), walnut, 0.05)
    cube("kitchen_island_top_v04", (3.20, 1.22, 0.10), (2.65, -1.62, 1.29), stone, 0.025)

    for i, x in enumerate((1.75, 2.65, 3.55)):
        cylinder(f"island_stool_leg_v04_{i:02d}", 0.12, 0.62, (x, -0.72, 0.62), metal, 16)
        cylinder(f"island_stool_seat_v04_{i:02d}", 0.30, 0.12, (x, -0.72, 0.96), fabric, 24)

    for i, x in enumerate((2.0, 3.15, 4.3)):
        cylinder(f"dining_pendant_v04_{i:02d}", 0.14, 0.18, (x, 0.45, 2.72), warm_light, 24)
        add_point_light(f"dining_light_v04_{i:02d}", (x, 0.45, 2.55), energy=135.0)

    add_tour_anchor("tour_dining", (3.0, 1.65, 1.65), "Kitchen + Dining", 1, "furniture-lighting")


def add_living_details(stone, walnut, fabric, warm_light):
    # Life2 already includes sofa, rug and table. Add a media wall and practical light cues.
    cube("living_media_wall_v04", (4.8, 0.20, 2.35), (-0.30, -3.82, 1.52), walnut, 0.03)
    cube("living_media_console_v04", (3.5, 0.45, 0.42), (-0.30, -3.55, 0.62), stone, 0.04)
    cube("living_screen_v04", (2.5, 0.06, 1.30), (-0.30, -3.66, 1.78), material("V04_Screen", (0.018, 0.022, 0.025), 0.22), 0.015)

    for i, x in enumerate((-2.7, -0.4, 1.9)):
        cylinder(f"living_downlight_v04_{i:02d}", 0.08, 0.05, (x, 1.10, 3.00), warm_light, 20)
        add_point_light(f"living_light_v04_{i:02d}", (x, 1.10, 2.82), energy=105.0)

    add_tour_anchor("tour_living", (-0.6, 2.25, 1.65), "Living Room", 1, "furniture-lighting")


def add_master_suite(walnut, stone, fabric, metal, warm_light):
    bed_z = 3.92
    cube("master_bed_base_v04", (2.25, 2.25, 0.34), (1.75, 0.35, bed_z), walnut, 0.06)
    cube("master_mattress_v04", (2.10, 2.05, 0.30), (1.75, 0.40, bed_z + 0.28), fabric, 0.09)
    cube("master_headboard_v04", (2.55, 0.18, 1.25), (1.75, -0.66, 4.45), fabric, 0.06)
    for i, x in enumerate((0.25, 3.25)):
        cube(f"master_side_table_v04_{i:02d}", (0.62, 0.55, 0.48), (x, -0.25, 3.88), stone, 0.04)
        cylinder(f"master_bedside_lamp_v04_{i:02d}", 0.11, 0.24, (x, -0.25, 4.26), warm_light, 20)
        add_point_light(f"master_light_v04_{i:02d}", (x, -0.25, 4.35), energy=80.0)

    cube("master_wardrobe_v04", (3.25, 0.58, 2.35), (4.20, -2.55, 4.70), walnut, 0.025)
    cube("master_door_v04", (1.05, 0.10, 2.35), (-1.25, -2.85, 4.65), walnut, 0.025)
    cube("master_door_handle_v04", (0.04, 0.04, 0.42), (-0.82, -2.78, 4.62), metal, 0.012)

    add_tour_anchor("tour_master", (1.75, 2.05, 4.95), "Master Bedroom", 2, "furniture-doors-lighting")


def add_ground_doors(walnut, metal):
    cube("private_door_v04", (0.10, 1.08, 2.38), (5.75, -1.85, 1.45), walnut, 0.025)
    cube("private_door_handle_v04", (0.05, 0.05, 0.38), (5.66, -1.48, 1.42), metal, 0.010)
    # Preserve the authored entry door and add a verified tour anchor beside it.
    add_tour_anchor("tour_entry", (-3.55, -2.20, 1.65), "Main Entry", 1, "door-arrival")


def add_pool_anchor():
    add_tour_anchor("tour_pool", (-0.55, 7.05, 1.65), "Pool Terrace", 1, "outdoor")


def build_interior_layer():
    limestone = bpy.data.materials.get("M4_OrganicWarmLimestone") or material("V04_LimestoneFallback", (0.62, 0.53, 0.42), 0.66)
    walnut = bpy.data.materials.get("M2_WalnutTimber") or material("V04_WalnutFallback", (0.18, 0.07, 0.03), 0.48)
    metal = material("V04_CharcoalMetal", (0.025, 0.030, 0.034), 0.28, metallic=0.72)
    fabric = material("V04_QuietFabric", (0.58, 0.53, 0.46), 0.91)
    warm_light = material(
        "V04_WarmEmissive",
        (0.92, 0.65, 0.35),
        0.30,
        emission=(1.0, 0.55, 0.20),
        emission_strength=3.0,
    )

    add_ground_doors(walnut, metal)
    add_staircase(limestone, metal, warm_light)
    add_kitchen_and_dining(walnut, limestone, fabric, metal, warm_light)
    add_living_details(limestone, walnut, fabric, warm_light)
    add_master_suite(walnut, limestone, fabric, metal, warm_light)
    add_pool_anchor()

    # Metadata marker for the web viewer and GLB validation.
    add_tour_anchor("tour_graph_root", (0.0, 0.0, 0.0), "Client Viewing Graph", 0, "tour-root")


def configure_interior_review_camera():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        cameras = [obj for obj in bpy.data.objects if obj.type == "CAMERA"]
        if not cameras:
            raise RuntimeError("No camera available for v0.4 interior review")
        cam = cameras[0]

    # Human-eye interior frame that shows living, dining and the stair connection.
    cam.location = (7.25, 7.90, 1.78)
    cam.data.lens = 26
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.08
    cam.data.clip_end = 180.0
    target = mathutils.Vector((-1.15, -0.10, 1.85))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam


def build_scene():
    life2.build_scene()
    build_interior_layer()
    configure_interior_review_camera()


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
        export_lights=True,
    )

    print(f"Rendered v0.4 Interior1 review: {RENDER_PATH}")
    print(f"Saved v0.4 Interior1 Blender source: {BLEND_PATH}")
    print(f"Exported v0.4 Interior1 GLB: {GLB_PATH}")


def main():
    build_scene()
    save_outputs()
    print("Dubai Luxury Villa AI v0.4 Interior1 — furniture, doors, staircase, lighting and tour anchors generated")


if __name__ == "__main__":
    main()
