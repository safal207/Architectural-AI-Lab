import importlib.util
from pathlib import Path
import bpy

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "generate_villa_v02_hero.py"

spec = importlib.util.spec_from_file_location("villa_v02", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def compatible_setup_scene():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0

    # Ubuntu 24.04 currently ships Blender 4.0.2, where Eevee still uses
    # BLENDER_EEVEE rather than the newer BLENDER_EEVEE_NEXT enum.
    engines = {item.identifier for item in scene.bl_rna.properties['render'].fixed_type.properties['engine'].enum_items} if False else None
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
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass

    world = scene.world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.018, 0.032, 0.055, 1.0)
    bg.inputs["Strength"].default_value = 0.24


module.setup_scene = compatible_setup_scene
module.main()
