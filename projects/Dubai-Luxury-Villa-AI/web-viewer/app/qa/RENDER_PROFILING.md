# Native-resolution render investigation — 2026-09-29

## Decision

No candidate optimization is promoted to application code. Native desktop arrival is still a release blocker. Keep PR #16 draft. All product files under `src/` and `public/`, dependencies, arrival timing and the DPR 1 acceptance gate remain unchanged by this investigation.

The three temporary diagnostic workflows are consolidated into **Render Investigation (manual)** so expensive experiments do not run on every subsequent commit. This does NOT disable or change `Arrival Native Raster QA`, `Arrival Reveal QA`, any visual gate, or the prior product regressions.

## Correct measurement boundary

An initial experiment used `gl.finish()` around `renderer.render()`. Chromium's WebGL implementation intentionally translates finish to a flush; the millisecond figures from that experiment measured command submission, not completed image production. Do not cite them as GPU frame times.

The corrected experiment synchronously reads the complete drawing buffer after each render with `gl.readPixels`, checks GL errors/context loss, and includes that completion/readback cost. It is not a GPU timer-query or physical display measurement. The raster remains 1057 x 619 at DPR 1. Material ablations are local to an instrumented diagnostic build and restored afterward; they are not product changes.

Source: Chromium `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`, `WebGLRenderingContextBase::finish` (Flush). Three.js r180 `WebGLRenderLists.js` and `lights_fragment_begin.glsl.js` were inspected for the candidate experiments.

## Completed-work ablation

Head `5b0707d414cf993b5dd7801e1863f77b689f29be`, run **36568263647**, artifact **11033110567**. Renderer reported ANGLE / Vulkan SwiftShader. Each row has one warmup and two measured frames at the same entry pose. These effect-removal rows intentionally change the image and must not be called acceptable optimizations.

| Diagnostic variant | Mean completed render + readback | Draw calls |
| --- | ---: | ---: |
| Baseline, start | 9344.45 ms | 593 |
| Transmission removed | 4643.25 ms | 307 |
| Shadows removed | 7948.60 ms | 593 |
| Point lights removed | 6357.30 ms | 593 |
| Unlit diagnostic override | 107.20 ms | 292 |
| Baseline, restored | 9402.55 ms | 593 |

Interpretation: fragment shading and the duplicate opaque pass used by transmission are material contributors in this CI environment. The measurements do not license turning off glass, water, shadows or lights in the product.

## Cold/replay trace

Head `94a015eae89dbea6bcb0faebfd9529c3350893f3`, run **36568102382**, artifact **11033085153**. First scene setup submitted about 4966.6 ms of CPU work, creating 15 programs. Subsequent entry/living render calls submitted in approximately 7.5–18.5 ms, with 15 programs before and after, yet frame delivery still had about 9.37 s and 9.29 s gaps on first play and replay. No page errors; the recorded page was visible and focused. Cold shader compilation alone does not explain the recurring delay.

## Candidate decisions — compare within this run only

Head `d41fdc75edec3fe477ff29839277e92109cc4171`, checkout `9448f2dd92a86776641429b2fbd17edf85d820e3`, run **36568961207**, artifact **11032519873**. Same raster and pose for each variant; every RGBA byte compared with that pose's reference. This runner's baseline is different from the ablation runner: never infer a speedup by comparing these separate runs.

| Candidate | Entry mean | Living mean | Pixel difference | Decision |
| --- | ---: | ---: | --- | --- |
| Baseline | 4313.55 ms | 3138.10 ms | Reference | Reference |
| Near-first opaque sorting | 4376.80 ms | 3159.15 ms | 0 entry; 2 living pixels, max channel delta 30 | Reject: no gain; changes tied-surface result |
| Skip zero-contribution point-light BRDF | 4643.20 ms | 3274.10 ms | 0 pixels | Reject: slower despite image equality |
| Both | 4649.35 ms | 3298.50 ms | 0 entry; 2 living pixels | Reject |
| Baseline restored | 4292.45 ms | 3155.70 ms | 0 pixels | Restoration verified |

Candidate formulas run only inside `qa/render-candidate.mjs`. They are not imported by the application. The measurements rule out these particular implementations on these two poses, not all sorting or lighting optimizations on all devices.

## Evidence integrity

Downloaded ZIP SHA-256 values independently matched GitHub artifact metadata:
- Completed-work ablation: `342d0a5a26eea027a57dbeadf6dadc5790f85459c37963501d895b2b5207dd69`.
- Cold trace: `a6c534fcd321cc7dcae790fdf7200931c440ad5b791b021edcc28fe37fbec151`.
- Candidate comparison: `4ded305b5da1263ceef3628c0b995998575567942263fc1078aa4ed702aa1418`.

All experiments retain the original GLB SHA-256 `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115` where recorded by build provenance.

## Reproduce

Use the manual **Render Investigation** workflow on the desired ref, choosing `completed-work`, `cold` or `candidates`. Its build step inserts diagnostic references into a temporary renderer copy, builds, restores original source in `finally`, and checks the clean source diff. None of those hooks are in normal production builds.

For local execution after installing the locked app dependencies and Playwright 1.55.0, `node qa/render-profile.mjs --build` prepares the completed-work/candidate build; serve `dist-render-profile` on localhost:4173, then run `node qa/render-profile.mjs` or `node qa/render-candidate.mjs`. Cold tracing uses `node qa/render-cold-profile.mjs --build`, `dist-cold-profile`, and `node qa/render-cold-profile.mjs`.

## Remaining work

The next candidate must reduce measured shaded-fragment/transmission-pass work and preserve the accepted image. Validate on the unchanged native DPR 1 motion gate and same-pose full-buffer comparisons. Do not extend timeouts, accept only terminal camera position, lower resolution, silently remove optical effects, or compare different CI runners as if they were before/after samples. Physical-device smoothness and independent review remain unverified.
