import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { revealViewer } from './reveal-viewer.mjs';

const output = process.env.QA_OUTPUT ?? 'qa-arrival-output';
await mkdir(output, { recursive: true });
// Motion/control sampling uses a bounded raster budget; full-resolution visual gates stay separate.
const motionPixelRatio = 0.5;
const report = { status: 'RUNNING', rasterBoundary: 'Functional camera/control QA at DPR 0.5; not full-resolution visual quality or device performance.', prHeadSha: process.env.PR_HEAD_SHA ?? null,
  checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scenarios: [] };
const browser = await chromium.launch({ headless: true, args: [
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding'
] });

/**
 * Observe the viewer's post-render diagnostics in the page, before CDP round trips.
 * Invoke the real Pause control only after an intermediate rendered camera pose.
 * Slow software rendering can finish a short film before a Node-side click returns;
 * neither a completed label nor a final pose substitutes for intermediate evidence.
 */
async function observeArrival(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('.three-canvas');
    const panel = document.querySelector('.arrival-reveal');
    const probe = { frames: [], lifecycle: [], pauseRequested: false, pauseFrame: null };
    window.__arrivalProbe = probe;
    for (const type of ['blur', 'focus']) window.addEventListener(type, () => {
      probe.lifecycle.push({ type, at: performance.now() });
    });
    document.addEventListener('visibilitychange', () => {
      probe.lifecycle.push({ type: 'visibility', hidden: document.hidden, at: performance.now() });
    });
    const snapshot = () => ({
      at: performance.now(), phase: canvas.dataset.arrivalPhase,
      uiPhase: panel.dataset.phase, progress: Number(canvas.dataset.arrivalProgress),
      position: canvas.dataset.cameraPosition?.split(',').map(Number) ?? [],
      direction: canvas.dataset.cameraDirection?.split(',').map(Number) ?? [],
      hidden: document.hidden, focused: document.hasFocus()
    });
    const observer = new MutationObserver(() => {
      const frame = snapshot();
      if (probe.frames.length < 2000) probe.frames.push(frame);
      if (probe.cancelReplay && !probe.cancelFrame && ['threshold', 'moving', 'still'].includes(frame.phase)) {
        const orbit = [...document.querySelectorAll('.scene-navigation button')].find(b => b.textContent.trim() === 'Orbit overview');
        if (orbit) { probe.cancelFrame = frame; orbit.click(); }
        return;
      }
      if (!probe.pauseRequested && frame.phase === 'moving'
        && frame.progress >= 0.05 && frame.progress < 1) {
        const pause = [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'Pause arrival');
        if (pause) {
          probe.pauseRequested = true;
          probe.pauseFrame = frame;
          pause.click(); // Application handler, not a runtime or clock override.
        }
      }
    });
    observer.observe(canvas, { attributes: true, attributeFilter: [
      'data-camera-position', 'data-camera-direction', 'data-arrival-phase', 'data-arrival-progress'
    ] });
    probe.frames.push(snapshot());
  });
}

