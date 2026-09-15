# Live Browser QA Evidence

Status: **PASS**

Public target: https://safal207.github.io/Architectural-AI-Lab/

Latest verified run:

- workflow: `Live Browser QA`
- run id: `34956959256`
- source commit: `c6b0b280ade1ef9b4566658cb673adcca02690a4`
- browser: Playwright Chromium, headless
- live viewer asset: `v0.4-interior2`
- GLB bytes: `7,845,032`
- GLB SHA-256: `fde86661b3b7ba4ce3352a56b83ad87156428feafd32d2d406dd12529eb97aed`

## Interior-tour delivery checks

- live two-floor schematic house plan rendered — PASS
- client viewing graph rendered — PASS
- guided first-person mode state — PASS
- live viewer loaded promoted `v0.4-interior2`, not fallback — PASS
- v0.4 furniture / kitchen / doors / staircase / master-suite geometry is in the promoted GLB provenance set — PASS
- named first-person camera anchors and curated look targets are validated before promotion — PASS

## Developer-facing sales case checks

- developer-case hero rendered on desktop — PASS
- developer-case hero rendered on mobile — PASS
- `Request a 5-day digital twin pilot` section rendered — PASS
- pilot CTA points to the repository public issue intake path — PASS
- public-request confidentiality warning rendered — PASS

## Desktop checks

- actual promoted GLB reached `data-model-state=loaded` — PASS
- live `villa.glb` bytes match `villa.asset.json` — PASS
- live `villa.glb` SHA-256 matches provenance — PASS
- interactive house plan — PASS
- client viewing graph — PASS
- first-person view-mode state — PASS
- Master Bedroom room selection/focus path — PASS
- Night presentation lighting state — PASS
- Warm Wood material presentation state — PASS
- orbit drag smoke test — PASS
- zoom wheel smoke test — PASS
- desktop screenshot captured — PASS

## Mobile checks

Viewport: `390 × 844`.

- sales case and pilot CTA rendered — PASS
- actual promoted GLB reached loaded state — PASS
- interactive house plan — PASS
- client viewing graph — PASS
- Pool Terrace room selection/focus path — PASS
- WebGL canvas visible at usable size — PASS
- no horizontal document overflow — PASS
- mobile screenshot captured — PASS

## Runtime error checks

- browser console errors: none
- uncaught page errors: none
- HTTP responses >= 400: none

## Evidence artifact

GitHub Actions artifact: `dubai-villa-live-browser-qa`

Run artifact id: `10391601848`

Artifact ZIP SHA-256:

`1de3fadbb9effd64298f182a9d2f3e622b97ac75e9ad87f2bfd01b74749c9cd6`

The artifact contains:

- `desktop.png`
- `mobile.png`
- `report.json`

## Separate Interior2 visual gate

The actual Blender first-person review was visually inspected before promotion. `validation/v0.4-interior2-critique.md` records `INTERIOR TOUR GATE — PASS / FREEZE INTERIOR2` after checking the living/dining interior, staircase, hollow master-suite shell, furniture, room door and upper-floor connection.

## Claim boundary

This evidence proves live browser delivery, promoted-asset integrity, the two-floor navigation plan, selected client-viewing/first-person states, responsive layout behavior, developer-case/CTA delivery and absence of detected runtime/network errors in the tested run.

The plan is a navigation schematic, not a measured architectural drawing. First-person free-walk currently has no collision/navmesh guarantee, so this evidence does not prove continuous physically valid traversal through every opening or stair tread.

The `5-day digital twin pilot` is a bounded service offer, not evidence that every future client property can be completed in five days irrespective of source quality, scope or access. Scope and source materials must be agreed first.

This evidence does **not** turn the portfolio prototype into BIM, engineering or construction documentation, accessibility/code-compliance evidence, valuation, sales forecasting or as-built documentation.
