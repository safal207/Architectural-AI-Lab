# Blender Villa Pipeline

This folder contains the procedural Blender workflow for the Dubai Luxury Villa AI portfolio project.

## Current target

`blender/scripts/generate_villa.py` creates a concept villa scene with:

- two architectural volumes
- pool and terrace
- glazed facade strips
- balcony
- simple furniture scale cues
- room anchors for `living_room`, `master_bedroom`, and `pool_terrace`
- metric scene units
- basic portfolio camera and sunlight
- automatic GLB export

## Output

The generator writes:

`exports/villa-v0.1.glb`

Room anchors include custom properties such as area and floor so that a later web-viewer export can keep semantic room information.

## Run

From Blender:

```bash
blender --background --python projects/Dubai-Luxury-Villa-AI/blender/scripts/generate_villa.py
```

## Status and limitations

This is a concept massing and presentation asset, not BIM or construction documentation.

The script has been syntax-checked as Python, but a native Blender execution is still required before the generated GLB can be claimed as Blender-verified.

The browser viewer currently contains a separate validated glTF prototype asset. The Blender export should replace it only after export and viewer checks pass.
