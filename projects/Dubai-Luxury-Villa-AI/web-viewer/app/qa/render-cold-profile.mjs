import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const output = process.env.QA_OUTPUT ?? 'qa-cold-profile-output';
mkdirSync(output, { recursive: true });
if (process.argv.includes('--build')) {
  const path = 'src/three/renderer.js';
  const original = readFileSync(path, 'utf8');
  const seam = '  return renderer;';
  assert.equal(original.split(seam).length, 2);
  const hook = `  const cold = { frames: [], shaderCalls: [], raf: [] };
  window.__villaColdProfile = cold;
  const gl = renderer.getContext();
  for (const name of ['compileShader', 'linkProgram', 'getShaderParameter', 'getProgramParameter', 'getUniformLocation']) {
    const original = gl[name].bind(gl);
    gl[name] = (...args) => {
      const at = performance.now();
      const value = original(...args);
      const ms = performance.now() - at;
      if (ms > 1 && cold.shaderCalls.length < 2000) cold.shaderCalls.push({ name, at, ms, parameter: typeof args[1] === 'number' ? args[1] : null });
      return value;
    };
  }
  const originalRender = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    const villa = scene.getObjectByName('dubai_luxury_villa_active');
    const at = performance.now();
    const programsBefore = renderer.info.programs.length;
    const value = originalRender(scene, camera);
    if (villa && cold.frames.length < 2000) cold.frames.push({ at, ms: performance.now() - at,
      programsBefore, programsAfter: renderer.info.programs.length,
      position: camera.position.toArray(), phase: document.querySelector('.arrival-reveal')?.dataset.phase,
      hidden: document.hidden, focused: document.hasFocus(), buffer: [renderer.domElement.width, renderer.domElement.height] });
    return value;
  };
  const observe = at => {
    if (cold.raf.length < 2000) cold.raf.push({ at, now: performance.now(), phase: document.querySelector('.arrival-reveal')?.dataset.phase });
    requestAnimationFrame(observe);
  };
  requestAnimationFrame(observe);
  return renderer;`;
  try {
    writeFileSync(path, original.replace(seam, hook));
    execFileSync('npm', ['run', 'build', '--', '--outDir', 'dist-cold-profile'], { stdio: 'inherit' });
  } finally { writeFileSync(path, original); }
  assert.equal(readFileSync(path, 'utf8'), original);
} else {
  const { chromium } = await import('playwright');
  const { revealViewer } = await import('./reveal-viewer.mjs');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(120000);
  const report = { status: 'RUNNING', prHeadSha: process.env.PR_HEAD_SHA, checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), errors: [],
    boundary: 'Diagnostic wrappers measure CPU call durations and RAF delivery, not GPU/display timing. No runtime, clock, quality or resolution overrides.' };
  page.on('pageerror', e => report.errors.push(String(e)));
  try {
    await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await revealViewer(page);
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded');
    const panel = page.getByRole('region', { name: 'Arrival preview' });
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.evaluate(attempt => { window.__villaColdProfile.raf.push({ event: 'play-request', attempt, now: performance.now() }); }, attempt);
      await panel.getByRole('button', { name: 'Play arrival' }).click();
      await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'complete', null, { polling: 100, timeout: 120000 });
    }
    report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
  finally {
    report.observations = await page.evaluate(() => window.__villaColdProfile ?? null).catch(() => null);
    writeFileSync(`${output}/cold-profile.json`, JSON.stringify(report, null, 2));
    const frames = report.observations?.frames ?? [];
    console.log(JSON.stringify({ status: report.status, longestRenders: [...frames].sort((a,b) => b.ms-a.ms).slice(0,12), slowShaderCalls: report.observations?.shaderCalls }, null, 2));
    await browser.close();
  }
}
