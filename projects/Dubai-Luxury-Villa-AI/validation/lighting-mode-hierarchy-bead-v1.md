# Lighting Mode Hierarchy Bead v1

## Evidence that triggered this bead

The fixed Master Bedroom Day / Evening / Night evidence showed an inverted perceptual hierarchy: Evening rendered brighter than Day and Night brighter than Evening.

The issue was not the camera. The browser presets increased the runtime interior-light multiplier from `0.12` (Day) to `0.44` (Evening) to `0.60` (Night), while exposure/global light dropped by a much smaller amount. Local fixtures therefore dominated the frame at night.

## Scope

Lighting-only rebalance. No camera, geometry, material-family, walk-graph or fixture-position changes in this bead.

## New mode intent

### Day

- strongest natural/global illumination;
- local fixtures are supportive, not dominant;
- pale materials retain structure instead of washing out.

Preset:

- exposure `0.78`
- ambient `0.72`
- hemisphere `0.45`
- sun `1.45`
- fill `0.17`
- interior `0.10`

### Evening

- clearly darker than Day;
- warmer local fixtures become visible;
- enough ambient structure remains to read architecture.

Preset:

- exposure `0.58`
- ambient `0.27`
- hemisphere `0.16`
- sun `0.30`
- fill `0.07`
- interior `0.26`

### Night

- darkest global state;
- local fixtures remain visible but must not make the whole room brighter than Evening;
- walls, bed and circulation route stay readable.

Preset:

- exposure `0.42`
- ambient `0.11`
- hemisphere `0.06`
- sun `0.04`
- fill `0.03`
- interior `0.24`

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

## Next after PASS

Isolate textured walnut. `M2_WalnutTimber` already contains a diffuse map; the browser currently applies a dark family tint on top of it. If the wardrobe remains near-black after lighting hierarchy is corrected, fix that as a separate material bead rather than brightening the whole room.
