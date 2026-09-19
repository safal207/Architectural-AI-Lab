# Textured Walnut Tint Bead v1

## Root cause

The active `M2_WalnutTimber` material already uses `synthetic_wood_diff_1k.jpg` as its diffuse/base-colour source in Blender.

The web finish preset then multiplied that textured wood by a very dark timber colour (`#523322` in the default Warm Limestone mood). In Three.js a material colour multiplies the base-colour texture, so the wardrobe and other walnut surfaces were being darkened twice.

That is why the Master Bedroom wardrobe read close to a black slab even after the lighting hierarchy was corrected.

## Scope

Material-colour multiplier only.

Frozen in this bead:

- camera position / FOV / headboard target;
- Day / Evening / Night lighting hierarchy;
- material roughness and normal response;
- source texture maps;
- geometry and walk graph.

## Change

Keep the source walnut diffuse texture as the source of the wood's dark grain/value and use a much lighter warm browser multiplier:

- Warm Limestone timber: `#d7bda6`
- Sandstone Warmth timber: `#cfae90`
- Graphite Mineral timber: `#b69c8c`

The browser still changes mood, but it no longer paints an already-dark diffuse texture with a second near-black factor.

## Evidence

Source code head: `e8947c1688533a28a94fb5f6f354020b81aedf48`

Master Bedroom gate:

- workflow run `35079240257`
- artifact `10439701398`
- automated result: **PASS**
- Day / Evening / Night hierarchy remained intact
- console errors: `0`
- page errors: `0`

Material micro-contrast gate:

- workflow run `35079240293`
- artifact `10439572326`
- automated result: **PASS**
- Living / Upper Landing / Master all retained ready walk graph and all four material families

## Visual review

**PASS**

- the Master Bedroom wardrobe now reads as textured dark walnut instead of a featureless black slab;
- the bed base shows a clear wood grain/value structure;
- the right-side timber threshold/door reads as wood rather than black geometry;
- timber remains substantially darker than plaster and stone;
- no glossy/plastic regression was introduced because roughness/normal response were intentionally left unchanged;
- Living Room walnut became more readable without turning pale or orange;
- Upper Landing retains the repaired geometry while the timber edge now contributes useful depth separation.

The Master Bedroom canvas also keeps the corrected lighting ordering after the tint change: Day remains the brightest state, Evening the middle state and Night the darkest/readable state.

## Status

**VISUAL PASS — freeze the walnut colour-factor repair.**

Do not change timber roughness yet. The next priority is the full authored-stop walkthrough review, where the largest remaining scene-level problem is expected to be local lighting/composition outside the Master Bedroom (especially the Living Room), not walnut colour.
