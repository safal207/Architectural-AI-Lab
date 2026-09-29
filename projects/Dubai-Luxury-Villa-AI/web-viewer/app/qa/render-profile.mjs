import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const output = process.env.QA_OUTPUT ?? 'qa-render-profile-output';
mkdirSync(output, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');

if (process.argv.includes('--build')) {
  // Expose references only in a temporary diagnostic build, never in production.
  const path = 'src/three/renderer.js';
  const original = readFileSync(path, 'utf8');
  const seam = '  return renderer;';
  assert.equal(original.split(seam).length, 2);
  const hook = `  const originalRender = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    if (scene.getObjectByName('dubai_luxury_villa_active')) {
      window.__villaProfile = { THREE, renderer, scene, camera };
    }
    return originalRender(scene, camera);
  };
  return renderer;`;
  try {
    writeFileSync(path, original.replace(seam, hook));
    execFileSync('npm', ['run', 'build', '--', '--outDir', 'dist-render-profile'], { stdio: 'inherit' });
  } finally { writeFileSync(path, original); }
  assert.equal(readFileSync(path, 'utf8'), original);
  writeFileSync(`${output}/provenance.json`, JSON.stringify({
    prHeadSha: process.env.PR_HEAD_SHA ?? null,
    checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    rendererSourceSha256: hash(original), glbSha256: hash(readFileSync('dist-render-profile/villa.glb')),
    boundary: 'Temporary instrumentation only. No committed renderer, model, resolution, clock or navigation changes.'
  }, null, 2));
} else {
  const { chromium } = await import('playwright');
  const { revealViewer } = await import('./reveal-viewer.mjs');
  const browser = await chromium.launch({ headless: true });
  const report = { status: 'RUNNING', browserVersion: browser.version(), variants: [], errors: [],
    method: 'full-frame-readPixels-v1',
    boundary: 'Fixed-pose DPR 1 ablations. Synchronous full-buffer readPixels includes render completion and readback overhead, not physical display timing. Chromium implements finish as Flush, so the earlier finish-only run measured submission, not completed rendering. Disabled effects are diagnostic, not product changes.' };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(120_000);
  page.on('pageerror', error => report.errors.push(String(error)));
  try {
    await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await revealViewer(page);
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', null, { timeout: 120_000 });
    const panel = page.getByRole('region', { name: 'Arrival preview' });
    await panel.getByRole('button', { name: 'Play arrival' }).click();
    await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'still');
    report.inventory = await page.evaluate(() => {
      const { renderer, scene, camera } = window.__villaProfile;
      const canvas = renderer.domElement;
      const gl = renderer.getContext();
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const meshes = []; const lights = []; const materials = new Map();
      scene.traverseVisible(object => {
        if (object.isLight) lights.push({ name: object.name, type: object.type, intensity: object.intensity, distance: object.distance, shadow: object.castShadow });
        if (object.isMesh) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          meshes.push({ name: object.name, count: object.geometry.index?.count ?? object.geometry.attributes.position?.count ?? 0, materials: list.map(m => m.name) });
          for (const m of list) materials.set(m.uuid, { name: m.name, type: m.type, transmission: m.transmission ?? 0, transparent: m.transparent, opacity: m.opacity, side: m.side, normalMap: Boolean(m.normalMap) });
        }
      });
      return { cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight, bufferWidth: canvas.width, bufferHeight: canvas.height,
        dpr: devicePixelRatio, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
        context: gl.getContextAttributes(), camera: camera.position.toArray(), lights, meshes, materials: [...materials.values()] };
    });
    assert.equal(report.inventory.dpr, 1);
    assert.equal(report.inventory.bufferWidth, report.inventory.cssWidth);
    assert.equal(report.inventory.bufferHeight, report.inventory.cssHeight);
    // Concentrate completed-work ablations on the failing desktop entry pose.
    for (const variant of ['baseline-start', 'no-transmission', 'no-shadows', 'no-point-lights', 'unlit', 'baseline-end']) {
      const result = await page.evaluate(variant => {
        const { THREE, renderer, scene, camera } = window.__villaProfile;
        const gl = renderer.getContext();
        const lights = []; const materials = new Set();
        scene.traverse(object => {
          if (object.isPointLight) lights.push([object, object.visible]);
          if (object.isMesh) for (const m of (Array.isArray(object.material) ? object.material : [object.material])) materials.add(m);
        });
        const saved = [...materials].map(m => [m, m.transmission]);
        const shadows = renderer.shadowMap.enabled;
        const override = scene.overrideMaterial;
        const autoReset = renderer.info.autoReset;
        const basic = variant === 'unlit' ? new THREE.MeshBasicMaterial() : null;
        const width = renderer.domElement.width, height = renderer.domElement.height;
        const pixels = new Uint8Array(width * height * 4);
        const readback = () => {
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          const error = gl.getError();
          if (error !== gl.NO_ERROR || gl.isContextLost()) throw new Error(`Invalid pixel readback: ${error}`);
        };
        const frame = () => {
          readback(); renderer.info.reset();
          const start = performance.now(); renderer.render(scene, camera);
          const submitted = performance.now(); readback();
          const finished = performance.now();
          return { totalMs: finished - start, submitMs: submitted - start, completionAndReadbackMs: finished - submitted,
            calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
            programs: renderer.info.programs.length, textures: renderer.info.memory.textures,
            sampledRGBA: Array.from(pixels.subarray(Math.floor(pixels.length / 8) * 4, Math.floor(pixels.length / 8) * 4 + 4)) };
        };
        try {
          renderer.info.autoReset = false;
          if (variant === 'no-transmission') for (const [m, value] of saved) if (value > 0) { m.transmission = 0; m.needsUpdate = true; }
          if (variant === 'no-shadows') { renderer.shadowMap.enabled = false; for (const m of materials) m.needsUpdate = true; }
          if (variant === 'no-point-lights') for (const [light] of lights) light.visible = false;
          if (basic) scene.overrideMaterial = basic;
          const warmup = frame();
          const samples = [frame(), frame()];
          return { pose: 'entry', variant, warmup, samples, meanMs: samples.reduce((n, s) => n + s.totalMs, 0) / samples.length,
            camera: camera.position.toArray(), direction: camera.getWorldDirection(new THREE.Vector3()).toArray(), buffer: [width, height] };
        } finally {
          for (const [m, value] of saved) if (m.transmission !== value) { m.transmission = value; m.needsUpdate = true; }
          if (renderer.shadowMap.enabled !== shadows) { renderer.shadowMap.enabled = shadows; for (const m of materials) m.needsUpdate = true; }
          for (const [light, visible] of lights) light.visible = visible;
          scene.overrideMaterial = override; renderer.info.autoReset = autoReset;
          basic?.dispose();
        }
      }, variant);
      report.variants.push(result);
      writeFileSync(`${output}/profile.json`, JSON.stringify(report, null, 2));
      console.log(JSON.stringify(result));
    }
    assert.equal(report.errors.length, 0);
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
  finally { writeFileSync(`${output}/profile.json`, JSON.stringify(report, null, 2)); await browser.close(); }
}
