# Upper Landing — Lighting Bead v1

This bead continues from the frozen Interior3 root-cause repair. Geometry, authored Upper Landing camera, route graph, and open master-suite threshold remain unchanged.

## Thread / orientation center

Preserve the recovered stair → landing → master circulation while moving the browser view from a bright technical presentation toward a calm luxury-property evening image with readable depth, restrained highlights, and distinct warm/cool layers.

## Why this bead exists

After the geometry repair, the original white-plane failure was gone. The remaining visual issue was different:

```text
broad global light + strong warm runtime fixtures
        |
        v
bright ceiling / floor / pale wall planes
        |
        +--> weaker local shadow hierarchy
        +--> flatter material perception
        +--> less premium residential atmosphere
```

This bead therefore changes **lighting energy and falloff only**. It does not move the camera or alter the Interior3 geometry.

## Controlled changes

### Global Day / Evening / Night profiles

The browser lighting profiles were reduced conservatively:

- Day exposure `0.80 -> 0.74`
- Day ambient `0.78 -> 0.64`
- Day hemisphere `0.46 -> 0.38`
- Day sun `1.50 -> 1.25`
- Evening exposure `0.58 -> 0.54`
- Evening ambient `0.28 -> 0.23`
- Evening hemisphere `0.18 -> 0.15`
- Evening sun `0.55 -> 0.44`
- Night exposure `0.54 -> 0.50`
- Night ambient `0.22 -> 0.18`
- Night hemisphere `0.14 -> 0.11`

The local-interior multipliers were also reduced so practical fixtures shape space instead of washing it:

- Day interior `0.14 -> 0.12`
- Evening interior `0.52 -> 0.44`
- Night interior `0.68 -> 0.60`

### Runtime fixture pass

The browser-owned fixture layer was softened and made less orange:

- living downlights: lower intensity and shorter reach;
- dining pendants: lower intensity and warmer-neutral color;
- master bedside lamps: lower intensity and tighter falloff;
- upper linear light: lower intensity and reduced distance;
- Upper Landing transition fill: reduced intensity / reach and slightly more neutral warm color.

Imported GLB punctual lights remain disabled, so one runtime lighting engine still owns the final image.

## Evidence

Commit: `4bef9a1e312372d449268336b4db4d2ca264465d`

Automated checks:

- Viewer Build run `35066213477` — **SUCCESS**
- Blender Script Check run `35066213470` — **SUCCESS**
- Upper Landing Bead Gate run `35066213489` — **SUCCESS**
- First Person Tour QA run `35066213495` — **SUCCESS**

Focused browser capture after the pass shows:

- the repaired landing / master threshold remains readable;
- the large right-hand wall keeps a warm mineral tone instead of clipping toward flat white;
- ceiling and floor highlights are calmer;
- walnut remains visually separate from pale wall/floor families;
- the left glazing / stair edge still provides a cool-dark depth layer;
- route and camera logic are unchanged.

## Decision

**PASS / FREEZE LIGHTING ENERGY FOR THIS BEAD.**

Do not return to the brighter runtime fixture values unless a later fixed-gate comparison demonstrates a specific regression.

## Next bead

The next controlled improvement should be **material micro-contrast**, not more global dimming:

1. preserve this lighting energy;
2. tune per-family roughness for limestone, plaster, timber and deck;
3. retain source PBR maps rather than replacing them with flat colors;
4. inspect Upper Landing, Living and Master from the same fixed cameras;
5. only then decide whether the calm right-hand wall needs a small architectural detail or camera-composition change.
