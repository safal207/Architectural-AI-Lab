import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-living-pool-output';
await mkdir(outputDir, { recursive: true });
const report = {
  status: 'RUNNING', url: baseUrl,
  provenance: { head: process.env.VILLA_PR_HEAD_SHA ?? null, checkout: process.env.VILLA_CHECKOUT_SHA ?? null },
  evidence: 'Production build; reduced-motion static frames, not physical-device motion acceptance',
  profiles: [], consoleErrors: [], pageErrors: []
};
let browser;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function settledFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function waitForView(page, stop) {
  await page.locator('.three-canvas canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const state = document.querySelector('.three-canvas')?.dataset;
    return state?.modelState === 'loaded' && state?.tourStop === id
      && state?.renderedTourStop === id
      && state?.renderedInteractionMode === 'guided' && state?.walkGraph === 'ready';
  }, stop, { timeout: 120_000 });
  await settledFrame(page);
}

async function waitForClearedViewSelection(page) {
  await page.waitForFunction(() => {
    const group = document.querySelector('#showcase-views-title')?.parentElement;
    return group && group.querySelectorAll('button[aria-pressed="true"]').length === 0;
  });
}

async function paletteState(page, id, name) {
  await page.waitForFunction((expected) => document.querySelector('.three-canvas')?.dataset.materialMode === expected, id);
  const main = page.locator('.material-switcher');
  const compact = page.locator('#living-pool-showcase');
  check(await main.getByRole('button', { name: new RegExp(name) }).getAttribute('aria-pressed') === 'true', `${name}: main selector is stale`);
  const selected = compact.locator('button[aria-pressed="true"]').filter({ hasText: /Warm Limestone|Graphite Mineral/ });
  check(await selected.count() === (id === 'sandstone' ? 0 : 1), `${name}: compact palette selection is stale`);
  if (id !== 'sandstone') check((await selected.innerText()).trim() === name, `${name}: wrong compact palette`);
  check((await compact.innerText()).includes(`Selected finish: ${name}`), `${name}: current finish note is stale`);
  check((await page.locator('.experience-status').innerText()).includes(`Material: ${name}`), `${name}: studio status is stale`);
}

async function downloadBrief(page, profile, name, space) {
  const pending = page.waitForEvent('download');
  await page.locator('#brief').getByRole('button', { name: 'Download my brief', exact: true }).click();
  const download = await pending;
  const path = `${outputDir}/${profile}-brief.txt`;
  await download.saveAs(path);
  check(await download.failure() === null, `${profile}: brief download failed`);
  const text = await readFile(path, 'utf8');
  check(text.includes(`Material direction: ${name}`), `${profile}: downloaded brief palette is stale`);
  check(text.includes(`Selected reference space: ${space}`), `${profile}: downloaded brief space is stale`);
  return createHash('sha256').update(text).digest('hex');
}

async function captureFrame(page, filename) {
  await page.locator('.three-canvas canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const state = document.querySelector('.three-canvas')?.dataset;
    return state?.renderedMaterial === state?.materialMode
      && state?.renderedTourStop === state?.tourStop
      && state?.renderedInteractionMode === 'guided';
  });
  await settledFrame(page);
  const data = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  check(bytes.length > 10_000, `${filename}: missing rendered image`);
  await writeFile(`${outputDir}/${filename}`, bytes);
  return { file: filename, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    camera: await page.locator('.three-canvas').getAttribute('data-camera-position') };
}

async function containment(page) {
  const layout = await page.locator('#living-pool-showcase').evaluate((section) => ({
    clientWidth: section.clientWidth, scrollWidth: section.scrollWidth,
    documentWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth,
    buttons: [...section.querySelectorAll('button')].map((button) => {
      const rect = button.getBoundingClientRect();
      return { label: button.textContent.trim(), width: rect.width, height: rect.height, left: rect.left, right: rect.right };
    })
  }));
  check(layout.scrollWidth <= layout.clientWidth + 1, 'Showcase clips internally');
  check(layout.documentScrollWidth <= layout.documentWidth + 1, 'Horizontal document overflow');
  check(layout.buttons.every((button) => button.width >= 44 && button.height >= 44 && button.left >= 0 && button.right <= layout.documentWidth + 1), 'Showcase buttons are too small or outside viewport');
  return layout;
}

