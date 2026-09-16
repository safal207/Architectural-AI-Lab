# Architecture Product Roadmap v1

> Durable handoff for the Dubai Luxury Villa / architecture-design work recovered from prior project threads.

## 1. What we are building

This repository is not only a static render experiment. The current product is an **interactive architectural presentation system** that can grow from one luxury villa into reusable freelance demos, larger property context, and later game-like exploration.

Current scale path:

`Villa -> Plot -> Street -> Neighborhood -> District -> City -> Optional game layer`

The immediate goal is to finish one convincing, technically reliable villa walkthrough before expanding the scope.

## 2. Source of truth and active work

- Repository: `safal207/Architectural-AI-Lab`
- Project: `projects/Dubai-Luxury-Villa-AI`
- Active branch: `feat/first-person-house-tour`
- Active PR: `#1 Add bounded first-person house walkthrough`
- Public viewer target: `https://safal207.github.io/Architectural-AI-Lab/`

The first-person branch is the current integration surface. Do not restart this project in a new repository unless the product boundary truly changes.

## 3. The mechanics, in beginner-friendly terms

### Blender = the architectural workshop

Blender owns the authored 3D world:

- building geometry;
- rooms, stairs, openings and doors;
- material source data and textures;
- authored tour anchors / look targets;
- exported presentation asset.

When a wall physically blocks the camera or a doorway is actually closed, fix the Blender/source geometry. Do not hide that problem with a browser camera offset.

### GLB = the transport box

The Blender result is exported as `villa.glb`.

Think of GLB as the package that carries the model from the design workshop into the web experience. It should carry the geometry and source PBR material information we want to preserve.

### React + Three.js = the interactive showroom

The browser viewer owns presentation and interaction:

- orbit view;
- bounded first-person walkthrough;
- room/tour navigation;
- runtime lighting presentation;
- restrained material mood controls;
- UI, labels and client-facing experience.

The web layer may tune presentation, but it must not become a second hidden architecture model that compensates for broken source geometry.

### Walk graph = safe visitor route

The walkthrough is intentionally bounded instead of unrestricted free-fly. Authored anchors and route edges let a client explore the house while staying on a presentation-safe path.

This is a portfolio/navigation graph, not a construction-grade navmesh.

### Playwright / CI = evidence, not beauty

Browser QA verifies that the intended route, lighting/material pipeline and viewer state actually work in the real rendered application.

Automated PASS does **not** prove that an interior looks expensive. Visual acceptance still requires looking at fresh browser captures from fixed authored viewpoints.

## 4. Recovered Interior3 / Upper Landing history

The Upper Landing problem was originally misread as mainly a brightness/camera issue. The real source geometry contained an old `upper_stone_spine` volume intersecting the stair/camera region.

The geometry repair now:

- removes the old `upper_stone_spine` conflict;
- preserves the authored `tour_stair_upper` / Interior3 anchor;
- opens the route into the master suite;
- avoids the old client-side landing camera offset;
- keeps geometry fixes in Blender/source rather than masking them in the web viewer.

After that repair, a bounded lighting pass reduced the overexposed whitebox look with a local `landing-adapted` runtime profile. Imported GLB punctual lights remain disabled so the browser owns one coherent lighting engine.

These decisions are **frozen unless new evidence shows a genuine regression**. Do not casually move the Interior3 camera, restore the old spine, or globally darken the whole project to solve a local material/readability issue.

## 5. Current bead: material micro-contrast

Lighting was already far enough along that the next controlled problem was material identity.

The browser now applies restrained family-specific response while preserving source PBR maps:

| Family | Runtime roughness | Normal response intent |
| --- | ---: | ---: |
| limestone / stone | `0.60` | `1.08x` |
| plaster | `0.84` | `0.72x` |
| timber / walnut | `0.86` | `1.02x` |
| deck stone | `0.88` | `0.84x` |

Why:

- limestone should hold a restrained mineral/grazing-light response;
- plaster should stay softer and more matte;
- timber should read as wood, not as a flat dark colour or plastic gloss;
- deck stone should remain quiet and matte.

The default warm-limestone palette deliberately keeps stone, plaster, timber and deck visually separate without turning the villa into a high-contrast game level.

### Evidence views

The micro-contrast browser bead captures:

1. Living room
2. Upper Landing
3. Master bedroom

The Upper Landing has its own focused gate as well.

Visual acceptance requires actual screenshots, not only parameter changes or automated assertions.

