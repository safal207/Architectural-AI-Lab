# Lighting Mode Hierarchy Bead v1

## Evidence that triggered this bead

The fixed Master Bedroom Day / Evening / Night evidence originally showed an inverted perceptual hierarchy: Evening rendered brighter than Day and Night brighter than Evening.

The issue was not the camera. The old browser presets increased the runtime interior-light multiplier from `0.12` (Day) to `0.44` (Evening) to `0.60` (Night), while exposure/global light dropped by a much smaller amount. Local fixtures therefore dominated the frame at night.

## Scope

Lighting-only rebalance. No camera, geometry, material-family, walk-graph or fixture-position changes in this bead.

## Final mode hierarchy

### Day

- exposure `0.82`
- ambient `0.78`
- hemisphere `0.50`
- sun `1.55`
- fill `0.18`
- interior `0.08`

### Evening

- exposure `0.52`
- ambient `0.22`
- hemisphere `0.13`
- sun `0.24`
- fill `0.055`
- interior `0.19`

### Night

- exposure `0.40`
- ambient `0.08`
- hemisphere `0.045`
- sun `0.02`
- fill `0.02`
- interior `0.18`

## Evidence

Source head: `4a7fca490df27b8d00f28c425883d497cb5ad083`

Master Bedroom workflow run: `35078325360`
Artifact: `10439626242`
Automated result: **PASS**

The fixed camera composition remained `tour_master` -> `master_headboard_v04`, FOV `56`, so the three lighting frames are directly comparable.

Supporting canvas luminance statistics from the fresh browser captures:

| Mode | Mean luminance | Median | Near-black pixels |
| --- | ---: | ---: | ---: |
| Day | `87.5` | `98` | `20.4%` |
| Evening | `74.3` | `75` | `23.0%` |
| Night | `57.6` | `55` | `31.7%` |

These statistics are supporting evidence only; the visual frames were also inspected.

## Visual review

**PASS**

- Day is now the brightest/natural state without large white clipping;
- Evening is clearly darker while retaining warm local light;
- Night is darker than Evening but still preserves the bed, wall planes and route;
- the three modes no longer look like progressively brighter duplicates;
- material response, walk graph and browser runtime remain stable;
- console/page errors remain zero.

The later walnut colour-factor repair also retained this ordering, so the lighting hierarchy is considered stable.

## Status

**VISUAL PASS — freeze the Day / Evening / Night hierarchy.**

Do not use global exposure changes to solve future local room defects. The next scene-level review should adjust local fixture hierarchy or composition only where fresh walkthrough evidence justifies it.
