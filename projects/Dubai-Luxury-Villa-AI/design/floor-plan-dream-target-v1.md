# Floor Plan Dream Target v1

## Gate scope

Primary target: **Floor 2 plan + Upper Landing**.

The client must understand the floor in 2–3 seconds, see where they are, and use the plan to control the walkthrough.

## Intended visual read

The plan should feel like a premium real-estate navigation map rather than a dark technical wireframe.

### Palette

- warm ivory / limestone paper background;
- charcoal architectural walls;
- muted warm-gray furniture footprints;
- blue-gray windows;
- bronze/gold only for current position, active route and selected room;
- no large black fills inside the floor plan.

### Information hierarchy

1. room boundaries;
2. room name + area / role;
3. `YOU ARE HERE` position marker + heading;
4. doors, windows and stair direction;
5. furniture footprints;
6. route line;
7. lighting points.

The viewer should not need the right-hand route panel to understand the plan.

## Required interaction modes

### PLAN
Flat top-down architectural orientation map. This is the default and most legible mode.

### DOLLHOUSE
The same navigation map tilted into a light pseudo-isometric presentation. It is a spatial preview, not a replacement for the real 3D scene.

### WALK
Activates the existing bounded first-person walkthrough without changing the promoted GLB.

## Floor 2 visual target

The screenshot should show:

- Upper Landing as a smaller circulation zone;
- Master Bedroom as the dominant room;
- bed + two side tables;
- stair footprint and upward direction;
- master doorway with swing indication;
- master glazing/window markers;
- landing and master light points;
- visible route line between landing and master;
- current-position marker on the active stop;
- a clear `Floor 1 / Floor 2` switch.

## Route presentation

The guided route becomes a compact horizontal timeline below the map. It supports the plan rather than competing with it.

Required sequence:

`Exterior → Entry → Living → Dining → Stair Hall → Upper Landing → Master → Pool`

## Mobile target

At 390 px width:

- no horizontal document overflow;
- plan remains at least ~390 px tall;
- room labels remain readable;
- `YOU ARE HERE` dot remains visible;
- mode and floor selectors remain tappable;
- route may scroll horizontally inside its own container;
- technical capability chips may collapse to preserve focus.

## Dream-loop critic rubric

Score 0–5:

- Plan legibility
- Spatial hierarchy
- Position clarity
- Interaction clarity
- Premium restraint
- Mobile readability

### PASS

- no category below 3;
- Plan legibility >= 4;
- Position clarity >= 4;
- Interaction clarity >= 4;
- no P0/P1 visual defect;
- functional walkthrough QA remains green.

## Boundary

This remains a presentation navigation plan. It is not a measured construction drawing, BIM floor plan, accessibility study or certified egress plan.
