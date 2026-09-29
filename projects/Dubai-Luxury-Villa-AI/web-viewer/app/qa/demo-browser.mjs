import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const url = process.env.VILLA_URL || 'http://127.0.0.1:4173/';
await mkdir('qa-output', { recursive: true });
const report = { testedSha: process.env.GITHUB_SHA ?? null, url, profiles: {}, pageErrors: [], failedResponses: [],
  boundary: 'Native-buffer functional smoke with environment motion paused. No physical-device or smoothness claim. Blur is synthetically dispatched.' };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
async function snapshot(page) {
  return page.locator('.three-canvas').evaluate(el => {
    const canvas = el.querySelector('canvas'), rect = canvas.getBoundingClientRect();
    return { ...el.dataset, buffer: [canvas.width, canvas.height], css: [rect.width, rect.height], dpr: devicePixelRatio };
  });
}
async function renderedDemo(page) {
  await page.waitForFunction(() => {
    const d = document.querySelector('.three-canvas')?.dataset;
    return d?.renderedInteractionMode === 'demo' && d.renderedDemoTime !== undefined && d.renderedDemoTime !== ''
      && (d.demoState === 'playing' || d.renderedDemoTime === d.demoTime);
  }, null, { timeout: 120000 });
}
try {
  for (const profile of [
    { name: 'desktop', viewport: { width: 1280, height: 960 }, reducedMotion: 'no-preference' },
    { name: 'mobile-still', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true }
  ]) {
    const { name, ...options } = profile;
    const page = await browser.newPage({ ...options, deviceScaleFactor: 1 });
    page.setDefaultTimeout(90000);
    page.on('pageerror', error => report.pageErrors.push({ name, error: String(error) }));
    page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ name, status: response.status(), url: response.url() }); });
    let glbRequests = 0;
    page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/villa.glb')) glbRequests += 1; });
    await page.goto(`${url}#viewer`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('#viewer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', null, { timeout: 120000 });
    await page.waitForFunction(() => Boolean(document.querySelector('.three-canvas')?.dataset.interiorAccessories));
    const panel = page.getByRole('region', { name: 'Residence demo controls', exact: true });
    const overlay = page.getByRole('group', { name: 'In-view demo controls', exact: true });
    const idle = await snapshot(page);
    assert.notEqual(idle.demoState, 'playing', 'Demo must never autoplay');
    if (name === 'desktop') {
      const motion = page.getByRole('button', { name: 'Pause motion', exact: true });
      if (await motion.getAttribute('aria-pressed') !== 'true') await motion.click();
    }
    await panel.getByRole('button', { name: name === 'desktop' ? 'Play house + drone demo' : 'View demo scenes', exact: false }).click();
    await renderedDemo(page);
    let current = await snapshot(page);
    const board = JSON.parse(current.demoReport);
    assert.deepEqual(board.routeStops, ['entry', 'living', 'dining', 'stair-ground', 'stair-upper', 'master', 'stair-upper', 'stair-ground', 'dining', 'living', 'pool']);
    assert.equal(current.viewMode, 'demo');
    if (name === 'desktop') {
      await page.waitForFunction(() => Number(document.querySelector('.three-canvas')?.dataset.renderedDemoTime) > 2.1, null, { timeout: 120000 });
      await overlay.getByRole('button', { name: 'Pause tour', exact: true }).click();
      await renderedDemo(page);
      const paused = await snapshot(page);
      assert.equal(paused.demoState, 'paused');
      await page.waitForTimeout(600);
      assert.equal((await snapshot(page)).demoTime, paused.demoTime);
      assert.equal((await snapshot(page)).cameraPosition, paused.cameraPosition);
      await overlay.getByRole('button', { name: 'Resume tour', exact: true }).click();
      await page.waitForFunction(time => Number(document.querySelector('.three-canvas')?.dataset.renderedDemoTime) > time + 0.2, Number(paused.demoTime), { timeout: 120000 });
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await renderedDemo(page);
      assert.equal((await snapshot(page)).demoState, 'paused');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(300);
      assert.equal((await snapshot(page)).demoState, 'paused', 'Returning focus must not autoplay');
    } else {
      assert.equal(current.demoState, 'paused');
      await page.waitForTimeout(600);
      assert.equal((await snapshot(page)).demoTime, current.demoTime);
      await overlay.getByRole('button', { name: 'Next scene', exact: true }).click();
      await renderedDemo(page);
      assert.equal((await snapshot(page)).demoState, 'paused');
      assert.notEqual((await snapshot(page)).demoTime, current.demoTime);
    }
    await page.locator('.three-canvas-shell').screenshot({ path: `qa-output/${name}-house.png`, timeout: 120000 });
    await overlay.getByRole('button', { name: 'Exit demo view', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.renderedInteractionMode === 'orbit', null, { timeout: 120000 });
    await panel.getByRole('button', { name: 'Drone orbit only', exact: true }).click();
    if (name === 'desktop') {
      await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.demoState === 'playing', null, { timeout: 120000 });
      await overlay.getByRole('button', { name: 'Pause tour', exact: true }).click();
    }
    await renderedDemo(page);
    if (name === 'desktop') assert.equal((await snapshot(page)).demoState, 'paused');
    current = await snapshot(page);
    const orbit = JSON.parse(current.demoReport);
    assert.equal(orbit.mode, 'orbit');
    const position = current.cameraPosition.split(',').map(Number);
    assert.ok(position[1] > orbit.aerial.roofMaxY + 4.9);
    assert.ok(Math.abs(Math.hypot(position[0] - orbit.aerial.center[0], position[2] - orbit.aerial.center[2]) - orbit.aerial.radius) < 0.02);
    await page.locator('.three-canvas-shell').screenshot({ path: `qa-output/${name}-orbit.png`, timeout: 120000 });
    await page.getByRole('button', { name: 'Go inside', exact: false }).click();
    await page.waitForFunction(() => {
      const d = document.querySelector('.three-canvas')?.dataset;
      return d?.demoState === 'idle' && d.renderedInteractionMode === 'guided';
    }, null, { timeout: 120000 });
    assert.equal((await snapshot(page)).modelLoadCount, '1');
    assert.equal(glbRequests, 1, 'Demo and manual navigation must reuse the existing model');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, `New demo controls overflow by ${overflow}px`);
    const targetSizes = await panel.locator('button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
    assert.ok(targetSizes.every(height => height >= 44));
    report.profiles[name] = { result: 'PASS', assetRequests: glbRequests, sceneCuts: board.cuts,
      accessories: JSON.parse(current.interiorAccessories), buffer: current.buffer, css: current.css, dpr: current.dpr };
    await page.close();
  }
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.failedResponses, []);
  report.result = 'PASS';
} catch (error) {
  report.result = 'FAIL'; report.error = String(error); throw error;
} finally {
  await writeFile('qa-output/demo-browser.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}
