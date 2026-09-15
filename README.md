# Architectural-AI-Lab

AI-assisted architectural visualization portfolio: native Blender generation, gated visual development, interactive 3D / virtual-tour viewers, and reproducible QA evidence.

## Featured project — Dubai Luxury Villa AI

**Live interactive prototype:** https://safal207.github.io/Architectural-AI-Lab/

A luxury-residential digital-twin presentation experiment built as an evidence-backed pipeline rather than a collection of AI images.

```text
Concept
  ↓
Native Blender geometry
  ↓
Form Gate ✓
  ↓
Material Gate ✓
  ↓
Light Gate ✓
  ↓
Life Gate ✓
  ↓
Interior Tour Gate ✓
  ↓
Validated GLB 2.0
  ↓
Two-floor plan + client viewing graph
  ↓
Three.js guided first-person viewer
  ↓
GitHub Pages
  ↓
Live desktop/mobile browser QA ✓
```

Current promoted asset: **v0.4-interior2** — the frozen v0.3 exterior/material/light/life baseline plus a gated interior-tour layer with furniture, kitchen elements, doors, practical lighting cues, a refined staircase/upper landing connection and a hollow master-suite shell.

The public viewer also includes a two-floor navigation schematic, an ordered client viewing graph and a guided first-person mode using Blender-authored camera anchors and look targets.

### What is verified

- native Blender 4.0.2 headless generation in GitHub Actions
- reproducible GLB 2.0 export with SHA-256 provenance
- current promoted GLB: `7,845,032` bytes
- current promoted SHA-256: `fde86661b3b7ba4ce3352a56b83ad87156428feafd32d2d406dd12529eb97aed`
- room-anchor checks for interactive focus
- gated architectural material-family checks
- Interior2 camera-anchor / look-target / interior-node validation
- actual Blender first-person visual review before Interior2 freeze
- React / Three.js production build
- exact GLB binary-delivery smoke test
- successful GitHub Pages deployment
- post-deploy Playwright checks against the live public viewer
- desktop house-plan / client-graph / first-person-state / room / lighting / material / orbit / zoom paths — PASS
- mobile plan / graph / room / canvas / no-horizontal-overflow paths — PASS
- tested live v0.4 run reports zero console errors, zero uncaught page errors and zero HTTP responses >= 400

Project details and evidence: [`projects/Dubai-Luxury-Villa-AI`](projects/Dubai-Luxury-Villa-AI)

## Claim boundary

This repository contains AI-assisted architectural visualization and digital-twin / virtual-tour portfolio prototypes. The house plan is a navigation schematic, not a measured architectural drawing, and free-walk currently has no collision/navmesh guarantee. It is not BIM, engineering, construction documentation, accessibility/code-compliance evidence, valuation, sales forecasting, as-built documentation, or representation of an existing real property unless explicitly stated otherwise.
