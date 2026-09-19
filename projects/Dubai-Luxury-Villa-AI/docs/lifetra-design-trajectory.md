# Lifetra-Inspired Design Trajectory Skill

This skill applies Lifetra-style reasoning to the Dubai Luxury Villa visual workflow. Lifetra itself is not a runtime dependency here; its concepts are used as a design-review method for causal, spatial and temporal continuity.

## Why this layer exists

A normal visual loop is strong at improving a fixed screenshot:

`target -> build -> capture -> critic -> fix -> capture`

That is necessary but incomplete for an interactive house. The client does not experience isolated screenshots. They experience a **trajectory through space and time**:

`exterior -> threshold -> living -> dining -> stairs -> landing -> master -> terrace`

The design can look good in every still frame and still feel wrong during movement. A door can be visually correct but approached from the wrong angle. A landing can look premium but destroy orientation. Day and night can each look good while the transition between them feels like a hard lighting reset.

This skill therefore reviews the house as a continuous trajectory, not only as a collection of scenes.

---

## 1. Thread: the design orientation center

The **thread** is the stable design direction that every iteration must preserve.

For this project the thread is:

> A premium, calm, spatially legible luxury-property experience in which the client always understands where they are, what they are looking at, how spaces connect, and why each visual choice supports the property story.

The thread is more stable than any single target image. A target image may change; the thread should not drift silently.

### Thread invariants

Every design change should preserve:

- luxury restraint rather than decorative noise;
- human eye-level spatial understanding;
- continuity between plan, dollhouse and first-person views;
- readable thresholds, doors, stairs and circulation;
- physical material identity;
- warm/cool lighting intent;
- a clear client journey;
- functional QA and evidence integrity.

If an iteration improves one screenshot but violates one of these invariants, it is not a net improvement.

---

## 2. Bead: one bounded state of the experience

A **bead** is one reviewable state slice on the thread.

A bead can be:

- one fixed viewpoint in one iteration;
- one room at one lighting state;
- one interaction state;
- one movement interval, such as the stair ascent;
- one mobile viewport state;
- one complete client-tour checkpoint.

Examples:

- `upper-landing / evening / iteration-04`
- `master-bedroom / day / iteration-06`
- `floor-2-plan / current-position=landing`
- `stairs / transition / t=0..4s`

Each bead should preserve evidence: screenshot, target, critic result, commit SHA and functional QA.

---

## 3. Sectors inside a bead

Do not score a bead as one vague "looks good" value. Split it into sectors and reason about relations between them.

### Spatial sector

- camera position and height;
- room boundaries;
- thresholds and doors;
- visible circulation path;
- stair geometry;
- relationship to previous and next room;
- plan position and heading.

### Composition sector

- focal object;
- dominant planes;
- depth layers;
- foreground / midground / background;
- visual weight;
- camera FOV.

### Light sector

- exposure;
- highlight retention;
- shadow readability;
- practical lights;
- warm/cool balance;
- adaptation between spaces;
- day/evening/night continuity.

### Material sector

- plaster / stone / timber / metal / glass / fabric / water separation;
- roughness response;
- normal/detail scale;
- reflections;
- material consistency across adjacent rooms.

### Interaction sector

- plan click -> camera destination;
- door/threshold crossing;
- stairs and vertical movement;
- pointer/touch behavior;
- room/floor synchronization;
- state transitions between PLAN / DOLLHOUSE / WALK.

### Interface sector

- viewer dominance;
- current floor / room / position clarity;
- plan readability;
- scarce gold accent;
- onboarding density;
- mobile hierarchy.

### Emotional / sales sector

- calm premium impression;
- spatial confidence;
- desire to continue the tour;
- clarity of the property's strongest feature;
- absence of "technical demo" feeling.

### Performance sector

- frame pacing;
- loading state;
- interaction latency;
- mobile stability;
- no visual simplification that destroys the premium read.

---

## 4. Causal graph: find the root cause, not the visible symptom

The critic should not stop at observations such as:

> "The landing looks too white."

It should build a short causal graph.

Example:

```text
camera too close to wall
        |
        v
wall occupies 55% of frame
        |
        +----> weak depth cues
        |
        +----> bright plaster dominates exposure
                      |
                      v
          material families collapse
                      |
                      v
           spatial legibility drops
```

This graph suggests that lowering exposure alone would treat a symptom. The first intervention should be camera/space composition, then lighting/material tuning.

### Causal review rule

Before editing, write:

- observed defect;
- probable root cause;
- causal path;
- smallest intervention at the earliest controllable cause;
- expected positive effect;
- possible regressions.

After editing, compare expected effect with observed effect.

---

## 5. Transitions are first-class design objects

For a virtual property tour, the **edge between beads is often more important than either endpoint**.

Review these transitions explicitly:

