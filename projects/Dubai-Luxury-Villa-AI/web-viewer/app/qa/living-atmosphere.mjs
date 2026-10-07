import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { revealViewer, revealDetails } from './reveal-viewer.mjs';

const baseUrl = new URL(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/');
baseUrl.searchParams.set('qaCapture', '1');
const output = process.env.QA_OUTPUT ?? 'qa-living-atmosphere-output';
const capture = process.env.QA_SCREENSHOTS === '1';
const motionOnly = process.env.QA_SCENARIO === 'motion';
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', errors: [], matrix: [], checks: [], desktop: {}, mobile: {} };
const browser = await chromium.launch({ headless: true });

function observe(page, diagnostics) {
  diagnostics.modelRequests = 0;
  page.on('pageerror', error => { report.errors.push(String(error)); console.error(String(error)); });
  page.on('console', message => {
    if (message.type() === 'error' || /Shader Error|VALIDATE_STATUS|GL_INVALID_OPERATION/.test(message.text())) {
      report.errors.push(message.text());
      console.error(message.text());
    }
  });
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/villa.glb')) diagnostics.modelRequests += 1;
  });
  page.setDefaultTimeout(30_000);
}

/** Read diagnostics only after the model and all new runtime modules have initialized. */
async function start(page) {
  await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded' });
  await revealViewer(page);
  await page.waitForFunction(() => {
    const view = document.querySelector('.three-canvas');
    return view?.dataset.modelState === 'loaded' && view.dataset.atmosphereReport
      && view.dataset.waterReport && view.dataset.detailsReport
      && view.dataset.atmosphereTime !== undefined;
  }, undefined, { timeout: 120_000 });
  await revealDetails(page, '.atmosphere-controls');
  await revealDetails(page, '.lighting-control');
  await revealDetails(page, '.client-graph');
  await reveal(page.locator('.three-canvas'));
  const modules = await page.locator('.three-canvas').evaluate(view => ({
    atmosphere: JSON.parse(view.dataset.atmosphereReport),
    water: JSON.parse(view.dataset.waterReport),
    details: JSON.parse(view.dataset.detailsReport),
    modelLoadCount: Number(view.dataset.modelLoadCount)
  }));
  for (const [name, value] of Object.entries(modules).filter(([name]) => name !== 'modelLoadCount')) {
    assert.ok(value && typeof value === 'object' && Object.keys(value).length, `${name}: missing runtime report`);
    const visit = object => Object.values(object).forEach(item => {
      if (typeof item === 'number') assert.ok(Number.isFinite(item), `${name}: non-finite runtime diagnostic`);
      if (item && typeof item === 'object') visit(item);
    });
    visit(value);
  }
  assert.equal(modules.modelLoadCount, 1, 'The scene must initialize from one model load');
  assert.ok(modules.atmosphere.rainCount > 0, 'Rain must have actual particles');
  assert.ok(modules.atmosphere.structuralMeshCount > 0 && modules.atmosphere.roofProtectedColumns > 0,
    'Rain must account for the existing house roof');
  assert.equal(modules.water.surfaceFound, true, 'Animated water must attach to the authored pool');
  assert.ok(modules.water.surfaceSizeMeters?.every(value => Number.isFinite(value) && value > 0), 'Water needs a finite positive footprint');
  assert.equal(modules.water.rainRipples, true, 'The pool must respond to rain');
  assert.ok(modules.details.windMeshCount > 0, 'Wind must target actual planting or fabric geometry');
  assert.ok(modules.details.detailMeshCount > 0, 'Architectural detail geometry must be installed');
  return modules;
}

const time = page => page.locator('.three-canvas').getAttribute('data-atmosphere-time').then(Number);
const camera = page => page.locator('.three-canvas').getAttribute('data-camera-position')
  .then(value => value.split(',').map(Number));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** Match the project's visual gates: dispatch to a visible control without waiting for GPU animation stability. */
async function click(locator) {
  console.log(`Activating ${locator}`);
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate(button => button.click());
  // Opening advanced controls may scroll the viewport away from the paused scene.
  await reveal(locator.page().locator('.three-canvas'));
  console.log('Control activated');
}

async function reveal(locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
}

/** Capture the real preserved WebGL buffer; avoid layout-stability waits around a continuously animated canvas. */
async function frame(page, name) {
  console.log(`Capturing ${name ?? 'comparison frame'}`);
  const data = await page.locator('.three-canvas canvas').evaluate(canvas => canvas.toDataURL('image/png'));
  assert.ok(data.startsWith('data:image/png;base64,'), 'WebGL canvas must produce a real image');
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  assert.ok(bytes.length > 1000, 'Captured scene must contain image data');
  if (name) await writeFile(`${output}/${name}.png`, bytes);
  console.log('Frame captured');
  return bytes;
}

