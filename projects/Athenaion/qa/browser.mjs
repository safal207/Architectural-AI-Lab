import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { startServer } from '../tools/serve.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'qa-output');
await mkdir(out, { recursive: true });
const temporary = await mkdtemp(path.join(tmpdir(), 'athenaion-browser-'));
await cp(path.join(root, 'dist'), path.join(temporary, 'portfolio/athenaion'), { recursive: true });
const server = await startServer(0, temporary);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = `http://127.0.0.1:${server.port}/portfolio/athenaion/`;
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], requested = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requested.push(request.url()));
  await page.goto(url); await page.locator('.shot').last().waitFor();
  assert.equal(await page.locator('.shot').count(), 9);
  assert.equal(await page.evaluate(() => !!window.engine), false);
  assert.equal(requested.some((p) => p.includes('/vendor/')), false, 'The gallery must not load Three.js');
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${width}px`);
  }
  await page.locator('#language').selectOption('en');
  await page.locator('[data-shot="7"]').click();
  assert.equal(await page.locator('#view-title').textContent(), 'At the water’s edge');
  assert.equal(new URL(page.url()).searchParams.get('shot'), '7');
  await page.reload(); await page.locator('.shot').last().waitFor();
  assert.equal(await page.locator('[data-shot="7"]').getAttribute('aria-current'), 'true');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: path.join(out, 'desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#language').selectOption('ru');
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: path.join(out, 'mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  checks.push('Gallery: 9 views; no eager WebGL or Three.js; RU/EN; view deep link survives reload; no overflow at 320/390/1024/1440px');

  const noGL = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await noGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args); };
  });
  await noGL.goto(url); await noGL.locator('#launch').click();
  await noGL.getByText('WebGL 2 недоступен.', { exact: false }).waitFor();
  await noGL.locator('[data-shot="2"]').click();
  assert.equal(await noGL.locator('#view-title').textContent(), 'Тихая вода');
  assert.equal(await noGL.locator('#loading').isVisible(), false);
  checks.push('WebGL unavailable: clear message, gallery and view selection remain usable');

  const failed = await browser.newPage();
  await failed.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? { getExtension: () => null } : original.call(this, type, ...args); };
  });
  await failed.route('**/src/main.js', (route) => route.abort());
  await failed.goto(url); await failed.locator('#launch').click();
  await failed.getByText('Не удалось открыть 3D.', { exact: false }).waitFor();
  assert.equal(await failed.locator('#loading').isVisible(), false);
  assert.equal(await failed.locator('#quality').isEnabled(), true);
  await failed.locator('[data-shot="9"]').click();
  assert.equal(await failed.locator('#view-title').textContent(), 'Сквозь время');
  checks.push('Failed 3D module import: clear recovery, quality and gallery still usable');

  for (const asset of ['vendor/three/build/three.module.js', 'vendor/three/examples/jsm/controls/OrbitControls.js', 'src/terrain/worker.js', 'generated/terrain-far-v11.bin', 'LICENSE']) {
    const response = await fetch(new URL(asset, url)); assert.equal(response.status, 200, asset);
  }
  checks.push('Three.js, workers, mountain grid and license delivered from a nested hosting path');
  await writeFile(path.join(out, 'browser-results.json'), JSON.stringify({ checks, fullWorldGPU: 'NOT_RUN: separate full-world GPU verification', at: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify({ pass: checks.length, checks }, null, 2));
} finally {
  await browser.close(); await server.close(); await rm(temporary, { recursive: true, force: true });
}
