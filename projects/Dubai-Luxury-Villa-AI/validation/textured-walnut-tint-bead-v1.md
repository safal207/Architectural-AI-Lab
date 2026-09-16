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

## Visual acceptance

Inspect fresh Master Bedroom and material-microcontrast browser captures.

PASS only if:

1. the left Master Bedroom wardrobe reads as dark walnut rather than a featureless black slab;
2. bed base / other walnut surfaces retain visible wood identity;
3. timber is still clearly darker than pale plaster/stone;
4. no plastic/glossy regression appears (roughness is intentionally unchanged in this bead);
5. the Living Room does not become unnaturally pale where walnut appears;
6. Day / Evening / Night hierarchy remains intact;
7. console/page errors remain zero.

## Next after PASS

If walnut is readable but still too flat, evaluate a small timber roughness response change as its own bead. Do not combine that decision with this colour-factor repair.
