# Luxury PropTech Visual Review Skill

Use this review before promoting any new villa viewer build.

## Intent

The experience should feel like a premium property presentation first and an engineering demo second. The visual system must stay restrained, warm, spatially legible and easy to navigate.

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

### 3. Material realism
- Stone, plaster, timber, metal, glass, water and fabric must read as different families.
- Never recolor all architectural materials as one flat hex if a family-specific treatment is available.
- Preserve roughness / normal / AO / metallic intent.
- Material switching should change a bounded finish family, not the entire house indiscriminately.

### 4. Camera composition
- Eye-level walkthrough target: ~1.62–1.68 m.
- First-person FOV target: 60–68 degrees.
- No camera anchor may begin inside or immediately against a wall, slab, roof or solid furniture mass.
- Upper landing and stairs must have a clear forward view.
- Exterior overview should reveal arrival, pool and primary facade in one readable composition.

### 5. Spatial navigation
- Client route: exterior → entry → living → dining → stairs → upper landing → master → pool.
- Floor plan must show current floor, room, stair transition and current-position marker when available.
- Stair traversal must interpolate vertical movement rather than teleport floors.
- Walk mode must remain bounded to the approved presentation route until a true collision/navmesh layer is promoted.

### 6. UI restraint
- Background / surface / elevated-surface depth should be visually distinct.
- Use gold only for selected state, CTA, current route and key proof.
- Hide engineering/debug instructions after onboarding where possible.
- On mobile: prioritize Viewer → Plan / Route → Controls; secondary product panels can follow below.

### 7. Visual gate shots
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

## Release rule

Do not call a build presentation-ready only because CI is green. Promotion requires both functional QA and a visual review of the fixed gate shots above.
