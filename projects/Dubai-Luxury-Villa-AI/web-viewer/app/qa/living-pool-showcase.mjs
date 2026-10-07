import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { revealViewer, revealDetails } from './reveal-viewer.mjs';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-living-pool-output';
await mkdir(outputDir, { recursive: true });
const report = {
  status: 'RUNNING', url: baseUrl,
  provenance: { head: process.env.VILLA_PR_HEAD_SHA ?? null, checkout: process.env.VILLA_CHECKOUT_SHA ?? null },
  evidence: 'Simplified production landing; reduced-motion static frames, not physical-device motion acceptance',
  profiles: [], consoleErrors: [], pageErrors: []
};
let browser;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function settledFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function closeDetails(page, selector) {
  const details = page.locator(selector);
  if (await details.evaluate((element) => element.open)) {
    await details.locator(':scope > summary').click();
    check(!await details.evaluate((element) => element.open), `${selector}: summary did not close the disclosure`);
  }
}

async function waitForModel(page) {
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', undefined, { timeout: 120_000 });
  await settledFrame(page);
}

async function waitForView(page, stop) {
  await page.locator('.three-canvas canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction((id) => {
    const state = document.querySelector('.three-canvas')?.dataset;
    return state?.modelState === 'loaded' && state?.tourStop === id
      && state?.renderedTourStop === id && !state?.estateDestination
      && state?.renderedInteractionMode === 'guided' && state?.walkGraph === 'ready';
  }, stop, { timeout: 120_000 });
  await settledFrame(page);
}

async function waitForClearedRoomSelection(page) {
  await page.waitForFunction(() => {
    const rooms = document.querySelector('.rooms-panel');
    return rooms && rooms.querySelectorAll('.room-selector button[aria-pressed="true"], .kitchen-shortcut[aria-pressed="true"]').length === 0;
  });
}

async function roomState(page, name) {
  const rooms = page.locator('.rooms-panel');
  const selected = rooms.locator('.room-selector button[aria-pressed="true"], .kitchen-shortcut[aria-pressed="true"]');
  check(await selected.count() === 1, `${name}: room selection is not mutually exclusive`);
  check((await selected.innerText()).startsWith(name), `${name}: room selector does not match the rendered space`);
}

async function paletteState(page, id, name) {
  // The viewer pauses rendering offscreen; reveal it before checking the actual frame.
  await page.locator('.three-canvas canvas').scrollIntoViewIfNeeded();
  await page.waitForFunction((expected) => {
    const state = document.querySelector('.three-canvas')?.dataset;
    return state?.materialMode === expected && state?.renderedMaterial === expected;
  }, id);
  const main = page.locator('.material-switcher');
  check(await main.count() === 1, 'The landing contains duplicate finish selectors');
  const selected = main.locator('button[aria-pressed="true"]');
  check(await selected.count() === 1, `${name}: finish selection is not mutually exclusive`);
  check(await main.getByRole('button', { name: new RegExp(name) }).getAttribute('aria-pressed') === 'true', `${name}: finish selector is stale`);
  check((await page.locator('.experience-status').innerText()).includes(`Material: ${name}`), `${name}: studio status is stale`);
}

