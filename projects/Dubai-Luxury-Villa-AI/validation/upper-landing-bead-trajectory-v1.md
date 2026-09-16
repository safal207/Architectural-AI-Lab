# Upper Landing — Bead Trajectory v1

This evidence log applies the Lifetra-inspired bead/thread review method to one persistent visual defect in the Dubai villa walkthrough.

## Thread / orientation center

Preserve a calm luxury-property experience in which the client reaches Floor 2 at human eye level, understands the landing and master-suite threshold immediately, sees distinct material families, and never loses spatial orientation during the stair → landing → master transition.

## Persistent symptom

The Upper Landing first-person gate was dominated by a pale/white plane. Treating this only as a color problem was misleading: the symptom could be amplified by camera placement, field of view, target direction, geometry, exposure, and material-family collapse.

## Causal graph after investigation

```text
legacy exterior mass: upper_stone_spine
        |
        v
Upper Landing camera lives inside a solid volume
        |
        v
near plane / interior face occupies almost the whole frame
        |
        +----> pale/white visual symptom
        |               |
        |               v
        |      material/light tweaks cannot restore depth
        v
landing + doorway + stair context disappear
        |
        v
client loses the stair -> landing -> master transition
```

A secondary causal chain existed in parallel:

```text
single global finish tint
        -> limestone + plaster + timber + deck converge
        -> weaker depth/material cues
        -> white-plane symptom feels even stronger
```

## Beads

### Bead 0 — Baseline white-plane defect

- **State:** Upper Landing / first-person / Evening.
- **Observed:** a dominant pale plane occupied most of the viewport; only limited stair/interior context remained.
- **Initial hypothesis:** camera composition plus flat finish treatment and incomplete lighting-state control.
- **Decision:** ITERATE.

### Bead 1 — Material-family + lighting-state repair

Changes:

- finish moods changed from one global swatch to separate `stone`, `plaster`, `timber`, and `deck` family colors;
- Day / Evening / Night changed from one scalar intensity to full profiles with background, exposure, ambient, hemisphere, sun, fill, and local-interior-light values;
- ACES Filmic remains the renderer baseline.

Observed: tonal/material semantics improved, but the dominant pale plane remained.

**Conclusion:** material and lighting were contributing causes, but not the earliest controllable cause.

**Decision:** BRANCH rather than continue micro-tuning exposure.

### Bead 2A — Restore authored Blender landing anchor

Hypothesis:

> The client-side offset and alternate target created the failure. Restoring `tour_stair_upper` + `tour_look_stair_upper` should recover the composition.

Observed in First Person Tour QA run `35024971940`:

- functional route / stair transition: PASS;
- desktop + mobile QA: PASS;
- visual: **REGRESSION** — the Upper Landing became almost entirely pale/white.

**Conclusion:** the existing authored anchor was functionally valid but visually invalid for the current geometry. The old override was masking, not creating, the deeper defect.

**Decision:** RECOVER.

### Bead 2B — Human-scale FOV branch

Change:

- first-person FOV `45° -> 64°`;
- orbit view remains `45°`.

Focused Upper Landing bead capture remained effectively a solid pale field.

**Conclusion:** narrow FOV was not the root cause.

**Decision:** BRANCH to camera-location / geometry adjacency.

### Bead 2C — Pulled-back landing position

Change:

- added a pulled-back diagonal camera offset to expose more of the stair/landing context.

Observed:

- rail/stair fragments became visible;
- the giant pale field still dominated the view.

**Conclusion:** distance changed the symptom but did not remove the obstructing solid.

### Bead 2D — Same camera, master-door target

Change:

- kept the pulled-back position;
- changed only the look target to `master_door_v04`.

Observed: effectively the same dominant pale plane.

**Conclusion:** target direction was not the root cause.

## Root-cause discovery

The Blender form layer contains:

```text
upper_stone_spine
size     = (2.85, 6.80, 3.08)
location = (-3.92, -0.03, 5.00)
```

That exterior mass occupies the same volume as the v0.4 stair / Upper Landing camera. The first-person eye point was therefore inside a solid form inherited from the earlier exterior-massing stage.

The v0.4 interior layer had removed another legacy upper volume, but `upper_stone_spine` remained. This explains why camera target, FOV, exposure and color changes could not restore spatial depth.

**Root cause:** geometry conflict, not color.

## Bead 3 — Interior3 geometry repair

A new non-promoting Blender stage `v0.4-interior3` was created on the feature branch.

Controlled changes:

