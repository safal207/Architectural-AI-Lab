# Live Browser QA Evidence

Status: **PASS**

Public target: https://safal207.github.io/Architectural-AI-Lab/

Latest verified run:

- workflow: `Live Browser QA`
- run id: `34943513043`
- source commit: `cad9dcf73982aa769f4d95d33cd6fd6fab0aa220`
- browser: Playwright Chromium, headless
- live viewer asset: `v0.3-life2`
- GLB bytes: `7,311,972`
- GLB SHA-256: `715ced4b3c7182618191adcdc9b71cef9320d6b65bc0ba6a691d5c1e0f0e1e51`

## Desktop checks

- actual promoted GLB reached `data-model-state=loaded` — PASS
- live `villa.glb` bytes match `villa.asset.json` — PASS
- live `villa.glb` SHA-256 matches provenance — PASS
- Master Bedroom room selection/focus path — PASS
- Night presentation lighting state — PASS
- Warm Wood material presentation state — PASS
- orbit drag smoke test — PASS
- zoom wheel smoke test — PASS
- desktop screenshot captured — PASS

## Mobile checks

Viewport: `390 × 844`.

- actual promoted GLB reached loaded state — PASS
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

Run artifact id: `10385848360`

Artifact ZIP SHA-256:

`775989af0402ae8dc1b17e766d9d03503bc24f1d7792954223b79923adeddf12`

The artifact contains:

- `desktop.png`
- `mobile.png`
- `report.json`

## Claim boundary

This evidence proves live browser delivery, promoted-asset integrity, selected interaction paths, responsive layout behavior and absence of detected runtime/network errors in the tested run.

It does **not** turn this portfolio prototype into BIM, engineering or construction documentation, code-compliance evidence, valuation, or a sales forecast. It also does not silently replace the separate architectural/render aesthetic gate recorded by the Life-stage validation documents.