async function renderFrame(page) {
  // GPU pacing can defer drawing for several animation callbacks. Wait for the
  // actual submitted frame to match all requested controls, not merely two rAFs.
  await page.waitForFunction(() => {
    const view = document.querySelector('.three-canvas');
    return Boolean(view?.dataset.renderedWeather)
      && view.dataset.renderedWeather === view.dataset.weather
      && view.dataset.renderedLighting === view.dataset.lightingMode
      && view.dataset.renderedMotion === view.dataset.atmosphereMotion;
  });
}

async function studioCapture(page, name) {
  await reveal(page.locator('.viewer-panel'));
  const box = await page.locator('.viewer-panel').boundingBox();
  assert.ok(box?.width > 1 && box?.height > 1, 'Studio must have a visible capture area');
  await page.screenshot({ path: `${output}/${name}.png`, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: box.width, height: box.height }, timeout: 60_000 });
}

async function waitMotion(page, expected) {
  await page.waitForFunction(value => document.querySelector('.three-canvas')?.dataset.atmosphereMotion === value, expected);
}

async function waitAdvance(page, before, amount = 0.12) {
  await page.waitForFunction(({ before, amount }) => Number(document.querySelector('.three-canvas')?.dataset.atmosphereTime) > before + amount,
    { before, amount }, { timeout: 30_000 });
}

async function waitMode(page, expected) {
  await page.waitForFunction(mode => {
    const view = document.querySelector('.three-canvas');
    return view?.dataset.interactionMode === mode && view.dataset.renderedInteractionMode === mode;
  }, expected);
}

async function weather(page, name) {
  const label = name === 'rain' ? 'Rain' : 'Clear sky';
  await click(page.getByRole('button', { name: label, exact: true }));
  await page.waitForFunction(value => document.querySelector('.three-canvas')?.dataset.weather === value, name);
  assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: name === 'rain' ? 'Clear sky' : 'Rain', exact: true }).getAttribute('aria-pressed'), 'false');
}

