# Lighting Mode Hierarchy Bead v1

## Evidence that triggered this bead

The fixed Master Bedroom Day / Evening / Night evidence originally showed an inverted perceptual hierarchy: Evening rendered brighter than Day and Night brighter than Evening.

The issue was not the camera. The old browser presets increased the runtime interior-light multiplier from `0.12` (Day) to `0.44` (Evening) to `0.60` (Night), while exposure/global light dropped by a much smaller amount. Local fixtures therefore dominated the frame at night.

## Scope

Lighting-only rebalance. No camera, geometry, material-family, walk-graph or fixture-position changes in this bead.

## First tuning pass result

The first rebalance successfully made Night darker and readable, but fresh browser evidence still showed Evening slightly brighter than Day across the Master Bedroom canvas. That was not accepted as the final hierarchy.

This second pass increases the natural/global Day separation and reduces the Evening/Night local-light contribution further.

## Current candidate mode intent

### Day

- strongest natural/global illumination;
- local fixtures are supportive, not dominant;
- pale materials retain structure instead of washing out.

Preset:

- exposure `0.82`
- ambient `0.78`
- hemisphere `0.50`
- sun `1.55`
- fill `0.18`
- interior `0.08`

### Evening

- clearly darker than Day;
- warmer local fixtures remain visible;
- enough ambient structure remains to read architecture.

Preset:

- exposure `0.52`
- ambient `0.22`
- hemisphere `0.13`
- sun `0.24`
- fill `0.055`
- interior `0.19`

### Night

- darkest global state;
- local fixtures remain visible without making the whole room brighter than Evening;
- walls, bed and circulation route stay readable.

Preset:

- exposure `0.40`
- ambient `0.08`
- hemisphere `0.045`
- sun `0.02`
- fill `0.02`
- interior `0.18`

## Visual acceptance

Use the frozen Master Bedroom camera composition (`tour_master` position, `master_headboard_v04` target, FOV `56`) and inspect fresh browser evidence for all three modes.

PASS only if:

1. Day is perceptually the brightest/natural state.
2. Evening is visibly darker than Day but retains a warm residential atmosphere.
3. Night is visibly darker than Evening and does not look like a brighter duplicate.
4. Bed/headboard remains readable in all modes.
5. No mode clips large pale surfaces into featureless white.
6. Night does not crush the room into black.
7. Walk graph, material-response pipeline and browser runtime remain clean.

The review may use image statistics as supporting evidence, but the final call is visual: a local lamp hotspot must not be mistaken for the whole mode being correctly exposed.

## Next after PASS

Isolate textured walnut. `M2_WalnutTimber` already contains a diffuse map; the browser currently applies a dark family tint on top of it. If the wardrobe remains near-black after lighting hierarchy is corrected, fix that as a separate material bead rather than brightening the whole room.
