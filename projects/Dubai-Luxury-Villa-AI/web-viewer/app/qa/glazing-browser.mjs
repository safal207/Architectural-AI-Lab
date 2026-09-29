import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { revealViewer } from './reveal-viewer.mjs';

const output = process.env.QA_OUTPUT ?? 'qa-glazing-output';
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', visualVerdict: 'REQUIRES_REVIEW',
  prHeadSha: process.env.PR_HEAD_SHA ?? null,
  checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  boundary: 'Native DPR 1 static WebGL comparisons; no smoothness, daylight or optical-performance certification.', captures: [] };
const browser = await chromium.launch({ headless: true });
try {
  const referenceGlb = await readFile('dist-glazing-reference/villa.glb');
  const currentGlb = await readFile('dist-glazing-current/villa.glb');
  assert(referenceGlb.equals(currentGlb), 'Before and after must use identical geometry/assets');
  report.glbSha256 = createHash('sha256').update(currentGlb).digest('hex');
  for (const [variant, port] of [['before', 4181], ['after', 4182]]) {
    for (const [device, width] of [['desktop', 1440], ['mobile', 390]]) {
      const capture = { variant, device, width, dpr: 1, errors: [], modelRequests: 0 };
      report.captures.push(capture);
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1,
        reducedMotion: 'reduce', isMobile: device === 'mobile', hasTouch: device === 'mobile' });
      page.setDefaultTimeout(60_000);
      page.on('pageerror', e => capture.errors.push(String(e)));
      page.on('request', req => { if (new URL(req.url()).pathname.endsWith('/villa.glb')) capture.modelRequests++; });
      try {
        await page.goto(`http://127.0.0.1:${port}/?qaCapture=1`, { waitUntil: 'domcontentloaded' });
        await revealViewer(page);
        await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', null, { timeout: 120_000 });
        const panel = page.getByRole('region', { name: 'Arrival preview' });
        await panel.getByRole('button', { name: 'Play arrival' }).click();
        await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'still');
        await panel.getByRole('button', { name: 'Show water view' }).click();
        await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'complete'
          && document.querySelector('.three-canvas')?.dataset.tourStop === 'living');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        capture.living = await page.locator('.three-canvas').evaluate(element => ({
          position: element.dataset.cameraPosition, direction: element.dataset.cameraDirection,
          cssWidth: element.clientWidth, pixelWidth: element.querySelector('canvas').width,
          devicePixelRatio: window.devicePixelRatio, mode: element.dataset.renderedInteractionMode
        }));
        assert.equal(capture.living.devicePixelRatio, 1);
        assert.equal(capture.living.pixelWidth, capture.living.cssWidth);
        await page.locator('.three-canvas-shell').screenshot({ path: `${output}/${variant}-${device}-living.png` });
        if (device === 'desktop') {
          await page.locator('.scene-navigation').getByRole('button', { name: 'Orbit overview', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.renderedInteractionMode === 'orbit');
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          capture.exterior = await page.locator('.three-canvas').evaluate(element => ({ position: element.dataset.cameraPosition, direction: element.dataset.cameraDirection }));
          await page.locator('.three-canvas-shell').screenshot({ path: `${output}/${variant}-desktop-exterior.png` });
        }
        assert.equal(capture.modelRequests, 1);
        assert.equal(capture.errors.length, 0, capture.errors.join('\n'));
        capture.status = 'CAPTURED';
      } catch (error) {
        capture.status = 'FAIL'; capture.failure = String(error.stack ?? error);
        await page.screenshot({ path: `${output}/failure-${variant}-${device}.png`, timeout: 10000 }).catch(() => {});
        throw error;
      } finally { await page.close(); }
    }
  }
  for (const device of ['desktop', 'mobile']) {
    const before = report.captures.find(c => c.variant === 'before' && c.device === device);
    const after = report.captures.find(c => c.variant === 'after' && c.device === device);
    assert.deepEqual(after.living, before.living, 'Material comparison changed the camera or raster');
    if (device === 'desktop') assert.deepEqual(after.exterior, before.exterior);
  }
  report.status = 'PASS'; // Capture integrity only; inspect the images before accepting visual quality.
} catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
finally {
  await writeFile(`${output}/comparison.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
