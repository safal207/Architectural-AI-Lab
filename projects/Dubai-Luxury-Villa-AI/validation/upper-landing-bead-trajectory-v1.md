# Upper Landing — Bead Trajectory v1

This evidence log applies the Lifetra-inspired bead/thread review method to one persistent visual defect in the Dubai villa walkthrough.

## Thread / orientation center

Preserve a calm luxury-property experience in which the client reaches Floor 2 at human eye level, understands the landing and master-suite threshold immediately, sees distinct material families, and never loses spatial orientation during the stair → landing → master transition.

## Persistent symptom

The Upper Landing first-person gate was dominated by a pale/white plane. Treating this only as a color problem would be misleading: the symptom can be amplified by camera placement, field of view, target direction, geometry, exposure, and material-family collapse.

## Causal graph

```text
camera anchor / target / FOV
        |
        v
visible plane occupancy in frame
        |
        +----> auto-perceived brightness / low local contrast
        |                 |
        |                 v
        |        material families look collapsed
        |                 |
        v                 v
spatial context disappears + doorway/stair legibility drops
        |
        v
client loses the landing -> master transition
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
- **Likely causes:** camera composition plus flat finish treatment and incomplete lighting-state control.
- **Decision:** ITERATE.

### Bead 1 — Material-family + lighting-state repair

Changes:

- finish moods changed from one global swatch to separate `stone`, `plaster`, `timber`, and `deck` family colors;
- Day / Evening / Night changed from one scalar intensity to full profiles with background, exposure, ambient, hemisphere, sun, and fill values;
- ACES Filmic remains the renderer baseline.

Evidence from the subsequent browser capture showed improved UI/material semantics and a warmer tonal system, but the dominant pale plane remained.

**Conclusion:** material and lighting were real contributing causes, but not the earliest controllable cause of the landing failure.

**Decision:** BRANCH rather than continue micro-tuning exposure.

### Bead 2A — Authored Blender landing anchor branch

Hypothesis:

> The client-side camera offset and alternate master-door target were pushing the camera away from the authored Blender viewpoint. Restoring `tour_stair_upper` + `tour_look_stair_upper` should recover the intended corridor composition.

Change:

- removed the client-side `cameraOffsetLocal` from `stair-upper`;
- restored `tour_look_stair_upper` as the look target.

Observed result from First Person Tour QA run `35024971940`:

- functional route / stair transition: PASS;
- desktop + mobile QA: PASS;
- visual result: **REGRESSION** — the viewer became almost entirely pale/white at Upper Landing.

**Conclusion:** the authored anchor is functionally valid but visually unsuitable in the current web-viewer framing. The original override was masking, not creating, the deeper camera/framing problem.

**Decision:** RECOVER from this visual branch and test a broader human-scale camera lens before changing geometry.

### Bead 2B — Human-scale FOV branch

Hypothesis:

> A 45° perspective camera is too narrow for a compact landing and makes a nearby wall/door/plane occupy an excessive fraction of the frame. A 64° first-person FOV should reveal enough peripheral architecture to diagnose whether the remaining defect is camera placement or actual geometry.

Change:

- first-person FOV: `45° -> 64°`;
- orbit view remains at `45°`;
- camera anchor and authored look target remain fixed during this bead so the FOV effect can be isolated.

**Status:** pending fresh fixed-gate capture.

## Transition rules for the next bead

After Bead 2B capture:

- **If spatial context returns:** keep 60–68° FOV and refine the landing anchor/target with one controlled camera move.
- **If the frame remains a near-solid plane:** classify the defect as camera-location / geometry adjacency, not color. Move to Branch C: relocate the landing anchor farther back and off-axis, or rebuild the landing/door geometry in Blender.
- **Do not** compensate with lower exposure alone.
- **Do not** globally darken plaster/stone just to hide the plane.

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
