import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { revealViewer } from './reveal-viewer.mjs';
const output = process.env.QA_OUTPUT ?? 'qa-arrival-output';
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', prHeadSha: process.env.PR_HEAD_SHA ?? null,
  checkoutSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), scenarios: [] };
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, reducedMotion] of [['desktop', 1440, 'no-preference'], ['mobile', 390, 'no-preference'], ['reduced', 320, 'reduce']]) {
    const scenario = { name, width, checks: [], errors: [], modelRequests: 0 };
    report.scenarios.push(scenario);
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width < 700, isMobile: width < 700, reducedMotion });
    page.setDefaultTimeout(30_000);
    page.on('pageerror', e => scenario.errors.push(String(e)));
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/villa.glb')) scenario.modelRequests++; });
    await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await revealViewer(page);
    const canvas = page.locator('.three-canvas');
    const controls = page.getByRole('region', { name: 'Arrival preview' });
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', null, { timeout: 120_000 });
    assert.equal(await controls.getAttribute('data-phase'), 'idle', 'Preview started without a click');
    await controls.getByRole('button', { name: 'Play arrival' }).click();
    await page.waitForFunction(() => ['threshold', 'moving', 'still', 'blocked'].includes(document.querySelector('.arrival-reveal')?.dataset.phase));
    const route = JSON.parse(await canvas.getAttribute('data-arrival-clearance'));
    scenario.route = route;
    assert.equal(route.clear, true, JSON.stringify(route));
    const position = async () => (await canvas.getAttribute('data-camera-position')).split(',').map(Number);
    const flush = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (reducedMotion === 'reduce') {
      assert.equal(await controls.getAttribute('data-phase'), 'still');
      await flush(); const still = await position(); await page.waitForTimeout(300);
      assert.deepEqual(await position(), still);
      scenario.checks.push('Reduced motion: no automatic camera movement');
    } else {
      await page.waitForFunction(() => Number(document.querySelector('.three-canvas')?.dataset.arrivalProgress) > 0.05, null, { timeout: 120_000 });
      await controls.getByRole('button', { name: 'Pause arrival' }).click();
      await flush(); const paused = await position(); await page.waitForTimeout(300);
      assert.deepEqual(await position(), paused, 'Paused camera moved');
      const priorProgress = Number(await canvas.getAttribute('data-arrival-progress'));
      scenario.checks.push('Actual model camera moves, then pause freezes it');
      if (name === 'desktop') await page.locator('.three-canvas-shell').screenshot({ path: `${output}/midway.png`, animations: 'disabled' });
      await controls.getByRole('button', { name: 'Resume arrival' }).click();
      await page.waitForFunction(p => Number(document.querySelector('.three-canvas')?.dataset.arrivalProgress) > p, priorProgress, { timeout: 60_000 });
      if (name === 'desktop') {
        await page.waitForFunction(() => document.querySelector('.arrival-reveal')?.dataset.phase === 'complete', null, { timeout: 240_000 });
        scenario.checks.push('Natural completion reaches the final view');
      }
    }
    if (name !== 'desktop') await controls.getByRole('button', { name: 'Show water view' }).click();
    await page.waitForFunction(to => {
      const c = document.querySelector('.three-canvas');
      const p = c?.dataset.cameraPosition?.split(',').map(Number) ?? [];
      return c?.dataset.tourStop === 'living' && p.length === 3 && Math.hypot(...p.map((v, i) => v - to[i])) < 0.02;
    }, route.to, { timeout: 60_000 });
    await flush();
    const direction = (await canvas.getAttribute('data-camera-direction')).split(',').map(Number);
    const aim = route.water.map((v, i) => v - route.to[i]);
    const dot = aim.reduce((sum, v, i) => sum + v * direction[i], 0) / Math.hypot(...aim);
    assert(dot > 0.995, 'Final view is not looking toward the water target');
    assert.equal(await controls.getAttribute('data-phase'), 'complete');
    await page.locator('.three-canvas-shell').screenshot({ path: `${output}/water-${name}.png`, animations: 'disabled' });
    scenario.checks.push('Final authored living position, pool-facing direction and shared room state agree');
    await controls.getByRole('button', { name: 'Play arrival' }).click();
    await page.waitForFunction(() => ['threshold', 'moving', 'still'].includes(document.querySelector('.arrival-reveal')?.dataset.phase));
    await page.locator('.scene-navigation').getByRole('button', { name: 'Orbit overview', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.renderedInteractionMode === 'orbit');
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
    await page.close();
  }
  report.status = 'PASS';
} catch (error) { report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error; }
finally { await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); await browser.close(); }
