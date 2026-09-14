import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "run_v02_hero_r3.py"

spec = importlib.util.spec_from_file_location("villa_v02_r3", SOURCE)
r3 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r3)

_original_configure = r3.configure_cycles_and_blue_hour


def configure_cycles_without_oidn():
    _original_configure()
    scene = r3.bpy.context.scene
    scene.cycles.use_denoising = False
    scene.cycles.samples = 64
    try:
        scene.cycles.adaptive_threshold = 0.04
    except Exception:
        pass
    print("Cycles CPU: OpenImageDenoiser disabled for Ubuntu Blender build; samples=64")


r3.configure_cycles_and_blue_hour = configure_cycles_without_oidn
r3.main()