- removed legacy solid `upper_stone_spine` from the stair/landing circulation volume;
- replaced it with a slim side boundary outside the walking envelope;
- removed the closed `master_door_v04` leaf that filled the threshold;
- added an open master-suite door leaf and handle;
- re-authored `tour_stair_upper` and `tour_look_stair_upper` after the geometry repair;
- added an explicit clearance assertion so the Upper Landing eye point cannot silently sit inside known blockers;
- rendered a fixed 1600×900 Upper Landing review frame before any viewer promotion.

Native Blender gate run: `35027853982` — **SUCCESS**.

Validation confirmed:

- `upper_stone_spine` absent;
- old closed `master_door_v04` absent;
- open master threshold present;
- landing camera clearance assertion PASS;
- GLB 2.0 export produced;
- review render, `.blend`, GLB and receipt uploaded as evidence.

### Visual result

The Interior3 Blender render is the first bead where the giant white-plane failure disappears. The frame now contains multiple readable depth layers: glazing/vertical structure on the left, timber ceiling, floor, master-suite threshold and bedroom furniture ahead/right.

**Decision:** ROOT CAUSE CONFIRMED.

## Bead 4 — Feature-viewer candidate promotion

The gated Interior3 GLB was promoted **only** to `feat/first-person-house-tour` through `Promote v0.4 Interior3 to Feature Viewer` run `35028441163`.

Promotion checks:

- source gate receipt/hash matched;
- GLB 2.0 structure revalidated;
- required Interior3 nodes present;
- `upper_stone_spine` absent;
- closed legacy master door absent;
- viewer production build PASS;
- exact-binary HTTP smoke test PASS;
- `main` intentionally untouched.

The feature viewer manifest identifies `v0.4-interior3-feature-candidate` and explicitly marks it `FEATURE_BRANCH_VISUAL_QA_ONLY`.

**Decision:** PROMOTE TO FEATURE BRANCH FOR BROWSER EVIDENCE ONLY.

## Bead 5 — Browser recovery and lighting ownership

The browser candidate was then realigned to the Interior3-authored `tour_stair_upper` → `tour_look_stair_upper` pair with the legacy client-side Upper Landing offset removed.

The viewer also declares one browser-owned lighting engine. Any punctual lights encountered inside the loaded GLB are neutralized before the browser adds its restrained global rig and authored fixture-based local lights. This prevents a Blender-exported physical-light layer from silently stacking with the Three.js day/evening/night layer.

The Evening profile was then sculpted toward local depth rather than global brightness:

- exposure reduced;
- ambient and hemisphere contribution reduced;
- global sun/fill reduced;
- local fixture contribution increased slightly.

Focused Upper Landing Bead Gate run `35058524781` — **SUCCESS**.

Browser evidence:

- stop: `stair-upper`;
- lighting: `Evening`;
- finish mood: `warm-limestone`;
- light engine: `runtime-only`;
- runtime fixture lights: `10`;
- walk graph: `ready`;
- console errors: `0`;
- page errors: `0`.

### Visual result

The browser frame now preserves the same causal repair seen in Blender: the giant near-solid white field is gone, the left glazing/stair edge is readable, the master-suite threshold and bedroom furniture are visible ahead, and the wall/floor/wood families no longer collapse into one blank plane.

A large calm wall on the right still occupies meaningful frame area and the floor/ceiling remain intentionally bright. Those are now **composition and finish-polish questions**, not the original geometry failure.

**Decision:** FREEZE THE ROOT-CAUSE REPAIR. Continue aesthetic iteration from this bead; do not return to exposure hacks or reintroduce the removed solid.

## Next transition

The next bead should improve luxury perception without destroying the recovered circulation logic:

1. keep the current Interior3 landing geometry and authored camera pair frozen;
2. refine material micro-contrast / roughness so plaster, limestone, timber and glazing read at browser scale;
3. evaluate whether the right wall needs a small camera yaw/position refinement or a deliberate architectural feature rather than simply darkening it;
4. compare Floor 2 PLAN / DOLLHOUSE / WALK continuity with the same `YOU ARE HERE` state;
5. rerun fixed Dream Loop views and desktop + mobile tour QA.

## Release condition

Upper Landing can pass only when all are true:

1. stair arrival remains visually connected to Floor 2;
2. at least two spatial depth layers are readable in the frame;
3. master-suite threshold / next direction is understandable;
4. no single pale surface dominates the frame;
5. stone, plaster and timber remain distinguishable;
6. route graph and stair interpolation remain green;
7. desktop and mobile captures preserve the same transition logic.

The root-cause portion of this condition is now satisfied by the focused browser bead. Full release still requires the broader visual and mobile gates.

This document records causal hypotheses and observed evidence. A green functional test alone is not a visual PASS.
