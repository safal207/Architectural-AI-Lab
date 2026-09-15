# Dream Loop for the Dubai Luxury Villa

This project uses a closed visual refinement loop inspired by `achimala/dream-loop`, adapted for luxury PropTech and digital-twin presentation work.

It is extended by the project-specific **Lifetra-inspired Design Trajectory Skill** in `docs/lifetra-design-trajectory.md`. Dream Loop improves individual visual states; the trajectory layer checks whether those states connect coherently through space and time.

## Purpose

Do not judge a 3D scene only from code or a single successful build. The live browser output is the product. Every important visual change must be checked against a deliberate target frame and a fixed critic rubric.

For an interactive property, a second rule applies:

> A sequence of beautiful screenshots is not enough. The client journey between them must also remain spatially and visually coherent.

## Loop

1. **Dream the target**
   - Generate or curate a target image for one fixed viewpoint.
   - The target must describe composition, lighting, material separation, camera height, FOV, atmosphere and the intended premium feeling.
   - It is a visual direction target, not construction truth.

2. **Capture the live scene**
   - Build the current branch.
   - Start the production preview.
   - Capture the exact fixed viewpoint with Playwright.
   - Never compare a hand-picked screenshot against a different camera.

3. **Independent critic pass**
   - Compare target and live capture.
   - Do not ask the builder to grade itself.
   - Critic reports only observable differences and classifies them by impact.

4. **Build the causal graph before editing**
   - Separate the visible symptom from the probable root cause.
   - Record the causal path across space, composition, light, material and interaction.
   - Prefer the earliest controllable cause over cosmetic downstream treatment.
   - Example: `camera too close -> wall dominates -> exposure bias -> material collapse -> spatial confusion`.

5. **Make the smallest causal intervention**
   - Prefer one controlled change set: camera, light, material, composition, plan readability, UI hierarchy, geometry or transition behavior.
   - State the expected effect before making the change.
   - Preserve already-passing walkthrough and provenance checks.

6. **Re-capture the same bead**
   - Re-run the exact same viewpoint or interaction state.
   - Compare expected vs observed effect.
   - Record regressions and contradictions rather than hiding them.

7. **Review the transition edges**
   - Check the path into and out of this state, not just the endpoint.
   - Verify heading continuity, camera height, exposure adaptation, doorway/stair readability, material continuity and plan-marker synchronization.

8. **Continue, branch or recover**
   - Continue if the causal hypothesis worked.
   - Branch when the same blocker survives two controlled iterations or when two plausible design hypotheses compete.
   - Recover/rollback when the new bead improves one metric but breaks locked thread invariants.

## Thread and bead model

Use `docs/lifetra-design-trajectory.md` for the complete method.

Short version:

- **Thread** = persistent design direction: premium, calm, spatially legible property experience.
- **Bead** = one bounded design state: fixed viewpoint, room/light state, interaction state or movement interval.
- **Sectors** = space, composition, light, materials, interaction, interface, emotional/sales and performance.
- **Edges inside a bead** = causal relations between observed conditions.
- **Transition between beads** = the intervention and its observed effect through time and optional spatial scope.

This prevents the loop from becoming a screenshot history without explanation.

## Fixed visual gates

The primary desktop viewpoints are:

1. exterior-overview
2. entry
3. living
4. dining
5. stair-ground
6. upper-landing
7. master-bedroom
8. pool-terrace

Secondary UI gates:

- floor-1-plan
- floor-2-plan
- mobile-entry
- mobile-plan

## Fixed transition gates

The primary movement / state transitions are:

1. exterior -> entry
2. entry -> living
3. living -> dining
4. dining -> stair-ground
5. stair-ground -> upper-landing
6. upper-landing -> master-bedroom
7. PLAN -> DOLLHOUSE
8. DOLLHOUSE -> WALK
9. Day -> Evening
10. Evening -> Night

A build with passing static shots but failing transition gates is not presentation-ready.

## Critic rubric

Score each item 0-5.

### A. Composition
- clear focal point
- camera not intersecting or sitting too close to geometry
- horizon / verticals feel intentional
- enough spatial context to understand the room

### B. Luxury material read
- plaster, stone, timber, metal, glass and fabric remain visually distinct
- no giant flat white planes unless intentionally designed
- roughness and highlight behavior feel plausible
- no single tint destroys material identity

### C. Light and color
- highlights retain detail
- shadows are not crushed
- warm / cool balance is intentional
- day, evening and night each feel distinct
- practical lights support the architecture rather than flatten it

### D. Spatial legibility
- the viewer understands where they are
- doors and circulation read clearly
- stairs feel traversable
- first-person camera height feels human

### E. Interface hierarchy
- the 3D scene remains the hero
- plan and route support the scene instead of competing with it
- current room / floor / position are obvious
- gold is used as a scarce accent, not decoration everywhere

### F. Transition continuity
- the destination is visually anticipated before movement
- camera heading and height evolve smoothly
- threshold/stair movement reads physically rather than as teleportation
- exposure and materials remain coherent during movement
- the client retains spatial memory across the transition

### G. Cross-view resonance
- plan, dollhouse and walk describe the same spatial truth
- adjacent rooms share a coherent material and lighting language
- exterior and interior feel like the same property
- desktop and mobile preserve the same visual priorities

### H. Mobile
- no horizontal overflow
- plan labels remain readable
- touch controls do not cover the main focal area
- the 3D scene remains large enough to be useful

## Pass rule

A visual bead passes when:

- no category scores below 3/5;
- Composition, Light/Color, Spatial Legibility and Transition Continuity are each at least 4/5 where applicable;
- there is no P0/P1 visual defect;
- the corresponding functional QA remains green;
- the bead does not silently regress a previously locked thread invariant.

A release trajectory passes when:

- all critical beads pass;
- all primary transition gates pass;
- plan / dollhouse / walk stay synchronized;
- day / evening / night remain coherent;
- no repeated causal blocker survives two iterations without a branch or architectural rethink.

## Evidence

Each iteration should preserve:

- target reference identifier or image;
- live screenshot;
- previous accepted screenshot when available;
- critic report;
- causal graph / root-cause hypothesis;
- intervention and expected effect;
- observed effect and regressions;
- affected spatial scope / transition;
- code commit SHA;
- functional QA result;
- explicit PASS / ITERATE / BRANCH / RECOVER decision.

## Important boundary

Dream Loop and the Lifetra-inspired trajectory layer improve presentation fidelity and design reasoning. They do not turn a concept model into measured BIM, construction documentation, certified daylight simulation or a collision-accurate architectural model.
