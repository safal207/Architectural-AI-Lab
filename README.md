# Architectural-AI-Lab

AI-assisted architectural visualization: villa concepts, interior presentation and interactive 3D tours built from native Blender geometry.

## Featured project — Dubai Luxury Villa AI

**[Open the interactive villa](https://safal207.github.io/Architectural-AI-Lab/)**

![Pool Context v4 — native Blender concept render](projects/Dubai-Luxury-Villa-AI/renders/villa-v0.4-pool-context-v4.png)

A contemporary villa concept with a furnished living and dining area, kitchen, master suite, staircase and pool terrace. **Pool Context v4**, the asset now included on `main`, adds a planted desert garden and a dedicated pool presentation view to the interior-tour model.

The viewer offers:

- a two-floor navigation plan and linked room selection;
- **Guided** views composed for presenting each space;
- **Explore** mode with keyboard and touch movement along a bounded route;
- day, evening and night lighting, plus material concept variants;
- a persistent 3D scene so changing tour stops does not reload the model.

The image above is a native Blender render. The browser uses its own lighting and material presentation, so its appearance differs.

## Model and evidence

The pipeline is **Blender → GLB → React / Three.js → GitHub Pages**. Asset checks verify the binary digest, room and tour anchors, material families, source-render evidence and the separation of Guided views from the Explore route.

| Current viewer model | Value |
| --- | --- |
| Presentation version | Pool Context v4 |
| Stored asset identifier | `v0.4-pool-context-v4-feature-candidate` |
| GLB size | `8,613,156` bytes |
| SHA-256 | `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115` |

The stored identifier retains the model's original feature-development name. It does not mean the asset is absent from `main`.

**Validation is version-specific.** Historical Interior2 checks are retained as evidence for that earlier model. At the reviewed `main` baseline `3dac25f`, build and deployment succeeded, but [Live Browser QA run 35518268054](https://github.com/safal207/Architectural-AI-Lab/actions/runs/35518268054) reported horizontal overflow at 320 px. A complete deployed mobile QA pass for the repair is still required; older passing reports do not cover it.

[Project details and evidence](projects/Dubai-Luxury-Villa-AI) · [Run the viewer locally](projects/Dubai-Luxury-Villa-AI/web-viewer/app)

The [portfolio repair verification](projects/Dubai-Luxury-Villa-AI/validation/portfolio-reconciliation-2026-09-21.md) records the successful local build, desktop/mobile tour checks and 390 → 320 → 390 px layout regression for this change.

## Scope

This is a portfolio concept for architectural visualization and virtual tours. The floor plan is a navigation schematic, and the walking route is an interaction aid rather than construction-grade collision or a measured navmesh. The project does not provide a measured drawing set, specifications, BIM, engineering or construction documentation, and does not represent an existing property.
