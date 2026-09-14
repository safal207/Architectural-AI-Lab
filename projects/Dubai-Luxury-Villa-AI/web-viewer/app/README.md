# Dubai Luxury Villa Viewer App

Interactive digital-twin viewer prototype for the Dubai Luxury Villa AI case.

## Stack

- React
- Three.js
- GLTFLoader
- OrbitControls
- Vite

## Current asset

The viewer now targets `public/villa.glb`, generated natively by Blender in GitHub Actions.

Validated native export receipt:

- Blender: headless GitHub Actions run
- GLB version: 2
- Size: 144748 bytes
- SHA-256: `b2730787baf05cd524701c18c1609031085407329fd0628fcdee73e2c409f48c`
- Container length check: PASS

The same validated output is stored as:

- `projects/Dubai-Luxury-Villa-AI/exports/villa-v0.1.glb`
- `projects/Dubai-Luxury-Villa-AI/web-viewer/app/public/villa.glb`
- `projects/Dubai-Luxury-Villa-AI/validation/native-blender-export.json`

## MVP features

- Load the Blender-exported villa GLB
- Orbit and zoom controls
- Select room metadata
- Focus controls on named room anchors when present
- Day / evening / night lighting concept
- Material concept variants
- Local metadata-grounded property assistant
- Investor summary mode

## Boundaries

This is a portfolio digital-twin prototype, not BIM, construction documentation, structural engineering, or a property valuation.
