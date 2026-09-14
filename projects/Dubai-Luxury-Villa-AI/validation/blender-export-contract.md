# Blender Export Contract

This document defines the acceptance boundary for replacing the current browser prototype asset with the Blender-generated villa.

## Required output

Expected file:

`exports/villa-v0.1.glb`

## Geometry checks

- the file is non-empty and opens in a glTF-capable viewer
- scale uses meters consistently
- the main ground-floor and upper-floor masses are present
- pool and terrace geometry are present
- transparent glass elements remain visible
- no unexpected giant or zero-scale objects appear

## Semantic checks

The exported scene must contain room anchors named:

- `living_room`
- `master_bedroom`
- `pool_terrace`

Where supported by export, their metadata should preserve:

- room name
- area in square meters
- floor

## Material checks

Expected named materials include:

- `WarmStone`
- `LightPlaster`
- `WoodAccent`
- `GlassTint`
- `PoolWater`
- `Landscape`

Material appearance does not need to match Blender pixel-for-pixel after glTF export, but major surface categories must remain distinguishable.

## Viewer checks

Before replacing the current web asset:

1. Load the exported model with `GLTFLoader`.
2. Orbit and zoom without console errors.
3. Select Living Room and verify the camera target resolves to `living_room`.
4. Repeat for Master Bedroom and Pool Terrace.
5. Check Day / Evening / Night lighting modes.
6. Check material variant behavior without recoloring glass and water unintentionally.
7. Build the Vite app successfully.

## Claim boundary

Passing this checklist demonstrates a working portfolio digital-twin prototype only.

It does **not** demonstrate BIM accuracy, structural correctness, construction readiness, code compliance, cost estimation, or a surveyed as-built digital twin.
