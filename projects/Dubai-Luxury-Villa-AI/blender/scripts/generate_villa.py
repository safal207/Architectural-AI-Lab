import bpy
import math
from pathlib import Path
import mathutils

PROJECT_NAME = "Dubai Luxury Villa AI"
EXPORT_NAME = "villa-v0.1.glb"

GROUND_SIZE = (28.0, 22.0)
LOWER_SIZE = (14.0, 8.5, 3.4)
UPPER_SIZE = (10.5, 6.5, 3.1)
WING_SIZE = (5.0, 5.0, 3.0)
POOL_SIZE = (10.0, 4.0, 0.35)

MATERIALS = {}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def make_material(name, base_color, roughness=0.5, metallic=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha

    if alpha < 1.0:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"

    MATERIALS[name] = mat
    return mat


def cube(name, size, location, material=None, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new(name="Soft edges", type="BEVEL")
        mod.width = bevel
        mod.segments = 3
    if material:
        obj.data.materials.append(material)
    return obj


def plane(name, size, location, material=None):
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (size[0] / 2.0, size[1] / 2.0, 1.0)
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


def setup_materials():
    make_material("WarmStone", (0.73, 0.68, 0.60), roughness=0.62)
    make_material("LightPlaster", (0.90, 0.89, 0.86), roughness=0.72)
    make_material("WoodAccent", (0.30, 0.17, 0.09), roughness=0.52)
    make_material("MetalTrim", (0.08, 0.09, 0.10), roughness=0.32, metallic=0.55)
    make_material("GlassTint", (0.40, 0.66, 0.78), roughness=0.08, alpha=0.34)
    make_material("PoolWater", (0.05, 0.48, 0.63), roughness=0.12, alpha=0.82)
    make_material("Landscape", (0.16, 0.30, 0.13), roughness=0.95)


def add_window_strip(prefix, xs, y, z):
    glass = MATERIALS["GlassTint"]
    for idx, x in enumerate(xs, 1):
        cube(f"{prefix}_glass_{idx:02d}", (1.75, 0.08, 2.2), (x, y, z), glass)


def build_villa():
    stone = MATERIALS["WarmStone"]
    plaster = MATERIALS["LightPlaster"]
    wood = MATERIALS["WoodAccent"]
    water = MATERIALS["PoolWater"]
    landscape = MATERIALS["Landscape"]

    cube("site_slab", (*GROUND_SIZE, 0.28), (0, 0, -0.14), stone)
    plane("garden_plane", (40, 34), (0, 0, -0.30), landscape)
    cube("ground_floor_main", LOWER_SIZE, (-2.0, 0.0, LOWER_SIZE[2] / 2), plaster, 0.08)
    cube("ground_floor_wing", WING_SIZE, (7.0, -0.5, WING_SIZE[2] / 2), plaster, 0.08)
    cube("upper_floor_main", UPPER_SIZE, (1.0, -0.5, LOWER_SIZE[2] + UPPER_SIZE[2] / 2), plaster, 0.08)
    cube("upper_canopy", (12.6, 7.3, 0.24), (1.0, -0.5, 6.65), stone, 0.04)
    cube("entry_canopy", (5.3, 2.4, 0.18), (-6.7, -4.0, 3.0), wood, 0.03)
    cube("pool_shell", POOL_SIZE, (-3.0, 8.0, 0.05), stone, 0.12)
    cube("pool_water", (9.6, 3.6, 0.08), (-3.0, 8.0, 0.23), water)
    cube("pool_deck", (15.0, 5.4, 0.20), (-1.0, 7.6, 0.10), stone)

    add_window_strip("living_room", [-6.8, -4.8, -2.8, -0.8, 1.2, 3.2], 4.28, 1.8)
    add_window_strip("master_bedroom", [-1.2, 0.8, 2.8, 4.8], 2.78, 5.1)
    cube("master_balcony", (8.7, 2.0, 0.16), (1.0, 4.0, 3.55), stone)
    cube("balcony_glass", (8.5, 0.06, 1.0), (1.0, 4.95, 4.05), MATERIALS["GlassTint"])

    add_room_anchor("living_room", (-2.6, 2.1, 1.4), 75, 1)
    add_room_anchor("master_bedroom", (1.6, 1.4, 5.0), 52, 2)
    add_room_anchor("pool_terrace", (-3.0, 7.0, 0.4), 46, 1)

    cube("living_sofa", (3.1, 1.0, 0.75), (-3.0, 1.7, 0.42), wood, 0.15)
    cube("living_table", (1.6, 0.9, 0.40), (-1.2, 2.2, 0.24), stone, 0.10)
    cube("master_bed", (2.1, 2.2, 0.55), (1.4, -0.3, 3.75), wood, 0.10)


def setup_scene():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0

    engine_ids = {item.identifier for item in scene.bl_rna.properties["render"].fixed_type.properties["engine"].enum_items} if False else set()
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        try:
            scene.render.engine = "BLENDER_EEVEE"
        except Exception:
            pass

    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.world.color = (0.035, 0.045, 0.060)


def setup_camera_and_lights():
    bpy.ops.object.camera_add(location=(24.0, -27.0, 18.0))
    cam = bpy.context.object
    cam.name = "portfolio_camera"
    bpy.context.scene.camera = cam
    target = mathutils.Vector((0.0, 1.5, 2.5))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

    bpy.ops.object.light_add(type="SUN", location=(12, -10, 22))
    sun = bpy.context.object
    sun.name = "sun"
    sun.data.energy = 2.4
    sun.rotation_euler = (math.radians(38), 0, math.radians(28))


def export_glb():
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parents[1]
    export_dir = project_root / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    out = export_dir / EXPORT_NAME

    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_extras=True,
    )
    print(f"Exported: {out}")
    return out


def validate_scene_contract():
    required = ["living_room", "master_bedroom", "pool_terrace"]
    missing = [name for name in required if bpy.data.objects.get(name) is None]
    if missing:
        raise RuntimeError(f"Missing room anchors: {missing}")

    for name in required:
        obj = bpy.data.objects[name]
        if "area_sqm" not in obj or "floor" not in obj:
            raise RuntimeError(f"Room anchor lacks metadata: {name}")


def main():
    print(f"Blender version: {bpy.app.version_string}")
    clear_scene()
    setup_materials()
    setup_scene()
    build_villa()
    setup_camera_and_lights()
    validate_scene_contract()
    out = export_glb()
    if not out.exists() or out.stat().st_size < 20:
        raise RuntimeError("GLB export is missing or unexpectedly small")
    print(f"{PROJECT_NAME}: v0.1 generated ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
