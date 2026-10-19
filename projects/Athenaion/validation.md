# Import and validation record · 19 October 2026

Upstream: `Leonxlnx/athenaion`, initial and final observed revision `9b8bd23b39c458a50fb1201037360047781c45b5`. Destination base: `safal207/Architectural-AI-Lab@119fc92b316995ec835da59390c275563db6162e`. The original MIT license is retained byte-for-byte.

This record describes the local import candidate. GitHub checks and publication must be evaluated against the resulting commit separately.

| Check | State | Evidence / boundary |
| --- | --- | --- |
| Node regression tests | PASS | 10 tests: malformed URLs, reduced motion, pixel budgets, asset corruption, worker setup/job failures and server containment |
| Static Athenaion build | PASS | Locked Three.js copied locally; source, workers, gallery and verified mountain grid packaged |
| Fresh mountain-grid download | PASS | Downloaded from the pinned upstream revision; exact size and SHA-256 verified |
| Gallery browser checks | PASS | 9 cameras, RU/EN, state after reload, no eager Three.js, 320/390/1024/1440 px containment |
| Failure recovery | PASS | WebGL unavailable and failed main-module import both retain the gallery and controls |
| Subdirectory hosting | PASS | Three.js, workers, license and mountain grid served under `/portfolio/athenaion/` |
| Villa build and project integration | PASS | Main build; new card image; 320 px card containment; navigation into Athenaion and back |
| Full-world procedural build | PASS | All 15 modules and shader compilation completed in the local software-renderer probe; final Light candidate build: 105,193 ms |
| Full-world first frame, camera and resize | PASS in software-renderer probe | First frame rendered; shot 5 selected; camera projection followed the viewport resize to 390 px; animation started |
| Complete full-world GPU interaction probe | FAILED / partial coverage | Playwright timed out after 30 seconds on the second animation-button click (pause), while waiting to scroll the visible button into view. Pause, context-loss recovery and return-to-gallery assertions were not completed. This software-renderer result does not establish behavior on a hardware GPU. `npm run test:world` retains the separate integration check. |
| Physical phones and hardware GPUs | NOT_RUN | No device FPS, thermal, battery or universal mobile-compatibility claims |
| Public deployment | NOT_RUN at local collection | The Pages workflow packages Athenaion at `/athenaion/` when this revision reaches `main` |

Light quality now has a distinct terrain plan: the observed mesh fell from approximately **4.48 million to 1.17 million triangles** (about 74% fewer terrain triangles). This is a geometry count, not an FPS benchmark or a guarantee about total scene cost. Preview, High and Ultra retain their upstream terrain plans.

The fast gallery suite writes screenshots and `browser-results.json` to `qa-output/`; GitHub Actions uploads its own evidence for the checked commit. The optional full-world suite writes `full-world-results.json` only after every assertion passes. An absent report is not a pass.
