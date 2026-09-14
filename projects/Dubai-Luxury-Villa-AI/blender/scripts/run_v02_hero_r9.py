import importlib.util
from pathlib import Path

import bpy
import mathutils

HERE = Path(__file__).resolve().parent
R8_SOURCE = HERE / "run_v02_hero_r8.py"

spec = importlib.util.spec_from_file_location("villa_v02_r8", R8_SOURCE)
r8 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r8)
r7 = r8.r7
r6 = r8.r6
r5 = r8.r5
r4 = r8.r4
r3 = r8.r3
r2 = r8.r2
base = r8.base


def move_prefix(prefixes, dx=0.0, dy=0.0, dz=0.0):
    if isinstance(prefixes, str):
        prefixes = (prefixes,)
    for obj in bpy.data.objects:
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            obj.location.x += dx
            obj.location.y += dy
            obj.location.z += dz


def delete_prefix(prefixes):
    if isinstance(prefixes, str):
        prefixes = (prefixes,)
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(prefix) for prefix in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def set_box(obj_name, dimensions=None, location=None):
    obj = bpy.data.objects.get(obj_name)
    if not obj:
        return
    if dimensions is not None:
        obj.dimensions = dimensions
    if location is not None:
        obj.location = location


def rebuild_massing_r9():
    # Ground floor: open the pavilion toward pool/garden.
    set_box(
        "ground_right_private_core",
        dimensions=(2.45, 7.0, 3.18),
        location=(7.45, -0.55, 1.60),
    )
    delete_prefix("right_core_shadow_gap_r6")

    # Upper floor becomes deliberately asymmetric and lighter.
    set_box(
        "upper_floor_slab",
        dimensions=(14.25, 7.35, 0.24),
        location=(1.55, 0.02, 3.48),
    )
    set_box(
        "upper_private_volume",
        dimensions=(7.25, 5.75, 2.92),
        location=(2.95, 0.18, 4.98),
    )
    set_box(
        "upper_stone_spine",
        dimensions=(3.15, 6.95, 3.12),
        location=(-3.75, -0.08, 5.02),
    )

    # Shift all master-suite facade/interior details with the lighter upper volume.
    move_prefix(
        (
            "master_",
            "balcony_",
            "upper_interior_",
            "timber_fin_",
            "upper_linear_light_r6",
        ),
        dx=1.00,
        dy=0.42,
    )

    # Roof/cantilever hierarchy: one strong horizontal gesture.
    set_box(
        "signature_cantilever",
        dimensions=(11.8, 3.45, 0.25),
        location=(2.75, 4.45, 6.62),
    )
    set_box(
        "roof_plane",
        dimensions=(15.85, 8.70, 0.24),
        location=(1.55, -0.05, 6.72),
    )
    set_box(
        "signature_timber_soffit",
        dimensions=(10.55, 2.78, 0.055),
        location=(2.75, 4.40, 6.47),
    )
    set_box(
        "signature_dark_edge",
        dimensions=(11.9, 0.11, 0.19),
        location=(2.75, 6.14, 6.62),
    )
    set_box(
        "cantilever_linear_light_r6",
        dimensions=(9.4, 0.035, 0.030),
        location=(2.55, 5.72, 6.43),
    )

    # A deep stone blade makes the spine read as structure, not a surface texture.
    stone = bpy.data.materials.get("CreamStonePBR_R8") or bpy.data.materials.get("WarmStonePBR_R5") or base.MATS["WarmTravertine"]
    base.cube(
        "stone_spine_front_blade_r9",
        (0.42, 1.95, 3.02),
        (-4.95, 3.20, 5.02),
        stone,
        0.035,
    )

    # One restrained upper planter softens the long glass edge and reinforces climate response.
    planter = stone
    soil = base.MATS["Soil"]
    base.cube(
        "upper_planter_r9",
        (2.35, 0.52, 0.30),
        (4.65, 3.98, 4.03),
        planter,
        0.035,
    )
    base.cube(
        "upper_planter_soil_r9",
        (2.05, 0.34, 0.12),
        (4.65, 3.98, 4.20),
        soil,
        0.012,
    )
    r7.ribbon_grass_cluster(
        "upper_ribbon_r9",
        (4.65, 3.98, 4.24),
        count=22,
        scale=0.52,
    )


def camera_r9():
    cam = bpy.data.objects.get("hero_camera_v02")
    if not cam:
        return
    cam.location = (26.6, 29.4, 2.88)
    cam.data.lens = 58
    cam.data.shift_y = 0.012
    target = mathutils.Vector((-0.15, 4.58, 2.42))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()


def tune_r9():
    # Preserve dusk ambience but strengthen readable warm life behind the glass.
    living = bpy.data.objects.get("living_warm_r5")
    upper = bpy.data.objects.get("upper_warm_r5")
    if living and living.type == "LIGHT":
        living.data.energy = 385
    if upper and upper.type == "LIGHT":
        upper.data.energy = 285

    scene = bpy.context.scene
    try:
        scene.view_settings.exposure = 0.06
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

    r8.pure_sky_world_r8()
    r8.stone_pbr_r8()
    r8.camera_r8()
    r8.light_balance_r8()

    rebuild_massing_r9()
    camera_r9()
    tune_r9()

    try:
        bpy.ops.file.pack_all()
    except Exception as exc:
        print(f"Warning: pack_all failed: {exc}")

    base.export_and_render()
    print("Dubai Luxury Villa AI v0.2 hero — critic iteration r9 generated")


if __name__ == "__main__":
    main()
