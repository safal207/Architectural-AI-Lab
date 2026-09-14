# Dubai Luxury Villa AI

AI-assisted digital-twin presentation prototype for luxury real estate.

## Live demo

**GitHub Pages:** https://safal207.github.io/Architectural-AI-Lab/

The public viewer is built from the gated `v0.3-life2` Blender asset. GitHub Actions verifies the promoted GLB and its provenance before deployment.

## Vision

Transform architectural concepts into interactive digital experiences with a reproducible engineering pipeline.

```text
Concept → Room Data → Blender → GLB → Gate Validation → Three.js Viewer → Deployment
```

## Frozen v0.3 gate chain

```text
Form v0.3-r1.2 PASS / FROZEN
        ↓
Material v0.3-m4 PASS / FROZEN
        ↓
Light v0.3-l2 PASS / FROZEN
        ↓
Life v0.3-life2 PASS / FROZEN
        ↓
Presentation / Three.js viewer
```

Each gate is reviewed separately so later presentation work does not silently rewrite earlier architectural decisions.

## Verified pipeline

- Native **Blender 4.0.2 headless** generation runs in GitHub Actions.
- Blender exports a real **GLB 2.0** asset.
- The frozen Life2 GLB is reproducible against its validation receipt.
- GLB container magic, version and byte length are checked.
- SHA-256 provenance is checked before viewer promotion.
- Room anchors `living_room`, `master_bedroom` and `pool_terrace` are verified inside the GLB.
- Required frozen v0.3 architectural material families are verified inside the GLB.
- The promoted GLB is committed as `web-viewer/app/public/villa.glb`.
- Vite production build passes against that exact promoted asset.
- CI starts the production preview server and byte-compares the served GLB with the promoted file.
- GitHub Pages build and deployment complete successfully.

Current promoted viewer asset:

- version: `v0.3-life2`
- file: `web-viewer/app/public/villa.glb`
- bytes: `7,311,972`
- SHA-256: `715ced4b3c7182618191adcdc9b71cef9320d6b65bc0ba6a691d5c1e0f0e1e51`
- promotion: `APPROVED_FOR_PORTFOLIO_VIEWER`

See:

- [`validation/v0.3-life2-critique.md`](validation/v0.3-life2-critique.md)
- [`validation/v0.3-viewer-promotion.json`](validation/v0.3-viewer-promotion.json)

## Current viewer features

- gated native Blender GLB loading with Three.js `GLTFLoader`
- orbit and zoom camera controls
- room selection and room-anchor focus
- room metadata
- day / evening / night web presentation lighting
- architectural material concept variants with an explicit allow-list
- metadata-grounded property assistant
- investor summary mode

The interactive web lighting/material controls are presentation features; they are not claimed to be pixel-identical to the frozen Blender L2 render.

## Target users

- luxury real estate developers
- architecture studios
- PropTech teams
- investor-facing presentation teams

## Quality layer

Creation and verification are deliberately separated. Generated geometry is not treated as proof by itself: native Blender generation, gate review, GLB integrity, provenance, viewer build, exact asset delivery and Pages deployment have explicit checks.

## Boundaries

This is an AI-assisted architectural visualization and digital-twin portfolio prototype. It is not BIM, engineering, construction documentation, code-compliance evidence, valuation, a sales forecast, or a representation of an existing real property.

## Status

**Public gated portfolio prototype.** The v0.3 Form → Material → Light → Life chain is frozen, the approved Life2 GLB is promoted into the Three.js viewer, CI validates the production build and exact binary delivery, and the viewer is deployed on GitHub Pages.