1. Exterior -> Entry
2. Entry -> Living
3. Living -> Dining
4. Dining -> Stair Hall
5. Stair Hall -> Upper Landing
6. Upper Landing -> Master Bedroom
7. Master Bedroom -> route back / terrace
8. Plan -> Dollhouse
9. Dollhouse -> Walk
10. Day -> Evening -> Night

### Transition gate

For every important transition check:

- Is the destination visually anticipated before movement begins?
- Does heading change smoothly?
- Does camera height remain human and continuous?
- Does exposure adapt without a visible pop?
- Do materials remain recognizable through the movement?
- Does the user retain spatial memory of where they came from?
- Does the plan marker remain synchronized?
- Are doors and stairs perceived as actual connectors rather than teleport triggers?

A scene cannot be considered finished if its endpoint screenshots pass but the transition feels discontinuous.

---

## 6. Time: review the house as a sequence, not only a frame

Use three temporal scales.

### Micro-time: frames / seconds

Review:

- camera interpolation;
- stair ascent;
- door threshold crossing;
- pointer/touch response;
- light adaptation;
- animation ease-in/ease-out.

### Meso-time: one client session

Review:

- whether orientation is preserved across 5-10 minutes;
- whether the client understands floor changes;
- whether controls become easier after onboarding;
- whether the strongest spaces arrive at the right moments;
- whether the route develops a clear narrative rather than feeling like random teleportation.

### Macro-time: design iterations

Review:

- score trajectory across versions;
- recurring defects;
- regressions;
- repeated fixes that indicate the wrong architecture;
- whether the project is converging toward the thread or merely changing appearance.

---

## 7. Branches: test alternative design hypotheses

Do not force every problem through one linear chain of tweaks.

If the same defect survives two controlled iterations, branch.

Example:

```text
                   -> branch A: move camera + widen doorway read
baseline landing --|
                   -> branch B: preserve camera + redesign wall/material/light
```

Capture both from the same gate. Compare them against the same thread invariants and target. Keep the stronger causal solution, not merely the prettier isolated screenshot.

Use a branch when:

- the same critic gap appears twice;
- one fix improves composition but harms navigation;
- a local material/light tweak cannot solve a geometry problem;
- the target itself may encode the wrong spatial assumption.

---

## 8. Resonance: cross-view coherence

A luxury house should feel like one property across different rooms and modes.

Check resonance between:

- exterior and interior material language;
- plan and real 3D geometry;
- day and evening palettes;
- Floor 1 and Floor 2;
- UI and 3D scene;
- fixed-camera presentation and free first-person walking;
- desktop and mobile.

A high-quality bead that feels like it belongs to a different project is still a failure of the thread.

---

## 9. Reflection: record contradictions

Every critic pass should explicitly note contradictions, for example:

- "warmer lighting improves luxury feel but erases limestone/timber separation";
- "wider FOV improves orientation but makes furniture scale feel cheap";
- "larger plan improves navigation but competes with the 3D viewer";
- "camera centered in corridor improves route clarity but weakens the hero composition".

Contradictions are not noise. They identify where the next design decision must balance two objectives rather than optimize one metric.

---

## 10. Synergy: evaluate combinations, not isolated components

The most important property experience emerges from combinations:

- plan + current-position marker + first-person camera;
- doorway + camera heading + warm light beyond the threshold;
- stair geometry + vertical interpolation + Floor 2 plan switch;
- material roughness + grazing light + exposure;
- room metadata + camera arrival + CTA timing.

Review whether these components reinforce one another. A feature should not be considered successful merely because it works in isolation.

---

## 11. Bead review record

Use this template for every important design iteration.

```md
# Bead: upper-landing / iteration-07

## Thread
Premium, calm, spatially legible property tour.

## Time
- start/end: ...
- scale: iteration

## Previous bead
upper-landing / iteration-06

## Evidence
- target: ...
- live screenshot: ...
- commit: ...
- functional QA: ...

## Sector observations
### Space
...
### Composition
...
### Light
...
### Materials
...
### Interaction
...
### Interface
...
### Emotional / sales
...
### Performance
...

## Causal graph
A -> B -> C

## Intervention
...

## Expected effect
...

## Observed effect
...

## Regressions / contradictions
...

## Transition impact
Which previous/next spatial transitions improved or regressed?

## Thread alignment
0-5 + explanation

## Decision
PASS / ITERATE / BRANCH / RECOVER
```

---

## 12. Release trajectory gate

A build can be promoted only when all of the following are true:

- fixed visual gates pass;
- key transition gates pass;
- no recurring P0/P1 causal defect remains across two consecutive beads;
- plan, dollhouse and walk remain spatially synchronized;
- day/evening/night states remain coherent;
- no new bead regresses a previously locked invariant without an explicit tradeoff decision;
- the current bead is closer to the design thread than the previous accepted bead.

## Boundary

This method improves design reasoning and interactive presentation fidelity. It does not establish construction truth, measured BIM accuracy, certified lighting simulation, or physical accessibility compliance.
