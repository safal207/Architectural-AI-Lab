# Live Browser QA Evidence

Status: **PASS**

Public target: https://safal207.github.io/Architectural-AI-Lab/

Latest verified run:

- workflow: `Live Browser QA`
- run id: `34949976641`
- source commit: `f60e06bac0855b051228e2f2d7e6a12255b4991c`
- browser: Playwright Chromium, headless
- live viewer asset: `v0.3-life2`
- GLB bytes: `7,311,972`
- GLB SHA-256: `715ced4b3c7182618191adcdc9b71cef9320d6b65bc0ba6a691d5c1e0f0e1e51`

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

Run artifact id: `10388294783`

Artifact ZIP SHA-256:

`7926054e4a17d322b5a1625ca6359c89fcdfb96138cc27a28988e617844e425f`

The artifact contains:

- `desktop.png`
- `mobile.png`
- `report.json`

## Claim boundary

This evidence proves live browser delivery, promoted-asset integrity, selected interaction paths, responsive layout behavior, developer-case/CTA delivery and absence of detected runtime/network errors in the tested run.

The `5-day digital twin pilot` is a bounded service offer, not evidence that every future client property can be completed in five days irrespective of source quality, scope or access. Scope and source materials must be agreed first.

This evidence does **not** turn the portfolio prototype into BIM, engineering or construction documentation, code-compliance evidence, valuation, or a sales forecast. It also does not silently replace the separate architectural/render aesthetic gate recorded by the Life-stage validation documents.
