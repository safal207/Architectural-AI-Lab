// Builds the full world by running each module's build(engine) in dependency order.
// A failing module is logged and skipped so one broken piece never blanks the whole world.
// Order matters: terrain → architecture (registers footprints) → city → vegetation (avoids footprints).
export const MODULE_ORDER = [
  'terrain',      // ground mesh, cliffs, far mountains
  'water',        // sea, lagoon, river surfaces
  'temple',       // main Athenaion + other classical buildings at layout anchors
  'acropolis',    // terraces, retaining walls, grand stair, plazas, mosaics, balustrades
  'aqueducts',    // aqueducts & bridges
  'sets',         // shot-specific foreground sets (terraces, balustrades, props) — push slots for statues/banners
  'statues',      // colossi + statues on pedestals + pediment sculpture placement
  'city',         // town houses, harbour, boats
  'ruins',        // ruined portico, fallen columns, giant head (foreground sets)
  'banners',      // banners with owl emblem, braziers & fire, urns
  'vegetation',   // cypress, olive, pines, broadleaf trees, shrub masses
  'flora',        // ivy, grass, flowers, moss, hero foreground branches & rocks
  'waterfalls',   // waterfalls, foam, spray & mist
  'clouds',       // mountain clouds, valley mist banks
  'birds',        // seagulls
];

export async function buildWorld(engine) {
  const skip = (engine.params.get('skip') || '').split(',').filter(Boolean);
  const only = (engine.params.get('only') || '').split(',').filter(Boolean);
  const report = { completed: [], failures: [], skipped: [] };
  for (const [index, name] of MODULE_ORDER.entries()) {
    if (skip.includes(name) || (only.length && !only.includes(name))) { report.skipped.push(name); continue; }
    const progress = (completed) => globalThis.dispatchEvent?.(new CustomEvent('athenaion:build-progress', { detail: { name, index: index + 1, total: MODULE_ORDER.length, completed } }));
    progress(index);
    await new Promise((resolve) => setTimeout(resolve, 0));
    let mod;
    try {
      mod = await import(`../modules/${name}.js`);
    } catch (e) {
      report.failures.push({ name, error: String(e) });
      if (name === 'terrain' || name === 'temple') throw e;
      console.error(`[world] module ${name} failed to load:`, e.stack || e);
      continue;
    }
    if (typeof mod.build !== 'function') { report.failures.push({ name, error: 'Missing build export' }); continue; }
    const t0 = performance.now();
    const before = new Set(engine.scene.children);
    try {
      await mod.build(engine);
      (engine.moduleRoots ||= {})[name] = engine.scene.children.filter((c) => !before.has(c));
      report.completed.push(name);
      progress(index + 1);
      console.log(`[world] ${name} built in ${Math.round(performance.now() - t0)} ms`);
    } catch (e) {
      report.failures.push({ name, error: String(e) });
      console.error(`[world] module ${name} threw during build:`, e.stack || e);
      if (name === 'terrain' || name === 'temple') throw e;
    }
  }
  return report;
}
