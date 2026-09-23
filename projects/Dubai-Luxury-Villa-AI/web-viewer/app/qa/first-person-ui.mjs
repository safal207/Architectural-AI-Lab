import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { revealViewer } from './reveal-viewer.mjs';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-first-person-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function boxesOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x
    || b.x + b.width <= a.x
    || a.y + a.height <= b.y
    || b.y + b.height <= a.y
  );
}

async function fastClick(locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((element) => element.click());
}

async function waitForModel(page) {
  await page.locator('.three-canvas canvas').waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded',
    undefined,
    { timeout: 120_000 }
  );
}

async function waitForMode(page, mode) {
  await page.waitForFunction(
    (expected) => document.querySelector('.three-canvas')?.dataset.interactionMode === expected,
    mode,
    { timeout: 30_000 }
  );
}

async function assertPersistentRuntime(page, label) {
  const canvas = page.locator('.three-canvas');
  check(
    await canvas.getAttribute('data-viewer-runtime') === 'persistent-scene-v2',
    `${label}: persistent runtime v2 profile missing`
  );
  check(
    Number(await canvas.getAttribute('data-model-load-count')) === 1,
    `${label}: villa model loaded more than once`
  );
  check(
    await canvas.getAttribute('data-navigation-anchor-mode') === 'guided-presentation-explore-anchor-v2',
    `${label}: Guided/Explore camera boundary missing`
  );
}

async function enterHouse(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person'
      && canvas?.dataset.tourStop === 'entry'
      && canvas?.dataset.interactionMode === 'guided';
  });
  await waitForModel(page);
  check(
    await page.locator('.three-canvas').getAttribute('data-walk-graph') === 'ready',
    'Walk graph was not built from the promoted GLB anchors'
  );
  await assertPersistentRuntime(page, 'entry');
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  evidenceMode: 'interaction-json-only',
  desktop: {},
  mobile: {},
  consoleErrors: [],
  pageErrors: []
};

function observe(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
}

