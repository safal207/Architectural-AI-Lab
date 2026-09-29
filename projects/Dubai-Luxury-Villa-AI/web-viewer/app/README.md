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
python -m pip install -r ../../tools/requirements-validation.txt
python -m unittest discover -s ../../tools -p 'test_validate_viewer_asset.py'
python ../../tools/validate_viewer_asset.py
npm run build
```

The asset validator checks the binary digest, source-render receipt, PNG integrity and complete pixel decoding, material families, required nodes, runtime-lighting boundary and pool Guided/Explore separation. The build workflow also verifies exact delivery of the manifest and GLB. Browser QA scripts are under `qa/`; their workflow definitions specify browser dependencies and target URLs.

The model-derived study receipt also binds its images to the renderer's Three.js revision and the dependency lockfile. After changing those dependencies or an export source, regenerate with `node scripts/generate-design-study.mjs` (requires Playwright Chromium), then run `node qa/design-study.mjs` before building.

Build success does not imply a browser QA pass. The reviewed deployed baseline `3dac25f` built and deployed successfully, but [Live Browser QA run 35518268054](https://github.com/safal207/Architectural-AI-Lab/actions/runs/35518268054) found horizontal overflow at 320 px. A fresh deployed run is required to confirm the repair. Earlier Interior2 reports describe a different baseline.

## Viewer behavior

- A persistent Three.js scene loads the GLB once.
- Guided views use authored presentation cameras; Explore uses separate walk anchors and a bounded route.
- Desktop Explore supports drag-to-look, WASD/arrow movement and Esc to pause; touch controls are also available.
- Room selection, the floor plan and the tour route share navigation state.
- Three.js owns day/evening/night lighting; this GLB contains no duplicate Blender punctual lights.
- Material variants, local property information and investor summaries are presentation features.

The floor plan is a navigation schematic. This portfolio prototype is not BIM, measured construction geometry, a full collision simulation, engineering documentation or a property valuation.

## Living atmosphere

The scene now shares one time-of-day and weather state across sky, light, water and planting. Day, evening and night each support clear sky or rain. Wind controls cloud drift, planted foliage and pool ripples. Pause motion freezes the effect clock, and the initial setting respects the system's reduced-motion preference.

- `three/atmosphere.js`: procedural sky, roof-aware rain columns and 128 px sky reflections. Up to six reflection maps are cached by time/weather; moving the wind control does not create more maps.
- `three/livingWater.js`: a transmissive surface fitted to the repaired pool, wind ripples and rain rings. The original GLB and its source provenance remain intact.
- `three/livingDetails.js`: planted foliage with matching shadow deformation, cabinet pulls, timber joints, ceramics and warm fixture details. Rain changes exposed coping and terrace roughness while retaining the selected palette.
- `VillaViewer.jsx`: visible-only effect updates, capped animation cadence, cached static fixture shadows and bounded foliage shadow updates. One loaded model is reused across weather, palette and navigation changes.
- `three/framePacer.js`: a nonblocking GPU fence keeps at most one scene frame in flight. Weather leaves idle time proportional to slow GPU frames while camera changes retain priority. Compact displays use a smaller refraction pass and shadow map; the sky skips pixels already covered by the house.

The pool remains the shallow concept geometry from the source model. Sky reflection is an environment approximation, not a ray-traced reflection of the villa; caustics and rainfall are presentation effects. No external weather, image service or new runtime dependency is required.

With Playwright Chromium installed and a local preview running, run `VILLA_URL=http://127.0.0.1:4173/ node qa/living-atmosphere.mjs`. The browser check covers all six time/weather combinations, real canvas changes, frozen pause frames, wind keyboard input, navigation, one model download, reduced motion and mobile overflow. Use `QA_SCREENSHOTS=1` to save rendered frames.
