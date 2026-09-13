"""Generate the Dubai Luxury Villa concept GLB used by the web viewer.

This script creates a deterministic concept-massing asset. It is a portfolio
prototype and not construction or BIM documentation.

Requires:
    pip install trimesh numpy
"""

from pathlib import Path
import hashlib
import json

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "web-viewer" / "app" / "public" / "villa.glb"
METADATA = ROOT / "web-viewer" / "app" / "public" / "villa.asset.json"


def pbr(name, rgba, metallic=0.0, roughness=0.6):
    return trimesh.visual.material.PBRMaterial(
        name=name,
        baseColorFactor=np.array(rgba) / 255.0,
        metallicFactor=metallic,
        roughnessFactor=roughness,
    )


def add_box(scene, name, extents, center, material):
    mesh = trimesh.creation.box(extents=extents)
    mesh.apply_translation(center)
    mesh.visual = trimesh.visual.TextureVisuals(material=material)
    scene.add_geometry(mesh, node_name=name, geom_name=name)


def build_scene():
    scene = trimesh.Scene()

    materials = {
        "stone": pbr("WarmStone", [210, 203, 191, 255], roughness=0.75),
        "wood": pbr("WarmWood", [145, 96, 61, 255], roughness=0.65),
        "dark": pbr("DarkStone", [52, 56, 61, 255], metallic=0.05, roughness=0.55),
        "glass": pbr("GlassTint", [110, 175, 205, 150], roughness=0.15),
        "water": pbr("PoolWater", [48, 150, 190, 210], roughness=0.08),
        "land": pbr("Landscape", [95, 120, 78, 255], roughness=0.90),
        "metal": pbr("MetalTrim", [70, 77, 84, 255], metallic=0.65, roughness=0.30),
    }

    add_box(scene, "site_base", (26, 22, 0.35), (0, 0, -0.175), materials["land"])
    add_box(scene, "ground_slab", (20, 14, 0.35), (0, 0, 0.175), materials["stone"])

    add_box(scene, "living_room", (10.5, 7.0, 3.2), (-3.5, 1.5, 1.95), materials["stone"])
    add_box(scene, "kitchen", (5.2, 5.0, 3.2), (5.0, 1.8, 1.95), materials["wood"])
    add_box(scene, "lobby", (3.2, 4.0, 3.2), (1.3, -3.6, 1.95), materials["dark"])

    add_box(scene, "pool_terrace", (15.5, 4.5, 0.25), (0, -7.25, 0.48), materials["stone"])
    add_box(scene, "pool_water", (9.0, 3.0, 0.15), (-1.5, -7.4, 0.62), materials["water"])
    add_box(scene, "pool_edge_left", (0.45, 3.7, 0.45), (-6.25, -7.4, 0.66), materials["stone"])
    add_box(scene, "pool_edge_right", (0.45, 3.7, 0.45), (3.25, -7.4, 0.66), materials["stone"])

    add_box(scene, "upper_slab", (17.5, 9.0, 0.35), (-0.5, 0.6, 3.75), materials["dark"])
    add_box(scene, "master_bedroom", (8.0, 6.2, 3.0), (-3.5, 1.2, 5.45), materials["stone"])
    add_box(scene, "private_office", (4.7, 4.2, 3.0), (4.1, 1.7, 5.45), materials["wood"])
    add_box(scene, "sky_terrace", (7.5, 3.2, 0.25), (3.2, -3.9, 4.05), materials["stone"])
    add_box(scene, "roof_main", (17.8, 9.3, 0.28), (-0.5, 0.6, 7.05), materials["dark"])

    add_box(scene, "glass_living", (0.15, 6.0, 2.5), (-8.82, 1.5, 2.0), materials["glass"])
    add_box(scene, "glass_master", (0.15, 5.1, 2.4), (-7.52, 1.2, 5.5), materials["glass"])
    add_box(scene, "glass_office", (0.15, 3.5, 2.4), (6.47, 1.7, 5.5), materials["glass"])

    for x in (-7.5, -2.5, 2.5, 7.0):
        add_box(scene, f"column_{x}", (0.28, 0.28, 3.5), (x, -4.7, 2.0), materials["metal"])

    for x in np.linspace(-6.5, 6.5, 6):
        add_box(scene, f"pergola_{x:.1f}", (0.18, 4.0, 0.18), (x, -5.0, 3.5), materials["wood"])

    for i in range(5):
        add_box(
            scene,
            f"step_{i}",
            (3.0, 0.75, 0.18),
            (6.5, -4.5 - i * 0.45, 0.15 + i * 0.18),
            materials["stone"],
        )

    return scene


def main():
    scene = build_scene()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    data = scene.export(file_type="glb")
    OUTPUT.write_bytes(data)

    metadata = {
        "asset": OUTPUT.name,
        "version": "0.1",
        "kind": "procedural-concept-massing",
        "generator": "Python + trimesh",
        "dimensions_m": {"x": 26.0, "y": 22.0, "z": 7.54},
        "named_nodes": [
            "living_room",
            "kitchen",
            "lobby",
            "pool_terrace",
            "pool_water",
            "master_bedroom",
            "private_office",
            "sky_terrace",
        ],
        "sha256": hashlib.sha256(data).hexdigest(),
        "limitations": [
            "Portfolio concept massing, not construction documentation",
            "Generated with trimesh, not Blender",
            "Materials and dimensions are conceptual",
            "Not a BIM deliverable",
        ],
    }
    METADATA.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    print(f"SHA-256: {metadata['sha256']}")


if __name__ == "__main__":
    main()
