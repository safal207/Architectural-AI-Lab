# Living estate extension

## Experience

The original gated villa remains the source model. Viewer geometry adds a connected garden with pool loungers, outdoor dining and barbecue, children's playhouse/slide/swing, a shallow water-play pool with slide and fountain arcs, a garage/car and a third-level games/cinema pavilion with a visible lift enclosure. These additions are a spatial design concept, not measured architecture, structural engineering or a working lift simulation.

Discover the estate provides camera views for each amenity and a bathroom section. The original guided/explore route remains on its authored navigation graph. The bathroom section reveals a shower, WC, vanity and basin within the private core; it closes when leaving the view. Two source doors and two selected sliding panes animate on click, including while weather is paused. Screen power/channels, kitchen/furniture colours, car paint, terrace finish and stone joint scale are configurable. The configuration changes finishes; it does not replace entire furniture layouts.

## Rain and materials

Rain increases exposed-surface wetness over 24 seconds of active simulation, forms irregular supported puddles, adds droplets/runnels to exterior glazing, and creates low pool mist. Clear weather dries accumulated water over 100 active seconds. Pause freezes these environmental effects. Invisible bounds protect new roofs, playhouse and parasols from rain. Water is an animated visual surface with normal ripples and fountain geometry, not a fluid solver or swimming simulation. Reflections share the cached sky environment; they are not ray-traced reflections of nearby buildings.

Six 1K JPEG PBR maps (~4.8 MB total) are served locally. The existing source materials remain available and global palette changes preserve the selected deck finish.

## Library choices and sources

- **Three.js r180** remains the renderer already installed in this project. Native BufferGeometry/InstancedMesh, merged geometry, material hooks and existing controls avoid another rendering framework.
- **RoundedBoxGeometry**, from the matching Three.js addons, gives new furniture/counters/fixtures rounded silhouettes: https://threejs.org/docs/pages/RoundedBoxGeometry.html
- **MeshPhysicalMaterial** is reserved for surfaces that benefit from its cost (transmission/clearcoat), not added indiscriminately: https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- **Poly Haven** supplies the local Wood Floor Deck and Asphalt 02 maps under CC0. Credits and exact sources: public/materials/LICENSE.md; terms: https://polyhaven.com/license
- **ambientCG** is a compatible CC0 alternative for future material sets: https://docs.ambientcg.com/license/ . No ambientCG files are bundled in this update.
- **three-mesh-bvh** is an MIT option if measurements later justify accelerating large-model raycasts: https://github.com/gkjohnson/three-mesh-bvh . It is not installed; infrequent clicks on this model do not currently justify another dependency.

## Runtime and checks

Modules have distinct ownership: source presentation → living details → estate/residence → PBR surface maps → rain surfaces. Dispose in reverse overlay order. Material choices retain material instances so rain hooks remain attached. Direct picking uses the nearest visible geometry and distinguishes clicks from orbit/look dragging; the same actions have keyboard-accessible buttons.

One GPU frame remains in flight, with adaptive pacing for environmental motion. Hidden scenes stop rendering. Added static amenity geometry is merged by material. Puddles and mist add two instanced draws, with no screen-space render targets. Existing PMREM sky captures remain bounded by time/weather combinations.

Checks:

- `node qa/rain-surfaces.mjs` — real source geometry, shelters, material composition, accumulation, drying, pause and cleanup.
- `node qa/residence-interactions.mjs` — real source doors/windows, both-side clicks on open panes, paused mechanics, stable materials, TV controls, bathroom restoration and cleanup.
- `node qa/living-estate.mjs` — actual browser geometry/views, loaded PBR maps, actions, finishes, wetness growth, mobile width and console errors. Set VILLA_URL and QA_OUTPUT to target the built or deployed viewer.
- Existing source-asset validation and walkthrough/frame-pacer checks remain applicable.