/** Select wind through keyboard controls, exercising the actual accessible range input. */
async function wind(page, end) {
  console.log(`Wind ${end}: focusing slider`);
  const range = page.getByRole('slider', { name: 'Wind strength', exact: true });
  await range.focus();
  console.log(`Wind ${end}: sending key`);
  await range.press(end === 'min' ? 'Home' : 'End');
  console.log(`Wind ${end}: reading result`);
  const value = Number(await range.inputValue());
  const bound = Number(await range.getAttribute(end));
  assert.equal(value, bound, `Wind slider did not reach its ${end} value`);
  await page.waitForFunction(value => Number(document.querySelector('.three-canvas')?.dataset.wind) === value, value);
  console.log(`Wind ${end}: PASS`);
  return value;
}

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 960 }, reducedMotion: motionOnly ? 'reduce' : 'no-preference' });
  observe(page, report.desktop);
  report.desktop.modules = await start(page);
  console.log('Atmosphere runtime initialized');
  await waitMotion(page, motionOnly ? 'paused' : 'running');
  if (capture && !motionOnly) {
    await frame(page, 'initial-evening-clear');
    console.log('Initial scene captured');
  }
  const pause = page.getByRole('button', { name: 'Pause motion', exact: true });
  if (!motionOnly) await click(pause);
  await waitMotion(page, 'paused');
  if (motionOnly) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await weather(page, 'rain');
  }

  for (const light of motionOnly ? [] : ['Day', 'Evening', 'Night']) {
    await click(page.getByRole('navigation', { name: 'Lighting mode', exact: true })
      .getByRole('button', { name: light, exact: true }));
    for (const condition of ['clear', 'rain']) {
      await weather(page, condition);
      await reveal(page.locator('.three-canvas'));
      await renderFrame(page);
      assert.equal(await page.locator('.three-canvas').getAttribute('data-lighting-mode'), light);
      assert.equal(await page.locator('.three-canvas').getAttribute('data-model-load-count'), '1');
      const state = await page.locator('.three-canvas').evaluate(view => ({
        sky: JSON.parse(view.dataset.atmosphereReport).state,
        reflection: JSON.parse(view.dataset.atmosphereReport),
        water: JSON.parse(view.dataset.waterReport),
        details: JSON.parse(view.dataset.detailsReport)
      }));
      assert.equal(state.sky.mode, light.toLowerCase(), 'Sky must use the selected time of day');
      assert.equal(state.sky.weather, condition, 'Sky/rain must use the selected weather');
      assert.equal(state.reflection.reflectionCacheKey, `${light.toLowerCase()}:${condition}`, 'Reflections must use the visible sky/weather');
      assert.ok(state.reflection.reflectionCacheCount >= 1 && state.reflection.reflectionCacheCount <= 6,
        'Reflection captures must remain bounded to the six supported conditions');
      assert.equal(state.water.weather, condition, 'Water must use the selected weather');
      assert.equal(state.details.weather, condition, 'Architectural surfaces must use the selected weather');
      if (capture) await frame(page, `${light.toLowerCase()}-${condition}`);
      report.matrix.push({ light, weather: condition, result: 'PASS' });
      console.log(`${light} / ${condition}: PASS`);
    }
  }
  if (!motionOnly) {
    report.checks.push('All six lighting and weather combinations render without reloading the model');
    await writeFile(`${output}/matrix-report.json`, JSON.stringify({ status: 'PASS', matrix: report.matrix, errors: report.errors }, null, 2));
  }

  report.desktop.wind = { min: await wind(page, 'min'), max: await wind(page, 'max') };
  assert.ok(report.desktop.wind.max > report.desktop.wind.min, 'Wind must offer a controllable range');
  await reveal(page.locator('.three-canvas'));
  await renderFrame(page);
  const canvas = page.locator('.three-canvas canvas');
  const movingA = digest(await frame(page));
  const beforeAnimation = await time(page);
  console.log('Starting actual motion advance');
  await click(pause);
  await waitMotion(page, 'running');
  await waitAdvance(page, beforeAnimation, 0.12);
  await click(pause);
  await waitMotion(page, 'paused');
  await renderFrame(page);
  const movingB = digest(await frame(page));
  assert.notEqual(movingA, movingB, 'Running rain/wind/water must change the rendered scene');
  report.checks.push('Wind range accepts keyboard input and active weather changes real rendered pixels');

  console.log('Actual animated pixels changed; verifying paused stability');
  assert.equal(await pause.getAttribute('aria-pressed'), 'true');
  await reveal(page.locator('.three-canvas'));
  const frozenTime = await time(page);
  const pausedA = digest(await frame(page));
  await page.waitForTimeout(350);
  assert.equal(await time(page), frozenTime, 'Pause must stop the effect clock');
  assert.equal(digest(await frame(page)), pausedA, 'Paused effects must keep the rendered scene still');
  await click(pause);
  await waitMotion(page, 'running');
  await reveal(page.locator('.three-canvas'));
  await waitAdvance(page, frozenTime);
  report.checks.push('Pause freezes both the effect clock and rendered pixels, then resumes');

  await click(page.getByRole('button', { name: 'Drone flight', exact: true }));
  await waitMode(page, 'drone');
  await canvas.focus();
  const beforeDrone = await camera(page);
  await page.keyboard.down('e');
  try {
    await page.waitForFunction(before => {
      const position = document.querySelector('.three-canvas')?.dataset.cameraPosition?.split(',').map(Number);
      return position?.[1] > before[1] + 0.06;
    }, beforeDrone, { timeout: 15_000 });
  } finally { await page.keyboard.up('e'); }
  report.desktop.droneMovement = { before: beforeDrone, after: await camera(page) };
  await click(page.getByRole('button', { name: 'Go inside', exact: true }));
  await waitMode(page, 'guided');
  assert.equal(await page.locator('.three-canvas').getAttribute('data-tour-stop'), 'entry');
  await click(page.locator('.client-graph li').filter({ hasText: 'Pool terrace' }).getByRole('button'));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'pool');
  await waitMode(page, 'guided');
  if (capture) {
    await click(pause);
    await waitMotion(page, 'paused');
    await renderFrame(page);
    await frame(page, 'guided-pool-rain');
    await studioCapture(page, 'studio-pool-rain-ui');
    await click(pause);
    await waitMotion(page, 'running');
  }
  await click(page.getByRole('button', { name: 'Orbit overview', exact: true }));
  await waitMode(page, 'orbit');
  assert.equal(await page.locator('.three-canvas').getAttribute('data-model-load-count'), '1');
  assert.equal(report.desktop.modelRequests, 1, 'Weather and navigation must reuse the same downloaded model');
  report.checks.push('Rain preserves drone movement, guided entry and pool stops, and return to orbit');

  // System preference can change while the page remains open.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await waitMotion(page, 'paused');
  await reveal(page.locator('.three-canvas'));
  const reducedTime = await time(page);
  await page.waitForTimeout(350);
  assert.equal(await time(page), reducedTime, 'A new reduced-motion preference must stop active effects');
  report.checks.push('A system reduced-motion change pauses existing effects');
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  observe(mobile, report.mobile);
  report.mobile.modules = await start(mobile);
  await waitMotion(mobile, 'paused');
  await weather(mobile, 'rain');
  await reveal(mobile.locator('.three-canvas'));
  const mobileTime = await time(mobile);
  await mobile.waitForTimeout(350);
  assert.equal(await time(mobile), mobileTime, 'Reduced motion must remain paused after changing weather');
  const layout = await mobile.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(layout.content <= layout.width + 1, 'New weather controls overflow the mobile viewport');
  assert.equal(report.mobile.modelRequests, 1);
  if (capture) await frame(mobile, 'mobile-rain-paused');
  report.checks.push('Mobile starts with reduced motion respected and weather controls fit the viewport');
  await mobile.close();
  assert.deepEqual(report.errors, [], 'The atmosphere must not produce browser or shader errors');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
