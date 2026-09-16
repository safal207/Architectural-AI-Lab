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

This bead therefore changes **lighting energy, falloff and material-family continuity** while keeping the camera and Interior3 geometry frozen.

## Bead 1 — global lighting energy

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

### Evidence

Commit: `4bef9a1e312372d449268336b4db4d2ca264465d`

Automated checks:

- Viewer Build run `35066213477` — **SUCCESS**
- Blender Script Check run `35066213470` — **SUCCESS**
- Upper Landing Bead Gate run `35066213489` — **SUCCESS**
- First Person Tour QA run `35066213495` — **SUCCESS**

Focused browser capture after the pass showed:

- the repaired landing / master threshold remained readable;
- the large right-hand wall kept a warm mineral tone instead of clipping toward flat white;
- ceiling and floor highlights were calmer;
- walnut remained visually separate from pale wall/floor families;
- the left glazing / stair edge still provided a cool-dark depth layer;
- route and camera logic were unchanged.

**Decision:** PASS / FREEZE LIGHTING ENERGY.

## Bead 2 — interior-adapted exposure + legacy material-family continuity

The next fixed capture showed that global lighting was no longer the main problem, but some bright legacy material names still bypassed the finish-family switcher and the Upper Landing could benefit from a small exposure adaptation that did not change the global scene for exterior/orbit views.

Controlled changes:

1. `Warm Limestone`, `Sandstone Warmth`, and `Graphite Mineral` were deepened so plaster and stone do not drift toward near-white at browser scale.
2. The material-family resolver now recognizes legacy/frozen names including `M1_Limestone`, `M1_MineralPlaster`, `M1_WalnutTimber`, `M1_DeckStone`, `WarmTravertine`, `CreamStonePBR_R8`, `MineralFacadePBR_R5`, `NaturalTimber`, and `TimberCladdingPBR_R5` in addition to the current M2/M3/M4 names.
3. The switcher still clones each original material and changes only the family base color; existing PBR maps, roughness and shader properties remain intact.
4. First-person interior stops now use an interior-adapted runtime profile. Upper Landing receives the strongest bounded adaptation:
   - lower exposure than the selected global Day/Evening/Night value;
   - slightly lower ambient / hemisphere / sun contribution;
   - slightly stronger local interior fixture contribution so depth comes from bounded practical lights rather than broad global brightness.
5. The viewer exposes `data-lighting-profile`; the focused Upper Landing gate now requires `landing-adapted`.

No camera, stair route, PLAN/DOLLHOUSE geometry, first-person navigation graph, or Blender Interior3 geometry changed in this bead.

### Evidence

Upper Landing Bead Gate run `35073656635` — **SUCCESS**.

Focused report:

- stop: `stair-upper`;
- lighting: `Evening`;
- lighting profile: `landing-adapted`;
- finish mood: `warm-limestone`;
- light engine: `runtime-only`;
- imported punctual lights active: `0`;
- runtime interior lights: `10`;
- walk graph: `ready`;
- console errors: `0`;
- page errors: `0`.

Broader checks on the same head:

- Viewer Build run `35073656514` — **SUCCESS**;
- First Person Tour QA run `35073656552` — **SUCCESS**;
- Floor Plan Visual Gate run `35073656518` — **SUCCESS**.

### Visual result

Relative to the previous bead, the fixed Upper Landing frame now has stronger tonal structure:

- the ceiling reads as a warm dark plane rather than merging into the pale shell;
- the floor reads as a separate warm stone plane;
- the master-suite threshold remains clear;
- timber / door elements keep a darker identity;
- the right wall is still intentionally large but no longer shares the same value as every adjacent surface;
- the left stair / glazing side stays readable and preserves orientation.

This is an aesthetic improvement, not a photorealism claim. The remaining question is composition / architectural detail: whether the calm right wall should stay intentionally blank, receive one restrained reveal/feature, or be reduced by a tiny camera-yaw experiment. That belongs in a separate bead.

**Decision:** PASS / FREEZE LIGHTING BEAD v1.

## Next bead

Do not continue global darkening from this point. The next controlled improvement should be **composition / material micro-contrast**:

1. preserve the current lighting energy and `landing-adapted` profile;
2. preserve Interior3 geometry and authored camera anchor as the baseline;
3. compare one small camera-yaw branch against one restrained wall-detail branch;
4. retain source PBR maps and tune roughness only if the same material flattens in more than one fixed camera;
5. inspect Upper Landing, Living and Master from the same fixed Dream Loop views;
6. keep PLAN / DOLLHOUSE / WALK state continuity green before any release.
