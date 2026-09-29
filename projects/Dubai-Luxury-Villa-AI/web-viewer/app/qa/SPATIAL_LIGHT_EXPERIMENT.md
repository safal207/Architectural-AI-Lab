# Spatial point-light experiment — 2026-09-29

## Decision: do not promote this candidate

The experiment found a modest steady-state reduction in completed render/readback cost, but it increased shader-program count and cold warmup substantially. It did not pass the predeclared acceptance rule (pixel equality at both poses and at least 1.2 speed ratio against the lower of initial/restored baseline times). Application code and the native-resolution acceptance gate are unchanged.

## Exact scope

- Tested branch head and checkout: `73cc9276b7c89be88cce8ec8ba9edefadf7f25f4`.
- Run: https://github.com/safal207/Architectural-AI-Lab/actions/runs/36572969605 — experiment completed successfully, not a product acceptance PASS.
- Artifact: `spatial-light-candidate`, ID `11036646807`.
- ZIP SHA-256 independently matched: `aadcf846e8a5e14b7cb5250d68abf63c8c199a39e98e6bbb623927420d804b0c`.
- Original GLB SHA-256: `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115`.
- Desktop viewport 1440 x 1000 CSS pixels; actual buffer 1057 x 619, DPR 1; ANGLE/Vulkan SwiftShader.
- One warmup followed by three measured frames for each condition; same renderer, pose, model, lighting, camera, transmission and raster. Synchronous full-buffer readPixels includes rendering completion plus readback overhead, not physical display timing.

## Candidate

For each static mesh, compute a conservative world-space bounding box. A finite-range point light is omitted from that mesh's compiled lighting loop only when the minimum box/light distance exceeds its cutoff by more than 0.001 m. Unlimited lights stay enabled. Skinned/instanced/morph/displaced/custom-vertex-shader surfaces are excluded from this experiment.

The experiment changes neither scene light visibility nor geometry. It retains all applicable shadow calculations and all transmission effects. The r180 point-light ordering is checked against the live shader uniform arrays rather than inferred solely from the mirrored sort. Original material IDs and opaque sort order are retained. Per-mesh masks are expressed with compile-time conditionals, not the previously rejected per-fragment BRDF guard.

This snapshot has ten point lights, 310 affected meshes and 33 newly compiled masks at the entry pose. The living pose reuses programs already compiled at entry: its reported `distinctMasks: 0` means no additional chunk construction, not absence of masking.

## Measurements

| Condition | Entry mean | Living mean |
| --- | ---: | ---: |
| Original baseline | 7148.43 ms | 5085.30 ms |
| Spatial candidate | 6235.60 ms | 4299.57 ms |
| Restored baseline | 7130.00 ms | 5077.77 ms |

Conservative speed ratios are 1.1434 and 1.1810. Relative to the initial baseline the measured cost falls by approximately 12.8% and 15.5%; these observations do not prove a speedup on another renderer/device or a smooth route.

Entry changes one pixel by at most one 8-bit channel level. Living is byte-for-byte identical. Restored baseline is byte-for-byte identical at both poses. The small entry difference is disclosed even though it is not visually prominent.

The material program cache grows from 15 to 150 programs during the candidate entry warmup. That warmup takes 25844.9 ms versus 7203.8 ms for the baseline. The comparison does not measure a complete end-user loading timeline, but the cold cost is large enough not to ship this implementation. Draw calls and triangle counts are unchanged: entry 593/75236; living 225/44732. No page or console errors were recorded.

## New integration blocker

During the investigation, `main` advanced from `07fdd7a14bd16c9f931d3808b65135644461b5c3` to `f93206ec5d6d9f617ab7161e3ca1b252c99a7a68` (living atmosphere, rain, wind and animated water). GitHub reports PR #16 as conflicting. This experiment ran the isolated PR branch, not the merge result, and must not be used to validate the new atmosphere or water implementation.

`main` changes VillaViewer lifecycle, lighting synchronization, motion/visibility handling and controls, and adds custom water/foliage shaders. Reconciliation must preserve both those changes and the arrival controller, living-glazing fix and native gate. The diagnostic's static bounds assumptions must not be extended to deformed foliage or custom shaders without a fresh conservative bound and validation.

No conflict resolution, application optimization, merge into main or deployment was performed by this experiment.

## Reproduction and next boundary

The **Spatial Light Candidate (diagnostic)** workflow is manual after this completed experiment, avoiding automatic expensive reruns. Its temporary renderer instrumentation is restored before the source-cleanliness check; the artifact includes tested sources, exact readback PNGs, the removal plan and measurements. The workflow's initial push-triggered execution above is the verified run; the manual-only wrapper has not separately been dispatched.

Before another product optimization, reconcile PR #16 with the new main snapshot and re-establish the image and performance baseline. A revised light-pruning candidate would also need a bounded shader-variant budget and cold-start measurements, not merely faster warmed frames. Keep PR #16 draft; native desktop motion and independent review remain open.
