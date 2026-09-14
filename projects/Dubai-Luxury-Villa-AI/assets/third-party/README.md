# Third-party visual assets

The v0.2 hero pipeline may download a small set of CC0 assets at CI runtime to improve visual fidelity while keeping the repository lightweight.

## Poly Haven — CC0

All assets below are published under the Poly Haven CC0 license.

### Toposcope Sunset HDRI

Source: https://polyhaven.com/a/toposcope_sunset

Purpose: visible sunset/blue-hour environment and reflection context for the exterior hero render.

Runtime file used by CI:

`toposcope_sunset_2k.exr`

### Synthetic Wood

Source: https://polyhaven.com/a/synthetic_wood

Purpose: exterior timber / wood-look facade accents.

Runtime maps used by CI:

- `synthetic_wood_diff_1k.jpg`
- `synthetic_wood_nor_gl_1k.jpg`
- `synthetic_wood_rough_1k.jpg`

### Beige Wall 001

Source: https://polyhaven.com/a/beige_wall_001

Purpose: subtle realistic mineral/plaster surface variation for premium facade volumes.

Runtime maps used by CI:

- `beige_wall_001_diff_1k.jpg`
- `beige_wall_001_nor_gl_1k.jpg`
- `beige_wall_001_rough_1k.jpg`

## Reproducibility rule

CI downloads these assets from their public Poly Haven download URLs before rendering. The generated Blender source packs image dependencies before saving, and the GLB export embeds material textures where supported.

The project does not claim authorship of these third-party assets.