async function downloadBrief(page, profile, name, space) {
  await revealDetails(page, '#brief-disclosure');
  await revealDetails(page, '.brief-optional-details');
  const note = `QA reference study — ${profile}`;
  await page.locator('#project-notes').fill(note);
  const pending = page.waitForEvent('download');
  await page.locator('#brief').getByRole('button', { name: 'Download my brief', exact: true }).click();
  const download = await pending;
  const path = `${outputDir}/${profile}-brief.txt`;
  await download.saveAs(path);
  check(await download.failure() === null, `${profile}: brief download failed`);
  const text = await readFile(path, 'utf8');
  check(text.includes(`Material direction: ${name}`), `${profile}: downloaded brief palette is stale`);
  check(text.includes(`Selected reference space: ${space}`), `${profile}: downloaded brief space is stale`);
  check(text.includes('Preferred atmosphere: Evening'), `${profile}: downloaded brief lighting is stale`);
  check(text.includes(note), `${profile}: downloaded brief omits the actual form notes`);
  await closeDetails(page, '.brief-optional-details');
  await closeDetails(page, '#brief-disclosure');
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

async function captureScreenshot(page, filename, locator = null, fullPage = false) {
  const path = `${outputDir}/${filename}`;
  if (locator) await locator.screenshot({ path });
  else await page.screenshot({ path, fullPage });
  const bytes = await readFile(path);
  return { file: filename, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

async function containment(page) {
  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth,
    sections: ['.sales-hero', '#spaces', '#viewer', '.rooms-panel', '#finish-details', '#scene-options', '#brief'].map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null; // Renderer failure removes its scene-options disclosure.
      const rect = element.getBoundingClientRect();
      const visible = element.checkVisibility() && getComputedStyle(element).visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      // The hero image deliberately extends through the hero's mobile side margins.
      // Measure its visible descendants against the document, rather than mistaking
      // this full-bleed image for an internally clipped section.
      const descendants = selector === '.sales-hero' ? [...element.querySelectorAll('*')].flatMap((child) => {
        const bounds = child.getBoundingClientRect();
        if (!child.checkVisibility() || getComputedStyle(child).visibility === 'hidden' || bounds.width === 0 || bounds.height === 0) return [];
        return [{ tag: child.tagName, className: child.className, left: bounds.left, right: bounds.right, width: bounds.width }];
      }) : [];
      return { selector, visible, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, left: rect.left, right: rect.right, descendants };
    }).filter(Boolean),
    roomButtons: [...document.querySelectorAll('.rooms-panel button')].map((button) => {
      const rect = button.getBoundingClientRect();
      return { label: button.textContent.trim(), width: rect.width, height: rect.height, left: rect.left, right: rect.right };
    })
  }));
  // Preserve measurements even when a subsequent assertion fails.
  report.layoutMeasurements ??= [];
  report.layoutMeasurements.push(layout);
  check(layout.documentScrollWidth <= layout.documentWidth + 1, `Horizontal document overflow: ${JSON.stringify(layout)}`);
  const invalidSections = layout.sections.filter((section) => section.visible && (
    section.left < -1 || section.right > layout.documentWidth + 1
    || (section.selector === '.sales-hero'
      ? section.descendants.some((child) => child.left < -1 || child.right > layout.documentWidth + 1)
      : section.scrollWidth > section.clientWidth + 1)
  ));
  check(invalidSections.length === 0, `A visible landing section clips internally or extends outside the viewport: ${JSON.stringify({ invalidSections, layout })}`);
  check(layout.roomButtons.every((button) => button.width >= 44 && button.height >= 44 && button.left >= 0 && button.right <= layout.documentWidth + 1), 'Room shortcuts are too small or outside the viewport');
  return layout;
}

