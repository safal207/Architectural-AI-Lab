# Material Micro-Contrast Bead v1

## Context recovered from the architecture thread

The active architecture product is **Dubai Luxury Villa AI Experience** inside `Architectural-AI-Lab`.
The first-person work lives on `feat/first-person-house-tour` and is still intentionally isolated from `main` through PR #1.

The Upper Landing sequence already passed two separate repairs before this bead:

1. **Interior3 geometry/root-cause repair**
   - removed the old `upper_stone_spine` volume that intersected the stair and camera;
   - preserved the authored `tour_stair_upper` Interior3 anchor;
   - opened the master-suite threshold;
   - removed the need for a client-side landing camera offset.
2. **Interior lighting pass**
   - lowered global/interior lighting energy;
   - added the bounded `landing-adapted` runtime profile;
   - kept imported GLB punctual lights disabled so the browser owns one lighting engine.

Those decisions are frozen for this bead. Do not move the Interior3 anchor, restore the old stone volume, add a client-side camera compensation, or brighten the global fixture rig to solve a surface problem.

## Why this bead exists

After lighting and material-family colour separation were improved, the next remaining problem was surface identity. Limestone, plaster, timber and deck could still read too similarly because the browser changed colour but otherwise inherited one heterogeneous set of GLB response values.

The goal is not to make the scene glossy. The goal is to make each family react differently enough that the eye can read material boundaries under the same restrained luxury lighting.

## Runtime material response

The viewer now preserves the source PBR maps and applies a small family-specific response after the selected finish colour:

| Family | Roughness | Normal response |
| --- | ---: | ---: |
| limestone / stone | `0.60` | `1.08x` |
| plaster | `0.84` | `0.72x` |
| timber / walnut | `0.86` | `1.02x` |
| deck stone | `0.88` | `0.84x` |

Intent:

- **stone** keeps restrained grazing highlights and the strongest mineral relief of the pale families;
- **plaster** stays softer and more matte so it no longer competes with limestone;
- **timber** keeps its existing texture/roughness maps but avoids a plastic high-gloss presentation;
- **deck** remains the quietest/mattest stone family.

No texture map is replaced by a flat procedural browser material. The source GLB remains the material-information source; the web layer only applies bounded presentation response.

## Browser evidence contract

The viewer exposes:

- `data-material-response-profile="family-microcontrast-v1"`
- `data-material-response-count`
- `data-material-family-count`

The focused Upper Landing gate now requires all four material families to be recognized.

A second Playwright bead captures the same material profile from three authored tour views:

1. Living room
2. Upper Landing
3. Master bedroom

Each frame must keep the bounded walk graph ready and the expected interior lighting profile (`interior-adapted` or `landing-adapted`).

## Visual acceptance

Automated checks prove that the intended pipeline is active, not that the design is beautiful.

The bead is visually accepted only if the three browser captures show:

- limestone and plaster separated without exaggerated contrast;
- timber readable as a different surface family rather than a dark flat colour;
- no return of the blown-out Upper Landing whitebox look;
- preserved warm interior / cooler-shadow hierarchy;
- unchanged Upper Landing geometry and master-suite route;
- no plastic/glossy material regression.

## Status

Implementation committed on `feat/first-person-house-tour`.
CI/browser evidence is required before marking this bead PASS.

## Next controlled bead after PASS

Do not jump to city generation yet.

Next: **Master Bedroom composition/depth review**, followed by full walkthrough polish and performance/load optimisation. After the villa is a stable portfolio artifact, start a separate **Villa Context Prototype** for road / neighbouring buildings / greenery / skyline, with iCity or an equivalent procedural city source treated as an upstream Blender context generator rather than browser runtime geometry.