try {
  let desktopModelRequests = 0;
  const desktop = await browser.newPage({ viewport: { width: 960, height: 700 } });
  observe(desktop);
  // Embedded browsers can deny pointer lock. Explore must remain usable there.
  await desktop.addInitScript(() => {
    window.pointerLockAttempts = 0;
    Element.prototype.requestPointerLock = () => {
      window.pointerLockAttempts += 1;
      return Promise.reject(new DOMException('Pointer lock unavailable', 'NotAllowedError'));
    };
  });
  desktop.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/villa.glb')) desktopModelRequests += 1;
  });

  await desktop.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await revealViewer(desktop);
  await waitForModel(desktop);
  await enterHouse(desktop);

  const guidedControls = desktop.locator('.viewer-guided-controls');
  const modeSwitch = desktop.locator('.viewer-mode-switch');
  await guidedControls.waitFor({ state: 'visible' });
  await modeSwitch.waitFor({ state: 'visible' });
  check(
    await guidedControls.getByRole('button', { name: 'Next stop' }).isVisible(),
    'Desktop Guided Next control is hidden'
  );
  check(
    await modeSwitch.getByRole('button', { name: 'Explore' }).isVisible(),
    'Desktop Explore mode button is hidden'
  );
  check(
    await desktop.getByRole('button', { name: 'Exit walkthrough' }).isVisible(),
    'Desktop Exit control is hidden'
  );
  check(
    await desktop.locator('.walkthrough-onboarding').count() === 0,
    'Guided mode should not cover the hero frame with Explore onboarding'
  );

  await fastClick(modeSwitch.getByRole('button', { name: 'Explore' }));
  await waitForMode(desktop, 'explore');
  await desktop.locator('.walkthrough-onboarding').waitFor({ state: 'visible' });
  check(
    await guidedControls.isHidden(),
    'Guided Prev/Next controls should hide while desktop Explore is active'
  );
  await assertPersistentRuntime(desktop, 'desktop explore');

  const canvasElement = desktop.locator('.three-canvas canvas');
  const cameraState = () => desktop.locator('.three-canvas').evaluate((element) => ({
    position: element.dataset.cameraPosition.split(',').map(Number),
    direction: element.dataset.cameraDirection.split(',').map(Number)
  }));
  const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
  await canvasElement.scrollIntoViewIfNeeded();
  const canvasBox = await canvasElement.boundingBox();
  const x = canvasBox.x + canvasBox.width * 0.5;
  const y = canvasBox.y + canvasBox.height * 0.4;
  const beforeDrag = await cameraState();
  await desktop.mouse.move(x, y);
  await desktop.mouse.down();
  await desktop.mouse.move(x - 90, y + 12, { steps: 8 });
  await desktop.mouse.up();
  await desktop.waitForFunction((before) => {
    const values = document.querySelector('.three-canvas').dataset.cameraDirection.split(',').map(Number);
    return Math.hypot(...values.map((value, index) => value - before[index])) > 0.05;
  }, beforeDrag.direction);
  const beforeWalk = await cameraState();
  check(Math.abs(beforeWalk.direction[1] - beforeDrag.direction[1]) < 0.2,
    'Small vertical drag unexpectedly flipped the camera pitch');
  await desktop.keyboard.down('w');
  try {
    await desktop.waitForFunction((before) => {
      const values = document.querySelector('.three-canvas').dataset.cameraPosition.split(',').map(Number);
      return Math.hypot(...values.map((value, index) => value - before[index])) > 0.08;
    }, beforeWalk.position, { timeout: 10_000 });
  } finally {
    await desktop.keyboard.up('w');
  }
  const afterWalk = await cameraState();
  await desktop.keyboard.down('ArrowUp');
  await desktop.keyboard.press('Escape');
  const paused = await cameraState();
  await desktop.waitForTimeout(250);
  check(distance(paused.position, (await cameraState()).position) < 0.01, 'Escape left movement active');
  await desktop.keyboard.up('ArrowUp');
  check(await canvasElement.evaluate((element) => element !== document.activeElement), 'Escape did not release canvas focus');
  await desktop.locator('.walkthrough-onboarding').waitFor({ state: 'visible' });
  await canvasElement.click({ position: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.4 } });
  await desktop.keyboard.down('w');
  const notes = desktop.getByRole('textbox', { name: 'What do you have in mind? Optional', exact: true });
  await notes.focus();
  const beforeTyping = await cameraState();
  await desktop.keyboard.type('wasd');
  await desktop.keyboard.up('w');
  await desktop.waitForTimeout(250);
  check(distance(beforeTyping.position, (await cameraState()).position) < 0.01, 'Form focus left walking active');
  check(await notes.inputValue() === 'wasd', 'Explore intercepted form typing');
  check(await desktop.evaluate(() => window.pointerLockAttempts === 0 && !document.pointerLockElement), 'Explore still depends on pointer lock');
  report.desktop.dragAndWalk = { beforeDrag, beforeWalk, afterWalk, status: 'PASS' };
  report.desktop.pauseAndFormFocus = 'PASS';

  await fastClick(modeSwitch.getByRole('button', { name: 'Guided' }));
  await waitForMode(desktop, 'guided');
  await guidedControls.waitFor({ state: 'visible' });
  check(
    await desktop.locator('.walkthrough-onboarding').count() === 0,
    'Explore onboarding remained visible after returning to Guided'
  );
  await assertPersistentRuntime(desktop, 'desktop guided return');

  const tour = desktop.locator('.tour-experience');
  for (const stop of ['Kitchen + dining', 'Stair hall', 'Upper landing', 'Master bedroom', 'Pool terrace']) {
    await fastClick(tour.locator('.client-graph li').filter({ hasText: stop }).getByRole('button'));
    await desktop.waitForTimeout(80);
    await waitForMode(desktop, 'guided');
    await assertPersistentRuntime(desktop, `desktop ${stop}`);
  }
  await desktop.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'pool');

  check(
    desktopModelRequests === 1,
    `Desktop requested villa.glb ${desktopModelRequests} times instead of once`
  );
  report.desktop.entry = 'PASS';
  report.desktop.walkGraph = 'PASS';
  report.desktop.guidedMode = 'PASS';
  report.desktop.exploreMode = 'PASS';
  report.desktop.modeReturn = 'PASS';
  report.desktop.stairTransition = 'PASS';
  report.desktop.poolGuided = 'PASS';
  report.desktop.persistentScene = 'PASS';
  report.desktop.modelRequests = desktopModelRequests;

  await desktop.close();

  let mobileModelRequests = 0;
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  observe(mobile);
  mobile.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/villa.glb')) mobileModelRequests += 1;
  });

  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await revealViewer(mobile);
  await waitForModel(mobile);
  await enterHouse(mobile);

  const pad = mobile.locator('.touch-walk-pad');
  const mobileGuided = mobile.locator('.viewer-guided-controls');
  const mobileModes = mobile.locator('.viewer-mode-switch');
  await mobileGuided.waitFor({ state: 'visible' });
  await mobileModes.waitFor({ state: 'visible' });
  check(
    await pad.count() === 0,
    'Movement pad should stay hidden in clean mobile Guided mode'
  );
  check(
    await mobile.getByRole('button', { name: 'Exit walkthrough' }).isVisible(),
    'Mobile Exit control is hidden'
  );

  const guidedBox = await mobileGuided.boundingBox();
  const guidedModeBox = await mobileModes.boundingBox();
  check(
    !boxesOverlap(guidedBox, guidedModeBox),
    'Mobile Guided mode switch overlaps Prev/Next controls'
  );

  await fastClick(mobileModes.getByRole('button', { name: 'Explore' }));
  await waitForMode(mobile, 'explore');
  await pad.waitFor({ state: 'visible' });
  check(
    await pad.getByRole('button', { name: 'Walk forward' }).isVisible(),
    'Forward touch control is hidden in Explore'
  );
  check(
    await pad.getByRole('button', { name: 'Step left' }).isVisible(),
    'Left touch control is hidden in Explore'
  );
  check(
    await mobileGuided.isHidden(),
    'Guided Prev/Next controls should hide while mobile Explore is active'
  );

  const padBox = await pad.boundingBox();
  const exploreModeBox = await mobileModes.boundingBox();
  check(
    !boxesOverlap(padBox, exploreModeBox),
    'Mobile movement pad overlaps Guided/Explore switch'
  );
  await assertPersistentRuntime(mobile, 'mobile explore');

  await fastClick(mobileModes.getByRole('button', { name: 'Guided' }));
  await waitForMode(mobile, 'guided');
  await mobileGuided.waitFor({ state: 'visible' });
  check(await pad.count() === 0, 'Mobile movement pad remained after returning to Guided');

  const mobileTour = mobile.locator('.tour-experience');
  await fastClick(
    mobileTour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button')
  );
  await mobile.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'stair-upper');
  await waitForMode(mobile, 'guided');
  await assertPersistentRuntime(mobile, 'mobile stair-upper');
  check(
    mobileModelRequests === 1,
    `Mobile requested villa.glb ${mobileModelRequests} times instead of once`
  );

  report.mobile.entry = 'PASS';
  report.mobile.guidedMode = 'PASS';
  report.mobile.exploreMode = 'PASS';
  report.mobile.touchControlsExploreOnly = 'PASS';
  report.mobile.noControlOverlap = 'PASS';
  report.mobile.controlBoxes = {
    guided: guidedBox,
    guidedModeSwitch: guidedModeBox,
    explorePad: padBox,
    exploreModeSwitch: exploreModeBox
  };
  report.mobile.persistentScene = 'PASS';
  report.mobile.modelRequests = mobileModelRequests;

  check(
    report.consoleErrors.length === 0,
    `Console errors: ${report.consoleErrors.join(' | ')}`
  );
  check(
    report.pageErrors.length === 0,
    `Page errors: ${report.pageErrors.join(' | ')}`
  );
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
