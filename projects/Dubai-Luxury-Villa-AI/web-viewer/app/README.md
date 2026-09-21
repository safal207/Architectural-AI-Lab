# Dubai Luxury Villa Viewer App

React / Three.js viewer for the [Dubai Luxury Villa AI concept](../../README.md), built with Vite. The live app presents a furnished villa and pool landscape through Guided views, Explore movement and a two-floor navigation schematic.

## Run locally

Use Node.js 22, matching the build workflow. From this directory:

```sh
npm ci
npm run dev
```

Create and serve the production build with:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Current asset

`public/villa.glb` is **Pool Context v4**, exported from the native Blender pipeline. It is not the original v0.1 export stored under `exports/`.

- Stored identifier: `v0.4-pool-context-v4-feature-candidate`.
- Format: GLB 2.0.
- Size: `8,613,156` bytes.
- SHA-256: `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115`.
- Manifest: [`public/villa.asset.json`](public/villa.asset.json).

The stored identifier retains the asset's original feature-development name; the model is now included on `main`. Original source receipts remain historical evidence rather than a claim that the current branch is feature-only.

## Validation

From this directory, with Python 3 available:

```sh
python -m unittest discover -s ../../tools -p 'test_validate_viewer_asset.py'
python ../../tools/validate_viewer_asset.py
npm run build
```

The asset validator checks the binary digest, source-render receipt, material families, required nodes, runtime-lighting boundary and pool Guided/Explore separation. The build workflow also verifies exact delivery of the manifest and GLB. Browser QA scripts are under `qa/`; their workflow definitions specify browser dependencies and target URLs.

Build success does not imply a browser QA pass. The reviewed deployed baseline `3dac25f` built and deployed successfully, but [Live Browser QA run 35518268054](https://github.com/safal207/Architectural-AI-Lab/actions/runs/35518268054) found horizontal overflow at 320 px. A fresh deployed run is required to confirm the repair. Earlier Interior2 reports describe a different baseline.

## Viewer behavior

- A persistent Three.js scene loads the GLB once.
- Guided views use authored presentation cameras; Explore uses separate walk anchors and a bounded route.
- Desktop Explore supports pointer-lock look, WASD/arrow movement and Esc to release the pointer; touch controls are also available.
- Room selection, the floor plan and the tour route share navigation state.
- Three.js owns day/evening/night lighting; this GLB contains no duplicate Blender punctual lights.
- Material variants, local property information and investor summaries are presentation features.

The floor plan is a navigation schematic. This portfolio prototype is not BIM, measured construction geometry, a full collision simulation, engineering documentation or a property valuation.
