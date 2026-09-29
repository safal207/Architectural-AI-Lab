import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Diagnostic only: submitted camera poses are not GPU completion or displayed frames.
// Run against an unmodified production build with environmental motion left enabled.
function summarize(samples, observedMs) {
  assert.ok(samples.length >= 2, 'Insufficient submitted timeline updates');
  assert.ok(samples.every(s => Number.isFinite(s.wallMs) && Number.isFinite(s.filmSeconds)));
  const first = samples[0], last = samples.at(-1);
  const gaps = samples.slice(1).map((s, i) => s.wallMs - samples[i].wallMs).sort((a, b) => a - b);
  assert.ok(gaps.every(gap => gap >= 0));
  const percentile = q => gaps[Math.max(0, Math.ceil(gaps.length * q) - 1)];
  return { submittedTimelineUpdates: gaps.length,
    changedPoses: samples.slice(1).filter((s, i) => s.camera !== samples[i].camera || s.direction !== samples[i].direction).length,
    firstToLastWallMs: last.wallMs - first.wallMs, filmProgressSeconds: last.filmSeconds - first.filmSeconds,
    gapP50Ms: percentile(0.5), gapP95Ms: percentile(0.95), gapMaxMs: gaps.at(-1),
    trailingNoNewTimelineMs: observedMs - last.wallMs };
}
const url = process.env.VILLA_URL || 'http://127.0.0.1:4173/';
const output = process.env.QA_OUTPUT_DIR || 'qa-output';
const sampleMs = 20000;
const report = {
  sourceHead: process.env.VILLA_SOURCE_HEAD || null,
  checkoutSha: process.env.GITHUB_SHA || null,
  artifactRun: process.env.VILLA_ARTIFACT_RUN || null,
  sampleMs, profiles: {}, pageErrors: [], failedResponses: [],
  productAcceptance: 'NOT_PROVEN',
  boundary: 'Desktop DPR 1 diagnostic with default environmental motion enabled. Mutation timestamps observe submitted film-time updates; held camera poses may repeat. Not GPU completion, presentation or physical-device FPS. Each mode is sampled for up to 20 seconds, not the complete route.'
};
await mkdir(output, { recursive: true });
if (process.env.VILLA_ARTIFACT_ZIP) {
  report.artifactZipSha256 = createHash('sha256').update(await readFile(process.env.VILLA_ARTIFACT_ZIP)).digest('hex');
  if (process.env.VILLA_ARTIFACT_SHA256) assert.equal(report.artifactZipSha256, process.env.VILLA_ARTIFACT_SHA256);
}
const browser = await chromium.launch({ headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
});
try {
  report.browser = browser.version();
  for (const [mode, button] of [['house', 'Play house + drone demo'], ['orbit', 'Drone orbit only']]) {
    // A fresh page prevents paused atmosphere or a previous demo from contaminating the sample.
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(120000);
    page.on('pageerror', error => report.pageErrors.push({ mode, error: String(error) }));
    page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ mode, status: response.status(), url: response.url() }); });
    const target = new URL(url); target.hash = 'viewer';
    await page.goto(target.href, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('#viewer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded');
    const motion = page.getByRole('button', { name: 'Pause motion', exact: true });
    assert.equal(await motion.getAttribute('aria-pressed'), 'false', 'Environmental motion must remain enabled');
    const panel = page.getByRole('region', { name: 'Residence demo controls', exact: true });
    await panel.getByRole('button', { name: button, exact: mode === 'orbit' }).click();
    await page.waitForFunction(() => {
      const d = document.querySelector('.three-canvas')?.dataset;
      return d?.demoState === 'playing' && d.renderedInteractionMode === 'demo' && d.renderedDemoTime !== '';
    });
    const requestedMs = await page.locator('.three-canvas').evaluate(root => {
      const duration = Number(JSON.parse(root.dataset.demoReport).duration);
      const elapsed = Number(root.dataset.renderedDemoTime);
      return Math.min(20000, Math.floor((duration - elapsed) * 500));
    });
    assert.ok(Number.isFinite(requestedMs) && requestedMs > 0, 'No remaining playing window');
    const observation = await page.evaluate(ms => new Promise(resolve => {
      const root = document.querySelector('.three-canvas');
      const canvas = root.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      const gl = canvas.getContext('webgl2');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const start = performance.now();
      const samples = [];
      let lastTime;
      const capture = () => {
        const raw = root.dataset.renderedDemoTime;
        if (root.dataset.renderedInteractionMode !== 'demo' || raw === undefined || raw === '' || raw === lastTime) return;
        lastTime = raw;
        samples.push({ wallMs: performance.now() - start, filmSeconds: Number(raw), camera: root.dataset.cameraPosition, direction: root.dataset.cameraDirection, atmosphereSeconds: Number(root.dataset.atmosphereTime), motion: root.dataset.renderedMotion, state: root.dataset.demoState });
      };
      capture();
      const observer = new MutationObserver(capture);
      observer.observe(root, { attributes: true, attributeFilter: ['data-rendered-demo-time'] });
      setTimeout(() => {
        observer.disconnect();
        resolve({ requestedMs: ms, observedMs: performance.now() - start,
          buffer: [canvas.width, canvas.height], css: [rect.width, rect.height], dpr: devicePixelRatio,
          renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
          visibility: document.visibilityState, finalState: root.dataset.demoState, samples });
      }, ms);
    }), requestedMs);
    // Preserve raw evidence even when a following assertion fails.
    report.profiles[mode] = observation;
    assert.equal(observation.dpr, 1);
    assert.ok(observation.css[0] > 300 && observation.css[1] > 200);
    observation.buffer.forEach((pixels, axis) => assert.ok(Math.abs(pixels - observation.css[axis]) <= 1, 'Do not downscale the drawing buffer'));
    assert.equal(await motion.getAttribute('aria-pressed'), 'false');
    assert.equal(observation.visibility, 'visible');
    assert.equal(observation.finalState, 'playing', 'A paused or completed sample is not a playing-motion audit');
    assert.ok(observation.samples.length >= 2, 'Insufficient submitted poses; do not report an empty sample as success');
    assert.ok(observation.samples.every(s => s.state === 'playing' && s.motion === 'running' && Number.isFinite(s.filmSeconds)));
    observation.summary = summarize(observation.samples, observation.observedMs);
    assert.ok(observation.summary.filmProgressSeconds > 0);
    await page.getByRole('group', { name: 'In-view demo controls', exact: true }).getByRole('button', { name: 'Pause tour', exact: true }).click();
    await page.locator('.three-canvas-shell').screenshot({ path: `${output}/${mode}-native-motion.png`, timeout: 120000 });
    await writeFile(`${output}/demo-native-motion.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ mode, ...observation.summary }));
    await page.close();
  }
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.failedResponses, []);
  report.result = 'MEASURED'; // Never equate a successful diagnostic with product acceptance.
} catch (error) {
  report.result = 'INCOMPLETE'; report.error = String(error); process.exitCode = 1;
} finally {
  await writeFile(`${output}/demo-native-motion.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report));
}