try {
  for (const [name, width, reducedMotion] of [['desktop', 1440, 'no-preference'], ['mobile', 390, 'no-preference'], ['reduced', 320, 'reduce']]) {
    const scenario = { name, width, deviceScaleFactor: motionPixelRatio, checks: [], errors: [], modelRequests: 0 };
    report.scenarios.push(scenario);
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: motionPixelRatio, hasTouch: width < 700, isMobile: width < 700, reducedMotion });
    page.setDefaultTimeout(30_000);
    page.on('pageerror', e => scenario.errors.push(String(e)));
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/villa.glb')) scenario.modelRequests++; });
    try {
      await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await revealViewer(page);
      const canvas = page.locator('.three-canvas');
      const controls = page.getByRole('region', { name: 'Arrival preview' });
      await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', null, { timeout: 120_000 });
      assert.equal(await controls.getAttribute('data-phase'), 'idle', 'Preview started without a click');
      scenario.raster = await canvas.evaluate(element => ({
        devicePixelRatio: window.devicePixelRatio, cssWidth: element.clientWidth,
        pixelWidth: element.querySelector('canvas').width
      }));
      assert.equal(scenario.raster.devicePixelRatio, motionPixelRatio);
      assert(Math.abs(scenario.raster.pixelWidth - scenario.raster.cssWidth * motionPixelRatio) <= 1);
      await observeArrival(page);
      await page.bringToFront();
      await controls.getByRole('button', { name: 'Play arrival' }).click();
      await page.waitForFunction(() => ['threshold', 'moving', 'paused', 'still', 'blocked', 'complete'].includes(document.querySelector('.arrival-reveal')?.dataset.phase));
      const route = JSON.parse(await canvas.getAttribute('data-arrival-clearance'));
      scenario.route = route;
      assert.equal(route.clear, true, JSON.stringify(route));
      const position = async () => (await canvas.getAttribute('data-camera-position')).split(',').map(Number);
      const flush = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (reducedMotion === 'reduce') {
        assert.equal(await controls.getAttribute('data-phase'), 'still');
        await flush(); const still = await position(); await page.waitForTimeout(300);
        assert.deepEqual(await position(), still);
        assert.equal(await page.evaluate(() => window.__arrivalProbe.pauseRequested), false);
        scenario.checks.push('Reduced motion: no automatic camera movement');
      } else {
        await page.waitForFunction(() => window.__arrivalProbe.pauseRequested
          && document.querySelector('.arrival-reveal')?.dataset.phase === 'paused', null, { polling: 100, timeout: 120_000 });
        const pauseFrame = await page.evaluate(() => window.__arrivalProbe.pauseFrame);
        assert(pauseFrame.progress > 0 && pauseFrame.progress < 1, 'No intermediate rendered progress');
        assert(Math.hypot(...pauseFrame.position.map((v, i) => v - route.from[i])) > 0.005, 'Progress changed without camera movement');
        await flush(); const paused = await position(); await page.waitForTimeout(300);
        assert.deepEqual(await position(), paused, 'Paused camera moved');
        scenario.checks.push('Intermediate rendered position observed; real Pause handler freezes the camera');
        if (name === 'desktop') await page.locator('.three-canvas-shell').screenshot({ path: `${output}/midway.png`, animations: 'disabled' });
        await controls.getByRole('button', { name: 'Resume arrival' }).click();
        if (name === 'desktop') {
          await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'complete', null, { polling: 100, timeout: 240_000 });
          scenario.checks.push('Resume reaches natural completion, without Show water view');
        } else {
          await page.waitForFunction(previous => window.__arrivalProbe.frames.some(frame =>
            frame.at > previous.at && frame.position.length === 3
            && Math.hypot(...frame.position.map((v, i) => v - previous.position[i])) > 0.005), pauseFrame, { polling: 100, timeout: 60_000 });
        }
      }
      if (name !== 'desktop' && await controls.getAttribute('data-phase') !== 'complete') {
        try {
          await controls.getByRole('button', { name: 'Show water view' }).click({ timeout: 5_000 });
        } catch (error) {
          // Natural completion can replace the control between the phase read and
          // Playwright's stability check. Accept only that exact terminal race;
          // any other click failure is still a test failure.
          if (await controls.getAttribute('data-phase') !== 'complete') throw error;
          scenario.checks.push('Natural completion won the Show water view click race');
        }
      }
      await page.waitForFunction(to => {
        const c = document.querySelector('.three-canvas');
        const p = c?.dataset.cameraPosition?.split(',').map(Number) ?? [];
        return c?.dataset.tourStop === 'living' && p.length === 3 && Math.hypot(...p.map((v, i) => v - to[i])) < 0.02;
      }, route.to, { timeout: 60_000 });
      await flush();
      const direction = (await canvas.getAttribute('data-camera-direction')).split(',').map(Number);
      const aim = route.water.map((v, i) => v - route.to[i]);
      const dot = aim.reduce((sum, v, i) => sum + v * direction[i], 0) / (Math.hypot(...aim) * Math.hypot(...direction));
      assert(dot > 0.995, 'Final view is not looking toward the water target');
      assert.equal(await controls.getAttribute('data-phase'), 'complete');
      await page.locator('.three-canvas-shell').screenshot({ path: `${output}/water-${name}.png`, animations: 'disabled' });
      scenario.checks.push('Final authored living position, pool-facing direction and shared room state agree');
      await page.evaluate(() => { window.__arrivalProbe.cancelReplay = true; });
      await controls.getByRole('button', { name: 'Play arrival' }).click();
      await page.waitForFunction(() => window.__arrivalProbe.cancelFrame
        && document.querySelector('.three-canvas')?.dataset.renderedInteractionMode === 'orbit');
      assert.equal(await controls.getAttribute('data-phase'), 'idle', 'Navigation did not cancel arrival');
      await page.waitForTimeout(500);
      assert.equal(await canvas.getAttribute('data-view-mode'), 'orbit');
      assert.equal(await canvas.getAttribute('data-model-load-count'), '1');
      assert.equal(scenario.modelRequests, 1);
      const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        buttons: [...document.querySelectorAll('.arrival-reveal button')].map(e => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height }; }) }));
      assert(layout.scroll <= layout.width + 1);
      assert(layout.buttons.every(b => b.left >= 0 && b.right <= width + 1 && b.height >= 44));
      assert.equal(scenario.errors.length, 0, scenario.errors.join('\n'));
      scenario.checks.push('Replay cancels on normal navigation, model loads once, controls fit viewport');
      scenario.status = 'PASS';
    } catch (error) {
      scenario.status = 'FAIL';
      scenario.failure = String(error.stack ?? error);
      await page.screenshot({ path: `${output}/failure-${name}.png`, timeout: 10000 }).catch(() => {});
      throw error;
    } finally {
      scenario.observations = await page.evaluate(() => window.__arrivalProbe ?? null).catch(() => null);
      await page.close();
    }
  }
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
finally { await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
