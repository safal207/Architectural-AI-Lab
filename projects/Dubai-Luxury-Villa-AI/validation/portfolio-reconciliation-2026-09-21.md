# Portfolio viewer repair — local verification

Verified on 2026-09-21 against the production build served locally from this change. These results do not certify the deployed GitHub Pages site; post-deployment QA remains separate.

## Mobile regression

The 390 → 320 px resize reproduced the published failure: the document remained 378 px wide. The responsive grid's automatic minimum was held open by the canvas, whose initial renderer sizing also left an inline pixel width.

The repair uses a shrinkable grid track and lets CSS size the canvas while Three.js updates its drawing buffer. Fixing the grid alone was insufficient: the strengthened test caught a 334 px canvas clipped inside a 264 px container.

Final layout checks pass at 390 px, 320 px and after returning to 390 px. Document widths match the viewport; the canvas fits its container (334 px at 390, 264 px at 320). Hero text, controls and major page sections stay contained, with no horizontal page scrolling.

## Verification

| Check | Result |
| --- | --- |
| Vite production build | PASS |
| Asset evidence regression suite | 14 tests PASS |
| Committed GLB, source render and provenance validation | PASS |
| Navigation graph, floor continuity and camera framing | PASS |
| Keyboard/touch input lifecycle | PASS |
| Full desktop/mobile viewer regression | PASS |
| Guided/Explore desktop and touch controls | PASS |
| 390 → 320 → 390 px layout regression | PASS |

Both browser suites reported zero console errors and zero uncaught page errors. Full viewer QA also reported zero failed HTTP responses and one GLB request per desktop/mobile page. Coverage includes plan and room selection, both tour exit controls, material and lighting changes, and retaining the loaded scene between modes.

The model binary is unchanged: 8,613,156 bytes, SHA-256 `4f3e2868b532d1e3ea50e83aeb9a696e3c1f6484b38b2067db4973b57e66d115`. Its current portfolio status is distinct from the historical feature-development receipts.

## Reproduction

From `web-viewer/app`, install the locked dependencies, build and serve the production preview on port 4173. Run `qa/walkthrough-input.mjs`, `qa/walkthrough-graph.mjs`, `qa/first-person-ui.mjs`, `qa/live-browser.mjs` and `qa/mobile-hero-layout.mjs`, setting `VILLA_URL=http://127.0.0.1:4173/` for browser checks. Browser checks require Playwright Chromium. Run the Python regression suite and `tools/validate_viewer_asset.py` from the project directory.

Local verification used Windows, Node 24 and headless Chromium. GitHub Actions checks run independently on Ubuntu with Node 22.