try {
  browser = await chromium.launch({ headless: true });
  report.browserVersion = browser.version();
  for (const profile of [
    { id: 'desktop-1440', viewport: { width: 1440, height: 1000 } },
    { id: 'mobile-390', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { id: 'mobile-320', viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true }
  ]) {
    console.log(`Checking ${profile.id}`);
    const { id, ...options } = profile;
    const page = await browser.newPage({ ...options, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60_000);
    const result = { id: profile.id, frames: [] };
    report.profiles.push(result);
    page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => report.pageErrors.push(String(error)));
    let modelRequests = 0;
    page.on('request', (request) => { if (new URL(request.url()).pathname.endsWith('/villa.glb')) modelRequests += 1; });
    const captureUrl = new URL(baseUrl);
    captureUrl.searchParams.set('qaCapture', '1');
    await page.goto(captureUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const compact = page.locator('#living-pool-showcase');
    const views = compact.getByRole('group', { name: 'Two views of the residence' });
    const finishes = compact.getByRole('group', { name: 'Compare two finish directions' });
    await compact.scrollIntoViewIfNeeded();
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Showcase starts a view without visitor selection');
    await page.locator('#viewer .viewer-panel').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', undefined, { timeout: 120_000 });
    await settledFrame(page);
    const overviewCamera = await page.locator('.three-canvas').getAttribute('data-camera-position');
    const living = views.getByRole('button', { name: '1. Living room', exact: true });
    await living.focus();
    await page.keyboard.press('Enter');
    await waitForView(page, 'living');
    check(await living.getAttribute('aria-pressed') === 'true', 'Living view is not selected after loading');
    check(await living.evaluate((button) => document.activeElement === button), 'View selection loses keyboard focus');
    await paletteState(page, 'warm-limestone', 'Warm Limestone');
    const warm = await captureFrame(page, `${profile.id}-living-warm.png`);
    check(warm.camera !== overviewCamera, 'Living view did not move the rendered camera');
    result.frames.push(warm);
    await finishes.getByRole('button', { name: 'Graphite Mineral', exact: true }).click();
    if (profile.isMobile) {
      const bounds = await page.locator('.three-canvas canvas').boundingBox();
      check(bounds && bounds.y < profile.viewport.height && bounds.y + bounds.height > 0, 'Mobile finish selection did not reveal the scene');
      const controls = await page.locator('.viewer-exit-tour').evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const navigation = document.querySelector('.project-chapters').getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { top: rect.top, bottom: rect.bottom, navigationBottom: navigation.bottom, unobstructed: button === hit || button.contains(hit) };
      });
      check(controls.top >= controls.navigationBottom && controls.bottom <= profile.viewport.height && controls.unobstructed, 'Mobile scene controls are obstructed after finish selection');
      result.mobileSceneControls = controls;
      result.mobileSelectionRevealsScene = 'PASS';
      await page.screenshot({ path: `${outputDir}/${profile.id}-finish-selection-viewport.png` });
    }
    await paletteState(page, 'graphite-mineral', 'Graphite Mineral');
    const graphite = await captureFrame(page, `${profile.id}-living-graphite.png`);
    check(graphite.camera === warm.camera, 'Palette change moved the selected camera');
    check(graphite.sha256 !== warm.sha256, 'Two palette choices produced the same rendered image');
    result.frames.push(graphite);
    result.briefSha256 = await downloadBrief(page, profile.id, 'Graphite Mineral', 'Living room');
    await page.locator('.material-switcher').getByRole('button', { name: /Sandstone Warmth/ }).click();
    await paletteState(page, 'sandstone', 'Sandstone Warmth');
    result.thirdPalette = 'PASS';
    await page.locator('.material-switcher').getByRole('button', { name: /Warm Limestone/ }).click();
    await paletteState(page, 'warm-limestone', 'Warm Limestone');
    await views.getByRole('button', { name: '2. Pool terrace', exact: true }).click();
    await waitForView(page, 'pool');
    check(await living.getAttribute('aria-pressed') === 'false', 'Living view stays selected at pool');
    const pool = await captureFrame(page, `${profile.id}-pool-warm.png`);
    check(pool.camera !== warm.camera, 'Pool view did not move the rendered camera');
    result.frames.push(pool);
    const modes = page.locator('.viewer-mode-switch');
    await modes.getByRole('button', { name: 'Explore', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'explore');
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Explore keeps an authored-view highlight');
    await views.getByRole('button', { name: '2. Pool terrace', exact: true }).click();
    await waitForView(page, 'pool');
    await page.getByRole('group', { name: 'Estate destinations', exact: true }).getByRole('button').first().click();
    await page.waitForFunction(() => !!document.querySelector('.three-canvas')?.dataset.estateDestination);
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Estate destination keeps an authored-view highlight');
    await living.click();
    await waitForView(page, 'living');
    await page.getByRole('group', { name: 'Scene navigation', exact: true }).getByRole('button', { name: 'Drone flight', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'drone');
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Drone keeps an authored-view highlight');
    await living.click();
    await waitForView(page, 'living');
    await page.getByRole('button', { name: 'Exit walkthrough', exact: true }).click();
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Exit keeps an authored-view highlight');
    result.otherModesClearSelection = 'PASS';
    await compact.scrollIntoViewIfNeeded();
    result.layout = await containment(page);
    await compact.screenshot({ path: `${outputDir}/${profile.id}-controls.png` });
    await page.locator('.rooms-panel').getByRole('button', { name: /Master Bedroom/ }).click();
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Showcase highlights a different room');
    await page.locator('.rooms-panel').getByRole('button', { name: /Exterior overview/ }).click();
    await waitForClearedViewSelection(page);
    check(await views.locator('button[aria-pressed="true"]').count() === 0, 'Overview retains a selected showcase view');
    check(modelRequests === 1, `Model requested ${modelRequests} times instead of once`);
    result.modelRequests = modelRequests;
    result.status = 'PASS';
    await page.close();
  }
  // The smallest layout also verifies that the controls and actual local brief
  // survive an unavailable renderer; the intentional renderer errors are expected.
  const page = await browser.newPage({ viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const fallback = { id: 'fallback-320', expectedRendererErrors: [] };
  report.profiles.push(fallback);
  page.on('console', (message) => { if (message.type() === 'error') fallback.expectedRendererErrors.push(message.text()); });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#viewer .viewer-panel').scrollIntoViewIfNeeded();
  await page.locator('.scene-unavailable').waitFor();
  const compact = page.locator('#living-pool-showcase');
  await compact.getByRole('button', { name: '2. Pool terrace', exact: true }).click();
  await compact.getByRole('button', { name: 'Graphite Mineral', exact: true }).click();
  check(await page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ }).getAttribute('aria-pressed') === 'true', 'Fallback palette state is stale');
  fallback.briefSha256 = await downloadBrief(page, 'fallback-320', 'Graphite Mineral', 'Pool terrace');
  await compact.scrollIntoViewIfNeeded();
  fallback.layout = await containment(page);
  await compact.screenshot({ path: `${outputDir}/fallback-320-controls.png` });
  fallback.status = 'PASS';
  await page.close();
  check(report.consoleErrors.length === 0, `Unexpected console errors: ${report.consoleErrors.join(' | ')}`);
  check(report.pageErrors.length === 0, `Unexpected page errors: ${report.pageErrors.join(' | ')}`);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await writeFile(`${outputDir}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
}
console.log(`Living/pool showcase: ${report.status}`);
