# Dubai Luxury Villa v0.2 — Hero Quality Gate

## Rule

No new feature work while the hero asset fails a high-impact visual gate.

## Gates

### G1 — Reference lock
PASS when one hero target and supporting material/lighting references are fixed before modeling.

### G2 — Silhouette
PASS when the villa reads clearly from the hero camera at thumbnail size and does not look like stacked primitive boxes.

### G3 — Proportion
PASS when floor heights, cantilevers, openings and pool relationship look architecturally believable.

### G4 — Facade depth
PASS when reveals, frames, overhangs, shadow gaps and entry depth are visible in the render.

### G5 — Materials
PASS when stone, timber, metal and glass are visually distinct without exaggerated saturation.

### G6 — Glass
PASS when glazing has believable reflection/transmission and interior depth; flat blue panels fail.

### G7 — Pool + landscape
PASS when water, deck and planting form a coherent composition with the architecture.

### G8 — Lighting
PASS when exterior, interior and landscape lighting create hierarchy without clipping windows or flattening forms.

### G9 — Camera
PASS when perspective sells the residence without severe wide-angle distortion or accidental dead space.

### G10 — Cleanup
PASS when no obvious floating geometry, intersections, broken normals, z-fighting or placeholder objects are visible.

### G11 — WOW gate
Show the hero image for 3 seconds and ask:

> Does this read as a premium architectural visualization or as an AI/3D demo?

PASS only if the first answer is “premium architectural visualization”.

## Critic protocol

The builder does not approve its own output.

For every review cycle:
1. compare current render to locked references
2. list only the five highest-impact visible defects
3. convert each defect into a concrete work order
4. fix those items before adding detail elsewhere
5. rerender from the same camera
6. repeat until no high-impact defects remain

## Stop conditions

Do not continue polishing if:
- the massing is still weak
- the camera is wrong
- material hierarchy is unclear
- the pool composition is unresolved

Fix upstream problems first.

## Ship conditions

Hero asset ships only when G1–G11 are PASS and the result is strong enough to lead the portfolio case study.
