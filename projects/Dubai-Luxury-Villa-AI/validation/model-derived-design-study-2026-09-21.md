# Model-derived architectural study — 21 September 2026

The earlier hand-drawn SVG was a generic massing illustration. Its floor setbacks, facade widths and pool relationship were not derived from the project, and it placed an invented joinery rectangle behind the front glazing. The user correctly flagged that its positioning did not match the current villa.

The three design gestures now show orthographic images generated directly from the production `villa.glb`, with the same rotation and stair/pool runtime corrections as the interactive viewer. No architectural mesh is translated for presentation. Furniture, planting and distant context are omitted from this exterior illustration; the glazing is made opaque. These choices are stated in the accessible description. The diagram remains an architectural study, not construction documentation.

- Roof/floor planes, glazing/water and facade timber each have a separate highlight image from the same fixed camera.
- Callout endpoints are projected from the actual `roof_plane`, `living_glass_03`, `timber_fin_04` and `pool_water` mesh bounds.
- The caption identifies the current 3D model as the source. The GLB file itself is unchanged.
- Three WebP files total 141,956 bytes; the page does not load a second GLB to display the illustration.
- The reproducible export records normalized source hashes, image hashes, camera parameters and landmark coordinates in `app/data/design-study.json`.

## Verification

- `node qa/design-study.mjs`: PASS. Independently reconstructs source bounds from GLB metadata and checks the source/image receipts, orthographic projections, pool in front of glazing, facade orientation and absence of the fictitious island and repaired orphan trim.
- Production build: PASS, 70 modules. The existing Three.js chunk-size warning remains.
- `node qa/design-studio.mjs`: PASS. All three images decode at 1440×960 and match their tabs. Keyboard switching, links into 3D, palette selection, floor-plan navigation and project brief behavior remain working. One GLB request, no page/console errors.
- Responsive checks: 1024, 796, 768, 390 and 320 px; no horizontal overflow. The 796 px and 390 px screenshots were visually reviewed.
- Local evidence is in ignored `app/qa-model-study-output/`, including `report.json`, `design-796.png` and `design-mobile.png`.

The provenance check is included in First Person Tour QA. GitHub status must be read for the current commit; these local results do not imply a green remote run. During this correction, the previous revision's `walkthrough-qa` showed a failure while its other listed checks passed. Its failure log could not be retrieved due to a permission-review timeout followed by restricted network access; its cause has not been inferred or claimed fixed here.
