"""Generate the canonical Dubai Luxury Villa glTF concept asset.

Pure Python standard-library generator. The output is deterministic and intended
for portfolio visualization only; it is not BIM or construction documentation.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "web-viewer" / "app" / "public" / "villa.gltf"
METADATA = ROOT / "web-viewer" / "app" / "public" / "villa.asset.json"

BUFFER_B64 = "AAAAPwAAAL8AAAC/AAAAPwAAAD8AAAC/AAAAPwAAAD8AAAA/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAA/AAAAvwAAAD8AAAA/AAAAvwAAAD8AAAC/AAAAvwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAvwAAAD8AAAA/AAAAPwAAAD8AAAA/AAAAPwAAAD8AAAC/AAAAvwAAAL8AAAA/AAAAvwAAAL8AAAC/AAAAPwAAAL8AAAC/AAAAPwAAAL8AAAA/AAAAvwAAAL8AAAA/AAAAPwAAAL8AAAA/AAAAPwAAAD8AAAA/AAAAvwAAAD8AAAA/AAAAPwAAAL8AAAC/AAAAvwAAAL8AAAC/AAAAvwAAAD8AAAC/AAAAPwAAAD8AAAC/AACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAPwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAACAvwAAAAAAAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAgL8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAAAAAAAAAAAAIC/AAABAAIAAAACAAMABAAFAAYABAAGAAcACAAJAAoACAAKAAsADAANAA4ADAAOAA8AEAARABIAEAASABMAFAAVABYAFAAWABcA"

MATERIALS = [
    {"name": "Landscape", "pbrMetallicRoughness": {"baseColorFactor": [0.37, 0.47, 0.31, 1], "roughnessFactor": 0.9}},
    {"name": "WarmStone", "pbrMetallicRoughness": {"baseColorFactor": [0.82, 0.8, 0.75, 1], "roughnessFactor": 0.75}},
    {"name": "WarmWood", "pbrMetallicRoughness": {"baseColorFactor": [0.57, 0.38, 0.24, 1], "roughnessFactor": 0.65}},
    {"name": "DarkStone", "pbrMetallicRoughness": {"baseColorFactor": [0.2, 0.22, 0.24, 1], "metallicFactor": 0.05, "roughnessFactor": 0.55}},
    {"name": "PoolWater", "pbrMetallicRoughness": {"baseColorFactor": [0.19, 0.59, 0.75, 0.82], "roughnessFactor": 0.08}, "alphaMode": "BLEND", "doubleSided": True},
    {"name": "GlassTint", "pbrMetallicRoughness": {"baseColorFactor": [0.43, 0.69, 0.8, 0.45], "roughnessFactor": 0.15}, "alphaMode": "BLEND", "doubleSided": True},
    {"name": "MetalTrim", "pbrMetallicRoughness": {"baseColorFactor": [0.27, 0.3, 0.33, 1], "metallicFactor": 0.65, "roughnessFactor": 0.3}},
]

MESH_NAMES = ["LandscapeBox", "WarmStoneBox", "WarmWoodBox", "DarkStoneBox", "PoolWaterBox", "GlassTintBox", "MetalTrimBox"]

BOXES = [
    ("site_base", 0, [26, 0.35, 22], [0, -0.175, 0]),
    ("ground_slab", 1, [20, 0.35, 14], [0, 0.175, 0]),
    ("living_room", 1, [10.5, 3.2, 7], [-3.5, 1.95, 1.5]),
    ("kitchen", 2, [5.2, 3.2, 5], [5.0, 1.95, 1.8]),
    ("lobby", 3, [3.2, 3.2, 4], [1.3, 1.95, -3.6]),
    ("pool_terrace", 1, [15.5, 0.25, 4.5], [0, 0.48, -7.25]),
    ("pool_water", 4, [9, 0.15, 3], [-1.5, 0.62, -7.4]),
    ("upper_slab", 3, [17.5, 0.35, 9], [-0.5, 3.75, 0.6]),
    ("master_bedroom", 1, [8, 3.0, 6.2], [-3.5, 5.45, 1.2]),
    ("private_office", 2, [4.7, 3.0, 4.2], [4.1, 5.45, 1.7]),
    ("sky_terrace", 1, [7.5, 0.25, 3.2], [3.2, 4.05, -3.9]),
    ("roof_main", 3, [17.8, 0.28, 9.3], [-0.5, 7.05, 0.6]),
    ("glass_living", 5, [0.15, 2.5, 6], [-8.82, 2.0, 1.5]),
    ("glass_master", 5, [0.15, 2.4, 5.1], [-7.52, 5.5, 1.2]),
    ("glass_office", 5, [0.15, 2.4, 3.5], [6.47, 5.5, 1.7]),
    ("column_-7.5", 6, [0.28, 3.5, 0.28], [-7.5, 2.0, -4.7]),
    ("column_-2.5", 6, [0.28, 3.5, 0.28], [-2.5, 2.0, -4.7]),
    ("column_2.5", 6, [0.28, 3.5, 0.28], [2.5, 2.0, -4.7]),
    ("column_7.0", 6, [0.28, 3.5, 0.28], [7.0, 2.0, -4.7]),
    ("pergola_-6.5", 2, [0.18, 0.18, 4.0], [-6.5, 3.5, -5.0]),
    ("pergola_-3.9", 2, [0.18, 0.18, 4.0], [-3.9, 3.5, -5.0]),
    ("pergola_-1.3", 2, [0.18, 0.18, 4.0], [-1.2999999999999998, 3.5, -5.0]),
    ("pergola_1.3", 2, [0.18, 0.18, 4.0], [1.3000000000000007, 3.5, -5.0]),
    ("pergola_3.9", 2, [0.18, 0.18, 4.0], [3.9000000000000004, 3.5, -5.0]),
    ("pergola_6.5", 2, [0.18, 0.18, 4.0], [6.5, 3.5, -5.0]),
    ("step_0", 1, [3.0, 0.18, 0.75], [6.5, 0.15, -4.5]),
    ("step_1", 1, [3.0, 0.18, 0.75], [6.5, 0.32999999999999996, -4.95]),
    ("step_2", 1, [3.0, 0.18, 0.75], [6.5, 0.51, -5.4]),
    ("step_3", 1, [3.0, 0.18, 0.75], [6.5, 0.6900000000000001, -5.85]),
    ("step_4", 1, [3.0, 0.18, 0.75], [6.5, 0.87, -6.3]),
]


def build_model():
    meshes = [
        {"name": name, "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": index}]}
        for index, name in enumerate(MESH_NAMES)
    ]

    nodes = [{"name": "world", "children": list(range(1, len(BOXES) + 1))}]
    nodes.extend({"name": name, "mesh": mesh, "scale": scale, "translation": translation} for name, mesh, scale, translation in BOXES)

    return {
        "asset": {"version": "2.0", "generator": "Architectural-AI-Lab tiny glTF generator"},
        "scene": 0,
        "scenes": [{"name": "DubaiLuxuryVillaV01", "nodes": [0]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": MATERIALS,
        "buffers": [{"byteLength": 648, "uri": "data:application/octet-stream;base64," + BUFFER_B64}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": 288, "target": 34962},
            {"buffer": 0, "byteOffset": 288, "byteLength": 288, "target": 34962},
            {"buffer": 0, "byteOffset": 576, "byteLength": 72, "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "byteOffset": 0, "componentType": 5126, "count": 24, "type": "VEC3", "min": [-0.5, -0.5, -0.5], "max": [0.5, 0.5, 0.5]},
            {"bufferView": 1, "byteOffset": 0, "componentType": 5126, "count": 24, "type": "VEC3"},
            {"bufferView": 2, "byteOffset": 0, "componentType": 5123, "count": 36, "type": "SCALAR", "min": [0], "max": [23]},
        ],
    }


def main():
    model = build_model()
    data = json.dumps(model, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(data)

    metadata = {
        "asset": OUTPUT.name,
        "version": "0.1",
        "kind": "procedural-concept-massing",
        "format": "glTF 2.0 with embedded buffer",
        "generator": "Architectural-AI-Lab deterministic stdlib generator",
        "dimensions_m": {"x": 26.0, "y": 7.54, "z": 22.0},
        "named_nodes": ["living_room", "kitchen", "lobby", "pool_terrace", "pool_water", "master_bedroom", "private_office", "sky_terrace"],
        "sha256": hashlib.sha256(data).hexdigest(),
        "limitations": [
            "Portfolio concept massing, not construction documentation",
            "Current canonical asset is generated directly as glTF and is not a Blender export",
            "Materials and dimensions are conceptual",
            "Not a BIM deliverable",
        ],
    }
    METADATA.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    print(f"SHA-256: {metadata['sha256']}")


if __name__ == "__main__":
    main()