## 6. Design language to preserve

Target feeling: **quiet high-end architectural visualization**.

Prefer:

- warm but restrained interior light;
- slightly cooler shadow structure;
- visible material boundaries;
- readable door/opening edges;
- foreground -> midground -> destination depth;
- believable matte/mineral/wood response;
- calm luxury rather than spectacle.

Avoid:

- blown-out featureless white walls;
- uniform yellow/orange wash;
- crushed blacks;
- excessive bloom;
- fake black outlines;
- game-like dramatic contrast unless we intentionally move into a later game mode;
- camera offsets used to hide source geometry mistakes.

## 7. Controlled implementation order

Do not expand scope until each stage has browser evidence.

### Stage A — finish the villa

1. Material micro-contrast gate — current bead.
2. Master Bedroom composition/depth review.
3. Full walkthrough visual QA across authored stops.
4. Desktop/mobile interaction regression check.
5. Performance, GLB weight/loading and runtime stability pass.
6. Final portfolio browser captures and short demo recording.

### Stage B — turn the villa into a freelance proof

Package the finished system as the proof behind the existing **interactive 3D property presentation** offer.

A client should be able to understand the value without knowing Blender or Three.js:

`property model -> guided interactive walkthrough -> material/light presentation -> browser delivery -> tested demo`

The repository and QA evidence are part of the trust proof, but the sales surface should lead with the client result, not tool names.

### Stage C — property context

After the villa is stable, create a separate bounded bead: **Villa Context Prototype**.

Add only enough context to prove the next product level:

- road/street context;
- neighboring massing/buildings;
- greenery/park context;
- parking or access context where appropriate;
- distant skyline.

`iCity` or an equivalent procedural Blender generator may be evaluated here as an **upstream context factory**. Generate in Blender, simplify/optimize, export appropriate GLB assets, then consume them in the web experience. Do not make the browser generate a whole city just because the Blender add-on can.

### Stage D — neighborhood / city demo

Only after the context prototype proves performance and visual value:

`Villa -> local street -> neighborhood overview -> district/city context`

This can become a separate developer/real-estate demo rather than bloating the original villa experience.

### Stage E — optional game layer

The architecture system can later become a game/exploration foundation, but game mechanics are a separate product layer.

Reuse:

- authored spaces;
- first-person movement concepts;
- route/graph ideas;
- interaction points;
- city/property context.

Do not let future game ideas dictate current luxury-visualization lighting or navigation before the freelance artifact is finished.

## 8. Learning map for a beginner designer

Use the villa as a practical curriculum instead of trying to learn all of architecture/3D at once.

For every bead, identify five things:

1. **Geometry** — what physical shape defines the space?
2. **Material** — what is the surface made of and how should it react to light?
3. **Light** — where does illumination come from and what hierarchy does it create?
4. **Camera / movement** — how does a person read and move through the space?
5. **Proof** — what screenshot/test proves the change improved the real experience?

That loop converts design learning into portfolio artifacts rather than disconnected tutorials.

## 9. Future freelance directions already discussed

Keep these as later market experiments, not concurrent build scope:

- interactive villa/property presentation;
- custom kitchen presentation;
- made-to-measure furniture / wardrobe visualization;
- residential complex / development visualization;
- larger neighborhood/city context.

The villa is the reusable technical/design laboratory from which these offers can inherit the web-viewer, interaction, QA and presentation mechanics.

## 10. Definition of a portfolio-ready villa

The villa is ready to act as a serious freelance proof only when all are true:

- source geometry has no known camera-blocking workaround debt;
- authored walkthrough route works end to end;
- Upper Landing and Master Bedroom read as finished interiors rather than whitebox scenes;
- material families remain distinguishable in real browser frames;
- day/evening/night do not introduce obvious exposure regressions;
- desktop and mobile interaction remain usable;
- GLB/web loading is acceptable for a client demo;
- browser console/runtime is clean under the QA path;
- fresh evidence captures exist;
- a short client-facing demo can be shown without explaining unfinished areas.

## 11. Handoff rule for future chats/agents

Before changing the villa, read:

1. this roadmap;
2. `validation/upper-landing-lighting-bead-v1.md`;
3. `validation/material-microcontrast-bead-v1.md`;
4. the current first-person QA scripts;
5. the Blender Interior3 repair script.

Then inspect the current PR/CI state.

Do not restart solved beads from memory. Use the repository history and fresh browser evidence as the source of truth.
