# Villa Performance / Usability Baseline v1

## Scope

This baseline measures the **current browser viewer delivery and persistence contract** after Pool Context v4.

It does not claim GitHub Actions software rendering is representative of a user's GPU.

## Verified product signals

Latest accepted CI run on the performance spike:

- viewer asset: `villa.glb`
- encoded GLB: **8,613,156 bytes**
- GLB requests during load + Guided route: **1**
- JS transferred by local production preview: approximately **239 KB**
- CSS transferred: approximately **7 KB**
- model reached `data-model-state="loaded"`: **1.14 s** on that runner
- console errors: **0**
- page errors: **0**
- persistent viewer runtime: required
- model reload during Guided transitions: forbidden

The earlier baseline run measured about 5.6 s to model-ready on a different hosted runner. Treat runner-to-runner model-ready timing as a range, not an optimization claim.

## CI software-WebGL diagnostic

Guided stop transitions took roughly 11–13 s on the accepted hosted run and 25–30 s on an earlier hosted run.

Those numbers are **not client latency claims**. GitHub Actions uses headless software WebGL without a production GPU; full shadowed luxury frames are expensive there.

The gate therefore uses a broad 60 s transition sanity ceiling only to detect hangs while keeping the stronger product assertion: the GLB must remain loaded exactly once.

## Usability improvement in this bead

The viewer now exposes real GLB download progress while `modelState === "loading"`:

- percentage when transfer totals are available;
- restrained progress bar;
- short “Preparing the 3D walkthrough” context;
- overlay disappears only when the model is actually ready.

This improves perceived performance without changing geometry, materials, lighting, cameras, route anchors, or the accepted Pool/Master/Upper Landing compositions.

## Claim boundary

This is a portfolio/web-viewer performance baseline, not a cross-device FPS certification.

A later device-performance bead should measure representative desktop and mobile GPUs before setting client-facing FPS or interaction-latency claims.
