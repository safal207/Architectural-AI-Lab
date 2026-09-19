# Master Bedroom Camera Composition Review v1

## Evidence

Workflow run: `35076421927`
Artifact: `dubai-villa-master-bedroom-bead`
Artifact id: `10438114941`
Head: `d7a6fa3081e6886f22e29609497d9dce2a015813`

Technical gate: **PASS**

## Camera change under review

The authored camera position stays at `tour_master`.

Only presentation framing changed:

- target: `master_headboard_v04`
- first-person FOV: `56` instead of the generic `64`

No positional offset was added, so this does not mask source geometry.

## Visual verdict

**CAMERA COMPOSITION PASS**

Compared with the previous generic first-person framing:

- the bed/headboard now reads as the intentional focal destination;
- ceiling dominance is reduced;
- the frame feels less like a game camera and more like a property-presentation shot;
- the open route at the right remains visible;
- the authored room position and walk graph remain unchanged.

Freeze this camera composition unless later furniture changes create a new obstruction.

## Remaining visual defects are not camera defects

The fresh Day / Evening / Night frames expose two separate issues:

1. **Lighting-mode hierarchy is inverted.** Evening is brighter than Day and Night is brighter again. The growing runtime fixture multiplier currently overwhelms the intended reduction in global light/exposure.
2. **Walnut is still too dark.** The left wardrobe reads close to a black slab. The source `M2_WalnutTimber` already contains a diffuse wood map, while the browser also multiplies it by a dark family tint, so material tuning should be reviewed after lighting hierarchy is stable.

Do not move the camera again to compensate for either problem.

## Next controlled bead

Rebalance Day / Evening / Night as a lighting-only change and recapture the same fixed Master Bedroom composition. The intended hierarchy is:

`Day = brightest natural read -> Evening = warm middle state -> Night = darkest state with visible local fixtures`

After that passes visually, isolate the textured-walnut double-darkening problem as a separate material bead.
