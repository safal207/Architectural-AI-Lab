# House + drone demonstration

## Scope

An explicit Play action starts a camera sequence in the existing, once-loaded villa scene:
entry → living → dining → stair hall → actual stair-eye points → upper landing → master,
then the same connected route downstairs → living → pool. The second part moves beyond
the architectural envelope, lifts above its highest bound and makes a closed 360° aerial orbit.
A separate button starts only the aerial part. Stop restores the previously selected manual
view. Selecting another room/mode also cancels demo ownership.

The demo uses a frame-paced film clock, separate from walking physics. Only preparing a new
camera pose advances it: ordinary state reads and waiting for a pending render do not.
Monotonic elapsed time is capped at 250 ms per pose update; stall backlog is discarded.
Below four pose updates per second playback deliberately slows, rather than consuming the
whole film while the renderer is unavailable. Pause/resize never advance the film, and
resume rebases the wall-time sample. This is not a physical-display acknowledgement or FPS gain.
Blur, leaving the visible viewer, a hidden tab, Escape, canvas interaction and context loss
pause playback; none resumes automatically. Reduced-motion users receive still chapters
and explicit Next/Previous controls, including four aerial views.

## Geometry and presentation boundary

Interior motion follows the existing expanded walk graph, without Catmull–Rom corner cutting
or a direct master-to-pool shortcut. A bounded nine-ray, bidirectional segment probe checks
nominal model surfaces. Detected obstructions use disclosed editorial scene cuts instead
of interpolating the camera through those surfaces. The report names every obstructing mesh.
This is not collision completeness, a swept human volume, a construction clearance check,
or proof of visibility/smoothness at every pose. Bounded steps can still look discontinuous;
the GPU queue guard, DPR, original model, materials, lights and acceptance gates
are not weakened to disguise that limitation.

The aerial circle is outside the circumscribed architectural bounds and above their maximum
height. Plant movement, visual shaders and geometry outside those bounds are not a universal
flight-safety model. Manual free flight keeps its existing non-collision behavior.

## Interior detail layer

Model-bound dining settings add plates, linen napkins, olive ceramic cups/handles and brass
cutlery. A folded linen throw uses the existing master bench cushion. Existing books, vases,
lighting, weather and water remain intact. Desktop uses four settings; touch/mobile uses two.
There are at most five instanced batches, no added lights or external assets, and explicit
ownership/disposal. Missing or undersized furniture anchors are reported rather than guessed.

## Tests

- `node --test qa/demo-timeline.mjs`: pure clock, pause/restart, still-mode, reverse-stair and
  disconnected/nonfinite-route tests; runnable without app dependencies. Frame-clock regressions
  cover stalled rendering, repeated reads, discarded backlog, refresh-rate independence and pause/resume.
- `node --test qa/demo-scene.mjs`: thin-wall negative control, accessory resource ownership,
  pinned real-GLB route/finite-pose/orbit/anchor tests. An in-memory material-free GLB copy
  avoids Node image decoding; original bytes, meshes and node transforms are preserved.
  This is geometry evidence, not a material/rendering check.
- `node qa/demo-browser.mjs`: production-build desktop and reduced-motion mobile controls,
  pause/resume, synthetic blur, mode cancellation, one-model-request invariant, tap target
  sizing and screenshots. Environment motion is paused for this functional smoke. It does
  not establish native smoothness or physical-device performance.

Keep this PR unmerged until its dedicated workflow and existing relevant gates pass, actual
scene-cut reports and screenshots are reviewed, and the new motion is evaluated at native
resolution. The held arrival experiment in PR #16 is not imported or declared resolved.

## Native-motion diagnostic

`node qa/demo-motion-audit.mjs` adds a separate desktop DPR 1 observation with environmental
motion left enabled. It uses a fresh page for the house and orbit modes, samples up to 20
seconds per mode, validates native buffer dimensions, and retains raw wall-time/film-time,
camera, direction and atmosphere samples in `qa-output/demo-native-motion.json`.
The summary distinguishes submitted timeline updates from changed poses: a held camera can
receive new film timestamps without moving. Wall-time gaps and trailing silence are recorded;
the 250 ms film-clock cap must not be presented as a wall-time frame-rate measurement.

A successful diagnostic reports `MEASURED`, with `productAcceptance: NOT_PROVEN`, not a
smoothness PASS. Empty/invalid samples, paused effects, non-native buffers, page/resource
errors or unexpected playback cancellation fail the diagnostic. These timestamps follow
`renderer.render()` submissions, not GPU completion or physical presentation. Short samples
are not full-route coverage and do not replace motion acceptance or physical-device checks.
The existing browser assertions, timeouts and acceptance gates remain intact.

For the preceding runtime head `7954e1cc482c3d8d53ae3d74250987c4169d3f2e`, all 14 PR workflows
completed successfully. Dedicated run [36604459020](https://github.com/safal207/Architectural-AI-Lab/actions/runs/36604459020)
checked merge snapshot `daf68b05c872fdbfe558762530ca5492e1ed890c`: 15 unit/geometry tests and
desktop/mobile-still functional smoke passed. Downloaded artifact `11050980307` matched ZIP
SHA-256 `ab0db0aa8430fc6f523171766f79ed3f0dcca1ee8f7d854884869fd7b9a49ca7`.
The four saved house/orbit stills were inspected; they do not show all route transitions.
The scene report discloses three cuts (two stair-guard crossings and the living-glass exit).

The first local diagnostic attempt on the matching CI build was blocked by Chromium with
`ERR_BLOCKED_BY_ADMINISTRATOR` before loading the page. It supplies no motion measurements.
Syntax and synthetic summary fixtures passed locally; the new diagnostic requires its own
remote CI result. Do not promote the predecessor's green checks to this new QA revision.
