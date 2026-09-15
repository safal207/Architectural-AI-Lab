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
- Day / Evening / Night changed from one scalar intensity to full profiles with background, exposure, ambient, hemisphere, sun, and fill values;
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

This does **not** yet mean the browser tour is released. It means the causal hypothesis is confirmed strongly enough to promote the candidate into the feature-branch viewer for browser-level QA.

**Decision:** ROOT CAUSE CONFIRMED → promote only to feature branch → run browser bead gate → then judge PASS / ITERATE.

## Next transition

`Interior2 old GLB` → `Interior3 candidate GLB` on `feat/first-person-house-tour` only.

After promotion, run:

1. Upper Landing focused bead capture;
2. First Person Tour QA;
3. Floor Plan Visual Gate;
4. fixed Dream Loop views;
5. desktop + mobile visual review.

If browser Upper Landing preserves the new spatial depth and route QA stays green, freeze this geometry bead. If not, continue from the new geometry state rather than returning to exposure hacks.

## Release condition

Upper Landing can pass only when all are true:

1. stair arrival remains visually connected to Floor 2;
2. at least two spatial depth layers are readable in the frame;
3. master-suite threshold / next direction is understandable;
4. no single pale surface dominates the frame;
5. stone, plaster and timber remain distinguishable;
6. route graph and stair interpolation remain green;
7. desktop and mobile captures preserve the same transition logic.

This document records causal hypotheses and observed evidence. A green functional test alone is not a visual PASS.
