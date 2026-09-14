# End-to-End Proof — Dubai Luxury Villa AI

This file records only checks that have actually completed successfully in the repository workflows.

## Verified pipeline

```text
Blender generator
  ↓
Blender 4.0.2 headless execution
  ↓
GLB 2.0 export
  ↓
Container validation + SHA-256 receipt
  ↓
Publish validated GLB into viewer assets
  ↓
React / Three.js production build
  ↓
Preview server smoke test
  ↓
HTML + villa.glb served successfully
```

## Native Blender export

Workflow: `Blender Native Export`

Successful native export run: `34811482006`

Published-asset run: `34811650866`

Both the Blender generation and GLB validation completed successfully before the asset was published into the viewer.

Validated asset:

- File: `exports/villa-v0.1.glb`
- Viewer copy: `web-viewer/app/public/villa.glb`
- GLB version: `2`
- Bytes: `144748`
- SHA-256: `b2730787baf05cd524701c18c1609031085407329fd0628fcdee73e2c409f48c`
- Container length check: `PASS`
- Generator: `Blender headless via GitHub Actions`

The generated asset and receipt were committed back to `main` by GitHub Actions in commit `588fe4dea37bff79e4a610d3d2ca3adfede2f394`.

## Viewer integration

The viewer loads `public/villa.glb` using Three.js `GLTFLoader`.

Current interactions include:

- orbit and zoom controls;
- room selection;
- room-anchor focus for `living_room`, `master_bedroom`, and `pool_terrace` when present in the GLB;
- day / evening / night lighting concept;
- material concept variants;
- metadata-grounded property assistant;
- investor summary mode.

A fallback massing remains only as an explicit failure fallback if the GLB cannot be loaded.

## Viewer CI

`Viewer Build` verifies:

1. `public/villa.glb` exists and is non-empty;
2. GLB magic is `glTF`;
3. GLB version is `2`;
4. GLB container length matches the file size;
5. the Vite production build completes;
6. a local preview server starts;
7. viewer HTML is served successfully;
8. `villa.glb` is served successfully from the built application.

The native-GLB viewer build and smoke test completed successfully in run `34811847890`.

A later build is also archived as the `dubai-villa-viewer-dist` GitHub Actions artifact for reproducible inspection.

## What this proves

This evidence supports the claim that the repository has a reproducible pipeline from procedural Blender generation to a validated GLB asset and a buildable browser-based Three.js viewer that serves that asset.

## What this does not prove

This does **not** establish that the model is:

- BIM-compliant;
- construction-ready;
- structurally engineered;
- an accurate representation of a real property;
- photorealistic final visualization;
- deployed publicly through GitHub Pages;
- a property valuation or sales forecast.

The project remains a portfolio digital-twin prototype with explicit engineering evidence and boundaries.
