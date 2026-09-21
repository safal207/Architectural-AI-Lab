# Architectural-AI-Lab

AI-assisted architectural visualization for villas, kitchens and home interiors: native Blender studies, material exploration and interactive 3D tours.

## Featured project — Dubai residence

**Desert, distilled.** A contemporary home explored through warm stone, timber, sheltered interiors and a pool-side landscape.

![Pool Context v4 — native Blender exterior study](projects/Dubai-Luxury-Villa-AI/web-viewer/app/public/editorial/residence-1600.webp)

[Public villa demo](https://safal207.github.io/Architectural-AI-Lab/) · [Editorial redesign — draft PR #9](https://github.com/safal207/Architectural-AI-Lab/pull/9)

The editorial redesign is a preview change for draft PR #9. **The public demo has not yet been updated with this redesign.** The experience described below is the current development version.

## Explore the residence

The portfolio brings together kitchen and living-space studies, outdoor architecture and a working 3D villa. Large images open into a keyboard-accessible gallery, while room links take visitors directly into the corresponding tour view.

- **View the whole house:** revised pool-side framing and responsive camera projection keep the residence readable across screen sizes.
- **Follow the light:** day, evening and night settings combine browser lighting, reflected environment light and interior fixtures.
- **Choose a direction:** Warm Limestone, Sandstone Warmth and Graphite Mineral palettes update the model's material presentation.
- **Plan a journey:** a two-floor concept plan links eight viewpoints; Guided views and Explore movement share a persistent scene.
- **Start a project brief:** select villa architecture, kitchen design or home interiors, add notes and download a text brief with the chosen palette and lighting. The brief is generated on the device; nothing is submitted.

If the 3D view cannot open, the page retains the image studies, gallery, material selector and brief form.

The images are responsive derivatives of repository Blender renders. The exterior uses Pool Context v4; the kitchen/living image is an earlier Interior2 concept study. They are presentation studies, not photographs or pixel-identical previews of the current browser scene. [Image sources](projects/Dubai-Luxury-Villa-AI/web-viewer/app/public/editorial/README.md)

## Model and evidence

The model pipeline remains **Blender → GLB → React / Three.js → GitHub Pages**. The redesign changes presentation, navigation and browser lighting; the canonical model binary is unchanged.

| Current viewer model | Value |
| --- | --- |
| Presentation version | Pool Context v4 |
| Stored asset identifier | `v0.4-pool-context-v4-feature-candidate` |
| GLB size | `8,613,156` bytes |
| SHA-256 | `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115` |

The stored identifier retains the model's original feature-development name. The asset is already included on `main`; that fact is separate from deployment of this editorial redesign.

**Validation is version-specific.** Historical Interior2 evidence applies to the earlier model. At the reviewed `main` baseline `3dac25f`, build and deployment succeeded, but [Live Browser QA run 35518268054](https://github.com/safal207/Architectural-AI-Lab/actions/runs/35518268054) reported horizontal overflow at 320 px.

The [earlier portfolio repair verification](projects/Dubai-Luxury-Villa-AI/validation/portfolio-reconciliation-2026-09-21.md) records passing local build, tour and 390 → 320 → 390 px layout checks for the repair preceding this redesign. Those results do not certify the new editorial revision or its public deployment. Fresh editorial and deployed checks must be recorded separately.

Current browser QA entry points are `qa/live-browser.mjs` for desktop/mobile tours, gallery and brief downloads; `qa/mobile-hero-layout.mjs` for responsive containment; and `qa/editorial-resilience.mjs` for focus, room-detail state, brief updates and operation without WebGL. [Setup and QA instructions](projects/Dubai-Luxury-Villa-AI/web-viewer/README.md)

[Project details and source evidence](projects/Dubai-Luxury-Villa-AI) · [Viewer app](projects/Dubai-Luxury-Villa-AI/web-viewer/app)

## Scope

This is a portfolio concept for architectural visualization and virtual tours. Floor plans and areas are indicative; the walking route is an interaction aid rather than construction-grade collision or a measured navmesh. The project does not provide a measured drawing set, specifications, BIM, engineering or construction documentation, and does not represent an existing property.
