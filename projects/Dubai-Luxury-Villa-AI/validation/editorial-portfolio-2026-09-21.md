# Editorial residence portfolio — local verification

Verified on 2026-09-21 against the production build served locally on port 4173.
The published GitHub Pages site is separate; this change remains in draft PR #9.

## Result

The residence now leads the page through native architectural imagery and a warm
editorial layout. Kitchen/living and terrace studies open in an accessible image
gallery and link to the corresponding walkthrough stops. The viewer occupies the
full content width. Plans, material palettes and a local downloadable project brief
follow it. The previous developer sales pitch and simulated assistant/investor
panels are no longer part of the page.

The Three.js presentation now uses a lower pool-side overview, responsive framing,
whole-house cached shadows, environment reflections, and distinct readable
day/evening/night lighting. Procedural limestone and gravel colors lost during
glTF export receive source-backed midpoint colors; this does not reproduce their
full Blender procedural textures. Model geometry and authored tour anchors are
unchanged.

## Verified behavior

| Check | Result |
| --- | --- |
| Production build, with a separate lazy-loaded 3D module | PASS |
| 14 asset/provenance regression tests and canonical asset validation | PASS |
| Navigation graph, stair floor continuity and presentation framing | PASS |
| 11 keyboard/touch input lifecycle cases | PASS |
| Full desktop/mobile tour, rooms, light, finishes, orbit and zoom | PASS |
| Gallery open, arrow navigation, Escape, close and focus restoration | PASS |
| Actual brief downloads preserve project type, notes, material and light | PASS |
| Guided/Explore controls, mobile touch controls and non-overlap | PASS |
| 390 → 320 → 390 px layout and loaded responsive images | PASS |
| Hero/kitchen entry moves keyboard focus into the viewer | PASS |
| Stair stops clear the previous room details and selected shortcut | PASS |
| Changing material or light invalidates the previously prepared brief | PASS |
| Simulated unavailable WebGL retains gallery, palette and brief | PASS |

Normal browser runs reported zero console errors, uncaught page errors or failed
HTTP responses. Desktop and mobile each requested the GLB once and retained the
scene through mode switches. The deliberately disabled-WebGL test expects a
renderer error and verifies the image-based fallback instead.

Visual inspection covered desktop and mobile hero views, space stories, the 3D
overview in three lighting modes, the living room, floor plans and material cards.
Layout inspection at 1440, 1024, 768, 390 and 320 px found no horizontal document
overflow or duplicate IDs. The mobile hero intentionally reaches both viewport
edges; text and controls remain inside their content column.

## Assets and loading

- GLB: 8,613,156 bytes.
- SHA-256: `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115`.
- Canonical version: `v0.4-pool-context-v4-feature-candidate`.
- Hero WebP: 113,738 bytes at 1600 px, 46,132 bytes at 800 px.
- Interior WebP: 49,424 bytes at 1600 px, 20,416 bytes at 800 px.
- Main JavaScript entry: about 256 kB (80 kB gzip). The approximately 629 kB
  Three.js/viewer module loads separately. This splits the initial entry rather
  than claiming to reduce all JavaScript by the same amount.

The exterior image comes from the current native Pool Context v4 render. The
kitchen image is the earlier Interior2 study, explicitly captioned as a concept
study. These are project renders, not photographs of a built property.

## Reproduction

From `web-viewer/app`, build and serve the production preview on port 4173.
With Playwright Chromium installed and `VILLA_URL=http://127.0.0.1:4173/`, run:

- `node qa/live-browser.mjs`
- `node qa/first-person-ui.mjs`
- `node qa/mobile-hero-layout.mjs`
- `node qa/editorial-resilience.mjs`
- `node qa/walkthrough-input.mjs`
- `node qa/walkthrough-graph.mjs`

Run the Python asset regression suite and `tools/validate_viewer_asset.py` from
the project directory. Set a separate `QA_OUTPUT` directory for each browser
suite. Local browser evidence is in the ignored `qa-editorial-*-output` folders.
First Person Tour QA now includes the editorial resilience check and uploads
its evidence independently.

The project remains a concept portfolio, not construction documentation.
The brief downloads locally; there is no submission endpoint.
