# Dubai Luxury Villa AI

AI-assisted digital-twin presentation prototype for luxury real estate.

## Live demo

**GitHub Pages:** https://safal207.github.io/Architectural-AI-Lab/

The public viewer now runs the gated `v0.4-interior2` Blender asset: a real GLB containing the frozen exterior baseline plus an interior presentation layer with furniture, kitchen elements, doors, practical lighting cues, a refined staircase, upper landing/corridor connection and a hollow master-suite shell.

The live page is structured as a developer-facing portfolio case: value proposition → verified proof → client viewing graph → interactive house plan → virtual tour → bounded pilot offer.

## Client house viewing graph

```text
Exterior overview
      ↓
Main entry
      ↓
Living room
      ↓
Kitchen + dining
      ↓
Stair hall
      ↓
Upper landing
      ↓
Master bedroom
      ↓
Pool terrace
```

The web viewer contains a two-floor **navigation schematic** linked to this route. Selecting plan zones or graph nodes changes the room/tour state. Guided first-person mode uses named Blender-authored camera anchors and curated look targets; click the 3D view for pointer-lock free look and use WASD/arrow keys to move.

Free-walk currently has **no collision/navmesh guarantee**, so the prototype does not claim physically constrained traversal through every opening or stair tread. The plan is not a measured architectural drawing.

## Developer pilot offer

**5-day digital twin pilot** — a deliberately small first engagement intended to test whether one property concept or one priority zone can become a useful interactive presentation before committing to a larger visualization programme.

Pilot framing shown on the live site:

- one property concept or one priority zone
- Blender → GLB → web-viewer path
- core interaction and room-linked metadata
- QA receipt with explicit claim boundaries

The five-day framing is a service offer, not a blanket delivery guarantee. Scope, source quality, access and required outputs must be agreed first. The public GitHub intake must not contain confidential client materials.

## Verified gate chain

```text
Form v0.3-r1.2 PASS / FROZEN
        ↓
Material v0.3-m4 PASS / FROZEN
        ↓
Light v0.3-l2 PASS / FROZEN
        ↓
Life v0.3-life2 PASS / FROZEN
        ↓
Interior Tour v0.4-interior2 PASS / FROZEN
        ↓
Three.js viewer promotion
        ↓
GitHub Pages
        ↓
Live desktop/mobile browser QA
```

The Interior2 visual gate was frozen only after actual first-person Blender review showed the living/dining interior, staircase, hollow master suite, furniture, door and upper-floor connection.

## Current promoted viewer asset

- version: `v0.4-interior2`
- file: `web-viewer/app/public/villa.glb`
- bytes: `7,845,032`
- SHA-256: `fde86661b3b7ba4ce3352a56b83ad87156428feafd32d2d406dd12529eb97aed`
- promotion: `APPROVED_FOR_PORTFOLIO_VIEWER`

Verified content includes:

- room anchors: `living_room`, `master_bedroom`, `pool_terrace`
- named client-tour camera anchors for entry, living, dining, stair ground, stair upper, master and pool
- named curated look targets for those tour stops
- kitchen island / interior furniture layer
- living media wall
- interior doors and handles
- staircase, landing, refined rail and glazed guard
- physical presentation bridge from upper stair landing toward the master-suite entrance
- hollow master-suite floor / ceiling / walls rather than the former solid upper private mass
- frozen v0.3 architectural material families retained in the GLB

## Live proof

Viewer Build run `34956892995` — **PASS**.

GitHub Pages deploy run `34956893039` — **PASS**.

Post-deploy Live Browser QA run `34956959256` — **PASS** against the real public URL and the promoted `v0.4-interior2` asset.

Live QA confirms:

- live GLB bytes and SHA-256 match provenance
- house plan — PASS
- client viewing graph — PASS
- first-person mode state — PASS
- Master Bedroom selection — PASS
- Night lighting state — PASS
- Warm Wood presentation state — PASS
- orbit/zoom smoke path — PASS
- mobile house plan / graph / room path — PASS
- mobile horizontal overflow — none
- console errors — `0`
- uncaught page errors — `0`
- failed HTTP responses — `0`

See:

- [`validation/v0.4-interior2-critique.md`](validation/v0.4-interior2-critique.md)
- [`validation/v0.4-interior2-receipt.json`](validation/v0.4-interior2-receipt.json)
- [`validation/v0.4-viewer-promotion.json`](validation/v0.4-viewer-promotion.json)
- [`validation/live-browser-qa.md`](validation/live-browser-qa.md)

## Current viewer features

- developer-facing luxury real-estate case narrative
- bounded 5-day pilot CTA through public GitHub issue intake
- gated native Blender GLB loading with Three.js `GLTFLoader`
- two-floor interactive house navigation plan
- ordered client viewing graph
- guided first-person tour stops with authored camera/look anchors
- pointer-lock free look + WASD/arrow-key movement prototype
- orbit and zoom camera controls
- room selection and room-anchor focus
- interior furniture / kitchen / door / staircase / master-suite presentation geometry
- day / evening / night web presentation lighting
- architectural material concept variants with an explicit allow-list
- metadata-grounded property assistant
- investor summary mode
- post-deploy desktop/mobile browser QA with screenshot evidence

The interactive web lighting/material controls are presentation features; they are not claimed to be pixel-identical to the frozen native Blender render.

## Target users

- luxury real estate developers
- architecture studios
- PropTech teams
- investor-facing presentation teams

## Quality layer

Creation and verification are deliberately separated. Generated geometry is not treated as proof by itself: native Blender generation, gate review, GLB integrity, provenance, viewer build, exact asset delivery, Pages deployment and live-browser interaction have explicit checks.

## Boundaries

This is an AI-assisted architectural visualization and digital-twin / virtual-tour portfolio prototype. It is not BIM, engineering, construction documentation, a measured floor plan, accessibility/code-compliance evidence, valuation, sales forecasting, as-built documentation, or a representation of an existing real property.

## Status

**Public gated v0.4 virtual-house-tour prototype with live browser proof.** The frozen v0.3 exterior/material/light/life baseline now carries a gated Interior2 presentation layer, two-floor navigation plan and client viewing graph, and the real promoted v0.4 GLB passes build, Pages deployment and post-deploy desktop/mobile browser QA.
