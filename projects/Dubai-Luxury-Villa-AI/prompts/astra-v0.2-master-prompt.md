# Astra Master Prompt — Dubai Luxury Villa v0.2

```text
/goal

Build a portfolio-grade luxury architectural experience:

DUBAI PRIVATE RESIDENCE v0.2

FINAL GOAL

Create an architectural concept that immediately reads as a premium Dubai private residence and can later be delivered as an interactive browser-based digital twin.

The result must feel like work from a high-end architectural visualization studio, not a generic procedural 3D demo.

PHASE 1 — REFERENCE

Do not begin final geometry from imagination.

First establish a visual target from the provided reference set.

Extract:
- architectural massing
- facade proportions
- cantilevers
- glass-to-solid ratio
- stone treatment
- timber accents
- dark metal details
- pool relationship
- landscape language
- lighting mood
- camera composition

Create a concise visual specification.

Separate FACTS visible in the references from DESIGN DECISIONS inferred for our new concept.

PHASE 2 — HERO VIEW

The primary deliverable is ONE exceptional exterior hero view.

Priority:
1. architecture
2. proportions
3. materials
4. lighting
5. landscape
6. reflections
7. composition
8. secondary detail

Do not expand scope until the hero view is strong.

PHASE 3 — SPECIALIZED WORKSTREAMS

Treat these as separate quality domains:
A. architectural shell
B. glazing / frames / facade detail
C. pool and terrace
D. landscaping
E. premium materials
F. lighting
G. camera and composition

Each domain must remain editable and clearly named in Blender.

PHASE 4 — BLENDER

Use Blender as the source of truth for visual assets.

Prefer editable Blender geometry and materials over raw Three.js geometry.

Keep objects:
- separate
- named
- regenerable
- logically grouped

Maintain metric scale.

Do not make BIM or construction-ready claims.

PHASE 5 — CRITIQUE

The builder must not approve its own work.

After each meaningful render, perform a separate visual critique against the locked references.

Judge:
- silhouette
- proportions
- material realism
- glass
- landscaping
- lighting
- visual hierarchy
- camera
- premium feel

Return only the highest-impact defects.
Every defect becomes a specific work order.
Do not add new features while high-impact visual defects remain.

PHASE 6 — ACCEPTANCE

Do not declare the hero asset complete unless:
- architecture is visually coherent
- no obvious primitive/blockout feeling remains
- facade has believable depth
- glazing reads as glass
- stone/wood/metal are clearly differentiated
- pool and landscape support the architecture
- composition has a strong focal point
- no major intersection/floating-geometry errors are visible
- the image feels portfolio-ready at first glance

PHASE 7 — INTERACTIVE DELIVERY

Only after visual approval:

Export GLB with:
- stable object names
- material names
- room anchors
- scale preserved

Build a lightweight Three.js viewer.

The initial screen should be minimal:

DUBAI PRIVATE RESIDENCE
AI DIGITAL TWIN

[ Explore Residence ]

No engineering dashboard on the hero screen.

PHASE 8 — VALIDATION

Check:
- GLB validity
- object naming
- material presence
- camera presets
- mobile layout
- desktop layout
- load failures
- orbit controls
- room navigation
- day/sunset/night states

Keep a reproducible validation receipt.

CONSTRAINT

Do not optimize for quantity.
One exceptional exterior is more valuable than ten mediocre rooms.
Do not stop at “technically works.”
Stop when the result is something a premium real-estate developer could reasonably want to present to a client.
```
