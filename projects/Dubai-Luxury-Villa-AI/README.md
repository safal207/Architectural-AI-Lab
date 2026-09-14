# Dubai Luxury Villa AI

AI-assisted digital twin prototype for luxury real estate presentation.

## Vision

Transform architectural concepts into interactive digital experiences with a reproducible engineering pipeline.

```text
Concept → Room Data → Blender → GLB → Three.js Viewer → Validation
```

## Verified today

- Procedural villa generator runs in **Blender 4.0.2 headless** on GitHub Actions.
- Blender exports a real **GLB 2.0** asset.
- The exported GLB is validated for container magic, version and byte length.
- A SHA-256 receipt is written for the generated asset.
- The validated GLB is published into the React / Three.js viewer assets.
- The production viewer build completes successfully.
- CI starts the built preview server and confirms both the HTML and `villa.glb` are served.

Native Blender asset v0.1:

- `exports/villa-v0.1.glb`
- 144748 bytes
- SHA-256: `b2730787baf05cd524701c18c1609031085407329fd0628fcdee73e2c409f48c`

See: [`validation/end-to-end-proof.md`](validation/end-to-end-proof.md)

## Current viewer features

- Native Blender GLB loading with Three.js `GLTFLoader`
- Orbit and zoom camera controls
- Room selection and room-anchor focus
- Room metadata
- Day / evening / night lighting concept
- Material concept variants
- Metadata-grounded property assistant
- Investor summary mode

## Target users

- Luxury real estate developers
- Architecture studios
- PropTech teams
- Investor-facing presentation teams

## Quality layer

The project keeps creation and verification separate. Generated geometry is not treated as proof by itself: Blender export, asset integrity, web build and asset delivery each have explicit checks.

## Boundaries

This is a portfolio digital-twin prototype. It is not BIM, construction documentation, structural engineering, a real-property representation, or a valuation.

## Status

**Working engineering prototype.** Native Blender export and viewer build are verified. Public GitHub Pages deployment is the remaining presentation step.
