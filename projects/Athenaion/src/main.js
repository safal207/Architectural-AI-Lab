// Entry point.
//   Interactive:  http://localhost:8080/?shot=3&quality=preview      (orbit with mouse; keys 1-9 jump to shots; P prints camera)
//   Offline:      driven by tools/render.mjs (mode=still) which calls window.__renderShot(id)
//   Module test:  ?test=temple&view=0   renders src/modules/temple.js test() in a neutral scene
import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { getQuality } from './core/quality.js';
import { SHOTS } from './world/shots.js';
import { readOptions, interactiveSize } from './viewer/config.js';

const P = new URLSearchParams(location.search);

async function boot() {
  const options = readOptions(P, { smallScreen: matchMedia('(max-width: 700px)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
  const mode = options.mode;
  const quality = getQuality(options.quality);
  if (Number(P.get('spp')) > 0) quality.spp = Math.min(4096, Math.round(Number(P.get('spp'))));
  const container = document.getElementById('viewport') || document.body;
  const bounds = container.getBoundingClientRect();
  const size = interactiveSize(bounds.width || innerWidth, bounds.height || innerHeight, quality);
  const W = mode === 'interactive' ? size.width : Math.min(16384, Math.max(1, Math.round(Number(P.get('w')) || 1672)));
  const H = mode === 'interactive' ? size.height : Math.min(16384, Math.max(1, Math.round(Number(P.get('h')) || 941)));
  if (mode === 'interactive') document.body.classList.add('interactive');

  const engine = await createEngine({ width: W, height: H, quality, params: P, container });
  window.engine = engine;
  const t0 = performance.now();

  let testInfo = null;
  if (P.get('test')) {
    const { buildTestScene } = await import('./test/testScene.js');
    testInfo = await buildTestScene(engine, P.get('test'), Number(P.get('view') || 0));
  } else {
    const { buildWorld } = await import('./world/index.js');
    window.__BUILD_REPORT = await buildWorld(engine);
  }
  dispatchEvent(new CustomEvent('athenaion:compiling'));
  engine.prepareScene();
  const buildMs = Math.round(performance.now() - t0);
  window.__STATS = { buildMs };
  console.log(`[main] world built in ${buildMs} ms`);
  // The gallery UI keeps the loading element for retry and error recovery.

  const shotById = (id) => SHOTS.find((s) => String(s.id) === String(id));

  window.__renderShot = async (id) => {
    const s = shotById(id);
    if (!s) throw new Error('unknown shot ' + id);
    engine.applyShot(s);
    return await engine.renderStill(quality.spp);
  };
  // used by tools/session.mjs (persistent render session for camera direction / look-dev)
  window.__SHOTS = SHOTS;
  window.__renderShotObj = async (s, spp) => {
    engine.applyShot(s);
    return await engine.renderStill(spp ?? quality.spp);
  };
  // GPU profiler: time per sample with each module hidden in turn (tools/session.mjs + snap --eval)
  window.__profile = async (shotId, spp = 2) => {
    engine.applyShot(shotById(shotId));
    const time = async () => { await engine.renderStill(spp); return engine.stats.renderMs / spp; };
    await time(); // warm-up (lazy shader compiles)
    const base = await time();
    const rows = [];
    const tris = (objs) => { let t = 0; for (const o of objs) o.traverse((m) => { if (!m.isMesh || !m.geometry) return; const g = m.geometry; const n = (g.index ? g.index.count : g.attributes.position?.count || 0) / 3; t += n * (m.isInstancedMesh ? m.count : 1); }); return t; };
    for (const [name, roots] of Object.entries(engine.moduleRoots || {})) {
      const vis = roots.map((r) => r.visible);
      roots.forEach((r) => (r.visible = false));
      const ms = await time();
      roots.forEach((r, i) => (r.visible = vis[i]));
      rows.push({ module: name, msSaved: Math.round(base - ms), mTris: +(tris(roots) / 1e6).toFixed(2), objects: roots.length });
    }
    rows.sort((a, b) => b.msSaved - a.msSaved);
    return { shot: shotId, msPerSample: Math.round(base), calls: engine.stats.calls, mTrisDrawn: +((engine.stats.triangles || 0) / 1e6).toFixed(1), rows };
  };
  // video frame renderer (tools/render-video.mjs)
  if (!P.get('test')) { const { setupVideo } = await import('./video/player.js'); setupVideo(engine, SHOTS); }
  window.__renderTest = async () => {
    engine.applyShot(testInfo.shot);
    return await engine.renderStill(quality.spp);
  };
  // compile everything up front so the first sample isn't a hitch
  if (!P.get('test')) engine.applyShot(shotById(options.shot) || SHOTS[0]);
  else engine.applyShot(testInfo.shot);
  const tc = performance.now();
  await engine.renderer.compileAsync(engine.scene, engine.camera);
  console.log(`[main] shaders compiled in ${Math.round(performance.now() - tc)} ms`);
  window.__READY = true;
  if (document.getElementById('loading')) document.getElementById('loading').hidden = true;

  if (mode === 'interactive') await startInteractive(engine, shotById, options);
  return engine;
}

async function startInteractive(engine, shotById, options) {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const cam = engine.camera;
  const controls = new OrbitControls(cam, engine.canvas);
  controls.enableDamping = false;
  let moving = true, stopped = false, animate = options.animate, lastTime = performance.now();
  const syncTarget = () => {
    if (engine.shot) controls.target.set(...engine.shot.target);
    controls.update(); moving = true;
  };
  const selectShot = (id) => {
    const shot = shotById(id);
    if (!shot) return;
    engine.applyShot(shot); syncTarget();
    dispatchEvent(new CustomEvent('athenaion:shot-changed', { detail: { id: shot.id } }));
  };
  syncTarget();
  controls.addEventListener('change', () => { moving = true; });
  addEventListener('athenaion:select-shot', (event) => selectShot(event.detail.id));
  addEventListener('athenaion:animate', (event) => { animate = !!event.detail.enabled; lastTime = performance.now(); });
  addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input,select,textarea,[contenteditable=true]')) return;
    if (/^[1-9]$/.test(event.key)) { event.preventDefault(); selectShot(event.key); }
    if ((event.key === 'p' || event.key === 'P') && P.get('debug') === '1') {
      const p = cam.position, t = controls.target;
      const text = JSON.stringify({ pos: [p.x, p.y, p.z].map((v) => +v.toFixed(1)), target: [t.x, t.y, t.z].map((v) => +v.toFixed(1)), fov: cam.fov });
      console.log(text); navigator.clipboard?.writeText(text).catch(() => {});
    }
  });
  const resize = () => {
    const box = engine.canvas.parentElement.getBoundingClientRect();
    const size = interactiveSize(box.width, box.height, engine.quality);
    engine.resize(size.width, size.height); moving = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(engine.canvas.parentElement);
  engine.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); stopped = true; observer.disconnect(); controls.dispose();
    dispatchEvent(new CustomEvent('athenaion:context-lost'));
  });
  const loop = (now) => {
    if (stopped) return;
    requestAnimationFrame(loop);
    const delta = Math.min(0.1, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    if (document.hidden) return;
    if (animate) { engine.setTime(engine.time + delta); moving = true; }
    try {
      if (moving) engine.lighting.refreshCSM();
      engine.renderInteractive(moving);
      moving = false;
    } catch (error) {
      stopped = true; observer.disconnect(); controls.dispose();
      console.error('[interactive]', error);
      window.__RENDER_ERROR = error.stack || String(error);
      dispatchEvent(new CustomEvent('athenaion:context-lost'));
    }
  };
  requestAnimationFrame(loop);
}

export const ready = boot();
ready.catch((e) => {
  console.error(e);
  window.__RENDER_ERROR = (e && (e.stack || e.message)) || String(e);
});
