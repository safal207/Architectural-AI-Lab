// Separate, deliberately expensive integration check. Not the fast gallery CI suite.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from '../tools/serve.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'qa-output'); await mkdir(out, { recursive: true });
const server = await startServer(0, path.join(root, 'dist'));
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 800 } });
  page.on('console', (message) => { if (/\[world\]|\[main\]|\[terrain\]/.test(message.text())) console.log(message.text()); });
  page.on('pageerror', (error) => console.log('[page error]', error.message));
  await page.goto(`http://127.0.0.1:${server.port}/?quality=lite&view=3d`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__READY || window.__RENDER_ERROR, null, { timeout: 600000, polling: 1000 });
  const error = await page.evaluate(() => window.__RENDER_ERROR); assert.equal(error, undefined, error);
  console.log('[check] World ready; waiting for first frame');
  await page.locator('#motion').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => window.engine?._accFrames >= 1, null, { timeout: 60000 });
  const report = await page.evaluate(() => ({ build: window.__BUILD_REPORT, stats: window.__STATS, gpu: window.__GPU_INFO, quality: window.engine.quality.name, size: [window.engine.width, window.engine.height] }));
  assert.equal(report.build.completed.length, 15); assert.deepEqual(report.build.failures, []);
  console.log('[check] First frame rendered; testing camera and resize');
  await page.locator('[data-shot="5"]').click();
  assert.equal(await page.evaluate(() => window.engine.shot.id), 5);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => Math.abs(window.engine.camera.aspect - document.getElementById('viewport').clientWidth / document.getElementById('viewport').clientHeight) < .015);
  console.log('[check] Resize passed; testing animation');
  await page.locator('#motion').click();
  await page.waitForFunction(() => window.engine.time > 0);
  await page.locator('#motion').click();
  assert.equal(await page.locator('#motion').getAttribute('aria-pressed'), 'false');
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: path.join(out, 'world-mobile.png') });
  await page.evaluate(() => window.engine.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await page.getByText('Устройство остановило 3D.', { exact: false }).waitFor();
  await page.locator('#gallery').click();
  await page.locator('.shot').last().waitFor();
  assert.equal(await page.evaluate(() => !!window.engine), false);
  await writeFile(path.join(out, 'full-world-results.json'), JSON.stringify({ ...report, checks: ['15 world modules built', 'first frame rendered', 'camera selection', '390px resize and projection', 'animation toggle', 'WebGL context loss recovery', 'return to gallery frees page resources'], at: new Date().toISOString() }, null, 2));
  console.log('[PASS] Full-world integration', JSON.stringify(report));
} finally { await browser?.close(); await server.close(); }
