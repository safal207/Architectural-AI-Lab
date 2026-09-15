# Dream Loop for the Dubai Luxury Villa

This project uses a closed visual refinement loop inspired by `achimala/dream-loop`, adapted for luxury PropTech and digital-twin presentation work.

## Purpose

Do not judge a 3D scene only from code or a single successful build. The live browser output is the product. Every important visual change must be checked against a deliberate target frame and a fixed critic rubric.

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

4. **Make the smallest useful change**
   - Prefer one controlled change set: camera, light, material, composition, plan readability, or UI hierarchy.
   - Preserve already-passing walkthrough and provenance checks.

5. **Re-capture**
   - Re-run the exact same viewpoint.
   - Continue until the critic gate passes or the remaining gap is explicitly accepted.

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

### F. Mobile
- no horizontal overflow
- plan labels remain readable
- touch controls do not cover the main focal area
- the 3D scene remains large enough to be useful

## Pass rule

A visual gate passes when:

- no category scores below 3/5;
- Composition, Light/Color and Spatial Legibility are each at least 4/5;
- there is no P0/P1 visual defect;
- the corresponding functional QA remains green.

## Evidence

Each iteration should preserve:

- target reference identifier or image;
- live screenshot;
- critic report;
- code commit SHA;
- functional QA result;
- explicit PASS / FAIL decision.

## Important boundary

Dream Loop improves presentation fidelity. It does not turn a concept model into measured BIM, construction documentation, certified daylight simulation or a collision-accurate architectural model.
