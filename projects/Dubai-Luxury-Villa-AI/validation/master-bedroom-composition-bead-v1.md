# Master Bedroom Composition / Depth Bead v1

## Purpose

The Master Bedroom is the next controlled interior review after the Upper Landing geometry/lighting repair and the material micro-contrast bead.

This bead does **not** assume the bedroom needs a redesign. It creates fresh, repeatable browser evidence first, so any design change is based on what the client actually sees rather than on guesses from source geometry or old renders.

## Frozen upstream decisions

Do not reopen these without new evidence:

- `upper_stone_spine` remains removed;
- `tour_stair_upper` remains the authored Upper Landing anchor;
- the master-suite threshold stays physically open;
- no browser camera offset is added to hide source geometry;
- imported GLB punctual lights remain disabled;
- browser runtime lighting remains the only active lighting engine;
- `family-microcontrast-v1` remains the current restrained material response.

## What this bead reviews

The Master Bedroom should read as a calm destination after the stair/landing sequence rather than as another flat white room.

Visual review is based on five design questions:

1. **Geometry** — does the room shell create a believable enclosed bedroom with a readable entrance, floor and ceiling?
2. **Material** — can the viewer distinguish limestone/plaster/timber/fabric instead of reading one beige/white mass?
3. **Light** — does the bed area remain readable in Day, Evening and Night without clipping to white or collapsing into black?
4. **Camera / depth** — does the authored `master` view produce foreground -> bed/midground -> rear-wall/wardrobe depth rather than a flat elevation?
5. **Proof** — do fresh browser captures support the conclusion?

## Browser evidence contract

`qa/master-bedroom-bead.mjs` enters the bounded walkthrough, selects the authored `master` stop and captures the same composition in:

1. Day
2. Evening
3. Night

For every frame the test requires:

- `data-tour-stop="master"`
- first-person mode
- `data-lighting-profile="interior-adapted"`
- `data-light-engine="runtime-only"`
- ready walk graph
- `data-material-response-profile="family-microcontrast-v1"`
- all four material families recognized
- runtime interior light layer present
- zero browser console/page errors

The three screenshots plus `report.json` are uploaded as the `dubai-villa-master-bedroom-bead` Actions artifact.

## Visual acceptance criteria

Automation only proves that the intended pipeline is active. A visual PASS requires looking at all three fresh captures.

PASS only when:

- the bed is an obvious focal point but not an isolated floating object;
- entry/threshold direction remains understandable;
- there is clear foreground, midground and background separation;
- wardrobe/rear wall helps establish room depth rather than becoming a dark slab;
- plaster and limestone do not merge into a blown-out white field;
- walnut remains readable without crushed-black loss;
- bedside lights support the scene rather than creating orange blobs;
- Night retains enough structure to read the architecture;
- no camera clipping, furniture intersection or route regression is visible.

## If the visual bead fails

Diagnose in this order instead of changing everything at once:

1. **Camera composition** — target/focal direction, height, proximity to furniture.
2. **Local furniture composition** — bed, side tables, wardrobe, negative space.
3. **Local light hierarchy** — only Master Bedroom fixture placement/intensity if needed.
4. **Local material response** — only if a specific family loses identity in this room.
5. **Geometry** — only if source shapes/openings are genuinely wrong.

Do not solve a local Master Bedroom problem with global exposure changes.

## Status

Evidence harness implemented on `feat/first-person-house-tour`.

Visual PASS is intentionally withheld until the fresh Day / Evening / Night browser artifacts are inspected.

## Next after PASS

Run full authored-stop walkthrough visual QA, then desktop/mobile regression and GLB/loading/performance work before expanding into the Villa Context Prototype.
