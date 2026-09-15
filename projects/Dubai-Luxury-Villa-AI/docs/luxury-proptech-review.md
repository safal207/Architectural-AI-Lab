# Luxury PropTech Visual Review Skill

Use this review before promoting any new villa viewer build.

This skill is intentionally paired with `docs/lifetra-design-trajectory.md`: the visual review checks quality inside one state, while the trajectory review checks **cause, space, transition and continuity through time**.

## Intent

The experience should feel like a premium property presentation first and an engineering demo second. The visual system must stay restrained, warm, spatially legible and easy to navigate.

## Thread invariants

Before reviewing a single frame, preserve the project thread:

- calm luxury restraint;
- human eye-level spatial understanding;
- plan / dollhouse / walk coherence;
- doors, thresholds and stairs as readable physical connectors;
- distinct material families;
- intentional warm/cool lighting;
- a clear property-story journey;
- no visual improvement that silently breaks interaction or previously passing evidence.

## Review gates

### 1. Visual hierarchy
- The property / viewer is the dominant visual object.
- Hero copy supports the house instead of competing with it.
- Primary CTA and active route are the only strong gold accents.
- Avoid repeated same-weight cards ("card soup").

### 2. Color + exposure
- No paper-white architectural surfaces in Evening / Night.
- Warm key light + cool sky fill are both visible.
- Highlights retain texture instead of clipping to white.
- Shadows remain readable without becoming blue-black.
- Viewer and UI belong to one navy / mineral / warm-stone palette.
- Exposure changes between spaces or dayparts should adapt rather than visibly pop.

### 3. Material realism
- Stone, plaster, timber, metal, glass, water and fabric must read as different families.
- Never recolor all architectural materials as one flat hex if a family-specific treatment is available.
- Preserve roughness / normal / AO / metallic intent.
- Material switching should change a bounded finish family, not the entire house indiscriminately.
- Adjacent rooms must preserve material continuity unless a deliberate threshold change is part of the design.

### 4. Camera composition
- Eye-level walkthrough target: ~1.62–1.68 m.
- First-person FOV target: 60–68 degrees.
- No camera anchor may begin inside or immediately against a wall, slab, roof or solid furniture mass.
- Upper landing and stairs must have a clear forward view.
- Exterior overview should reveal arrival, pool and primary facade in one readable composition.
- Diagnose a bad frame through a causal graph before treating exposure/color symptoms.

### 5. Spatial navigation
- Client route: exterior → entry → living → dining → stairs → upper landing → master → pool.
- Floor plan must show current floor, room, stair transition and current-position marker when available.
- Stair traversal must interpolate vertical movement rather than teleport floors.
- Walk mode must remain bounded to the approved presentation route until a true collision/navmesh layer is promoted.
- The next destination should be visually anticipated before movement starts where possible.
- The client should retain a mental map after every room change.

### 6. Transition continuity
Treat the edges between rooms/modes as design objects.

For each critical transition check:

- camera heading continuity;
- human eye-height continuity;
- doorway / threshold readability;
- stair motion and vertical interpolation;
- light and exposure adaptation;
- material continuity;
- synchronization of plan marker, room label and floor;
- absence of teleport-like discontinuity unless explicitly intended.

Primary gates:

- Exterior → Entry
- Entry → Living
- Living → Dining
- Dining → Stair Hall
- Stair Hall → Upper Landing
- Upper Landing → Master
- PLAN → DOLLHOUSE
- DOLLHOUSE → WALK
- Day → Evening → Night

### 7. UI restraint
- Background / surface / elevated-surface depth should be visually distinct.
- Use gold only for selected state, CTA, current route and key proof.
- Hide engineering/debug instructions after onboarding where possible.
- On mobile: prioritize Viewer → Plan / Route → Controls; secondary product panels can follow below.
- The plan should guide the walkthrough rather than visually compete with it.

### 8. Resonance across views
- Exterior and interior share one material language.
- Floor 1 and Floor 2 feel like the same property.
- Plan, dollhouse and walk describe the same space.
- Day/evening/night preserve the same identity.
- Desktop/mobile preserve the same priorities.
- UI and 3D scene feel designed together rather than layered from separate products.

### 9. Causal review
Before making a design edit, write a short chain:

`observable defect -> probable root cause -> downstream effects -> intervention -> expected effect`

Example:

`camera too close to wall -> bright wall dominates frame -> exposure biases high -> material separation collapses -> landing feels empty`

This prevents a downstream color tweak from hiding a geometry/composition problem.

After the edit, record:

- observed effect;
- regressions;
- contradictions;
- whether the root-cause hypothesis was supported or rejected.

### 10. Branch rule
If the same meaningful defect appears in two controlled iterations, do not continue micro-tweaking the same path.

Branch into alternative hypotheses, for example:

- camera/geometry branch;
- light/material branch;
- target-composition branch.

Compare branches against the same fixed gate and thread invariants, then keep the stronger causal solution.

### 11. Visual gate shots
Capture and compare the same views for every candidate build:
1. Exterior Day
2. Exterior Evening
3. Entry
4. Living Room
5. Kitchen + Dining
6. Stair Ground
7. Upper Landing
8. Master Bedroom

Each shot should be checked for hierarchy, clipping, color balance, material readability, camera obstruction and premium feel.

## Bead decision

For each important state use one of four decisions:

- **PASS** — frame and connected transitions satisfy the thread;
- **ITERATE** — causal hypothesis is working and needs one more controlled refinement;
- **BRANCH** — repeated blocker or competing design hypothesis needs an alternative path;
- **RECOVER** — current change regressed a locked invariant; return to the previous accepted bead.

## Release rule

Do not call a build presentation-ready only because CI is green. Promotion requires:

- functional QA;
- fixed visual gate review;
- critical transition review;
- no unresolved recurring P0/P1 causal defect;
- plan / dollhouse / walk synchronization;
- cross-view resonance;
- no silent regression of a previously accepted thread invariant.