async function defaultStructure(page) {
  check(await page.getByRole('navigation', { name: 'Main navigation', exact: true }).count() === 1, 'Missing or duplicate primary navigation');
  check(await page.locator('.project-chapters').count() === 0, 'The landing still contains a second chapter navigation');
  check(await page.locator('.material-switcher').count() === 1, 'The landing still duplicates finish selectors');
  check(await page.locator('.rooms-panel').count() === 1, 'The landing still duplicates room shortcuts');
  check(await page.locator('#living-pool-showcase').count() === 0, 'The duplicate living/pool comparison block is still mounted');
  for (const selector of ['#finish-details', '#scene-options', '#view-details', '#plan-disclosure', '#concept-disclosure', '#brief-disclosure', '.brief-optional-details', '#estate-actions-details', '#estate-finishes-details']) {
    check(await page.locator(selector).count() === 1, `${selector}: missing or duplicate disclosure`);
    check(!await page.locator(selector).evaluate((element) => element.open), `${selector}: should start closed`);
  }
  check(await page.locator('.lighting-control').count() === 1 && await page.locator('#finish-details .lighting-control').count() === 1, 'Lighting controls are missing or duplicated outside the finish disclosure');
  check(await page.getByRole('group', { name: 'Scene navigation', exact: true }).count() === 0, 'Advanced scene navigation is visible before opening its disclosure');
  check(await page.locator('.material-switcher').isHidden(), 'Finish controls are visible before opening the disclosure');
  check(await page.getByRole('heading', { name: 'Dubai residence.', exact: true }).count() === 1, 'The concise hero heading is missing');
  check(await page.getByRole('button', { name: 'Explore in 3D', exact: true }).isVisible(), 'The primary 3D action is missing');
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
    const result = { id: profile.id, frames: [], screenshots: [] };
    report.profiles.push(result);
    page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => report.pageErrors.push(String(error)));
    let modelRequests = 0;
    page.on('request', (request) => { if (new URL(request.url()).pathname.endsWith('/villa.glb')) modelRequests += 1; });
    const captureUrl = new URL(baseUrl);
    captureUrl.searchParams.set('qaCapture', '1');
    await page.goto(captureUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('.hero-image img').waitFor();
    await page.locator('.hero-image img').evaluate((img) => img.decode());
    await settledFrame(page);
    // The deferred viewer has not mounted yet, so its own details are checked after revealing it.
    check(!await page.locator('#finish-details').evaluate((element) => element.open), 'Finish disclosure starts open');
    check(!await page.locator('#brief-disclosure').evaluate((element) => element.open), 'Brief disclosure starts open');
    result.screenshots.push(await captureScreenshot(page, `${profile.id}-hero.png`));
    await revealViewer(page);
    await waitForModel(page);
    await defaultStructure(page);
    result.defaultDisclosures = 'PASS';
    result.layout = await containment(page);
    const rooms = page.locator('.rooms-panel');
    const living = rooms.getByRole('button', { name: /^Living Room/ });
    const poolButton = rooms.getByRole('button', { name: /^Pool Terrace/ });
    const master = rooms.getByRole('button', { name: /^Master Bedroom/ });
    await waitForClearedRoomSelection(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    result.screenshots.push(await captureScreenshot(page, `${profile.id}-landing-full.png`, null, true));
    const overviewCamera = await page.locator('.three-canvas').getAttribute('data-camera-position');
    await living.focus();
    await page.keyboard.press('Enter');
    await waitForView(page, 'living');
    await roomState(page, 'Living Room');
    check(await living.evaluate((button) => document.activeElement === button), 'Room selection loses keyboard focus');
    await revealDetails(page, '#finish-details');
    await paletteState(page, 'warm-limestone', 'Warm Limestone');
    const warm = await captureFrame(page, `${profile.id}-living-warm.png`);
    check(warm.camera !== overviewCamera, 'Living room did not move the rendered camera');
    result.frames.push(warm);
    const lighting = page.locator('#finish-details').getByRole('navigation', { name: 'Lighting mode', exact: true });
    await lighting.getByRole('button', { name: 'Day', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.lightingMode === 'Day');
    await settledFrame(page);
    check(await page.locator('.three-canvas').getAttribute('data-camera-position') === warm.camera, 'Lighting selection moved the camera');
    await lighting.getByRole('button', { name: 'Evening', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.lightingMode === 'Evening');
    await settledFrame(page);
    result.lightingDisclosure = 'PASS';
    const graphiteButton = page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ });
    await graphiteButton.focus();
    await page.keyboard.press('Enter');
    await paletteState(page, 'graphite-mineral', 'Graphite Mineral');
    check(await graphiteButton.evaluate((button) => document.activeElement === button), 'Finish selection loses keyboard focus');
    const graphite = await captureFrame(page, `${profile.id}-living-graphite.png`);
    check(graphite.camera === warm.camera, 'Palette change moved the selected camera');
    check(graphite.sha256 !== warm.sha256, 'Two palettes produced the same rendered image');
    result.frames.push(graphite);
    result.screenshots.push(await captureScreenshot(page, `${profile.id}-finish-controls.png`, page.locator('#finish-details')));
    result.briefSha256 = await downloadBrief(page, profile.id, 'Graphite Mineral', 'Living room');
    await revealDetails(page, '#finish-details');
    await page.locator('.material-switcher').getByRole('button', { name: /Sandstone Warmth/ }).click();
    await paletteState(page, 'sandstone', 'Sandstone Warmth');
    result.thirdPalette = 'PASS';
    await page.locator('.material-switcher').getByRole('button', { name: /Warm Limestone/ }).click();
    await paletteState(page, 'warm-limestone', 'Warm Limestone');
    await closeDetails(page, '#finish-details');
    await poolButton.click();
    await waitForView(page, 'pool');
    await roomState(page, 'Pool Terrace');
    check(await living.getAttribute('aria-pressed') === 'false', 'Living room remains selected at pool');
    const pool = await captureFrame(page, `${profile.id}-pool-warm.png`);
    check(pool.camera !== warm.camera, 'Pool view did not move the rendered camera');
    result.frames.push(pool);
    await page.locator('.viewer-mode-switch').getByRole('button', { name: 'Explore', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'explore');
    await waitForClearedRoomSelection(page);
    await poolButton.click();
    await waitForView(page, 'pool');
    // The bathroom is the only estate shortcut visible before expanding scene options.
    const bathroom = page.getByRole('button', { name: 'Bathroom + shower', exact: true });
    check(await bathroom.count() === 1 && await bathroom.isVisible(), 'Bathroom shortcut is missing or duplicated');
    await bathroom.click();
    await page.waitForFunction(() => !!document.querySelector('.three-canvas')?.dataset.estateDestination);
    await waitForClearedRoomSelection(page);
    await living.click();
    await waitForView(page, 'living');
    await roomState(page, 'Living Room');
    await revealDetails(page, '#scene-options');
    await page.getByRole('group', { name: 'Estate destinations', exact: true }).getByRole('button', { name: 'Whole estate', exact: true }).click();
    await page.waitForFunction(() => !!document.querySelector('.three-canvas')?.dataset.estateDestination);
    await waitForClearedRoomSelection(page);
    await master.click();
    await waitForView(page, 'master');
    await roomState(page, 'Master Bedroom');
    await page.getByRole('group', { name: 'Scene navigation', exact: true }).getByRole('button', { name: 'Drone flight', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'drone');
    await waitForClearedRoomSelection(page);
    await living.click();
    await waitForView(page, 'living');
    await roomState(page, 'Living Room');
    await page.getByRole('button', { name: 'Exit walkthrough', exact: true }).click();
    await waitForClearedRoomSelection(page);
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
    await master.click();
    await waitForView(page, 'master');
    await roomState(page, 'Master Bedroom');
    await rooms.getByRole('button', { name: /Exterior overview/ }).click();
    await waitForClearedRoomSelection(page);
    await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
    result.otherModesClearSelection = 'PASS';
    await closeDetails(page, '#scene-options');
    await living.click();
    await waitForView(page, 'living');
    result.layoutAfterInteractions = await containment(page);
    result.screenshots.push(await captureScreenshot(page, `${profile.id}-studio.png`, page.locator('#viewer')));
    result.screenshots.push(await captureScreenshot(page, `${profile.id}-controls.png`, rooms));
    check(modelRequests === 1, `Model requested ${modelRequests} times instead of once`);
    check(await page.locator('.three-canvas').getAttribute('data-model-load-count') === '1', 'Runtime loaded the model more than once');
    result.modelRequests = modelRequests;
    result.status = 'PASS';
    await page.close();
  }
  // Real disclosures and the actual local brief remain usable if WebGL is unavailable.
  const page = await browser.newPage({ viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const fallback = { id: 'fallback-320', expectedRendererErrors: [], screenshots: [] };
  report.profiles.push(fallback);
  page.on('console', (message) => { if (message.type() === 'error') fallback.expectedRendererErrors.push(message.text()); });
  page.on('pageerror', (error) => fallback.expectedRendererErrors.push(String(error)));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await revealViewer(page);
  await page.locator('.scene-unavailable').waitFor();
  await page.locator('.rooms-panel').getByRole('button', { name: /^Pool Terrace/ }).click();
  await waitForClearedRoomSelection(page);
  await revealDetails(page, '#finish-details');
  await page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ }).click();
  check(await page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ }).getAttribute('aria-pressed') === 'true', 'Fallback palette state is stale');
  fallback.briefSha256 = await downloadBrief(page, 'fallback-320', 'Graphite Mineral', 'Pool terrace');
  await closeDetails(page, '#finish-details');
  fallback.layout = await containment(page);
  fallback.screenshots.push(await captureScreenshot(page, 'fallback-320-studio.png', page.locator('#viewer')));
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
console.log(`Simplified residence landing: ${report.status}`);
