import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-floor-plan-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
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

async function openFloorTwo(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  const floorTwo = tour.locator('.floor-switch').getByRole('button', { name: 'Floor 2', exact: true });
  await fastClick(floorTwo);
  await page.waitForFunction(() => document.querySelector('.floor-switch button[aria-pressed="true"]')?.textContent?.trim() === 'Floor 2');
  await tour.locator('.house-plan__zone').filter({ hasText: 'Master Bedroom' }).waitFor();
  return tour;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  desktop: {},
  mobile: {},
  consoleErrors: [],
  pageErrors: [],
  failedResponses: []
};

function observe(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) report.failedResponses.push({ status: response.status(), url: response.url() });
  });
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  observe(desktop);
  await desktop.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(desktop);
  const tour = await openFloorTwo(desktop);

  check(await tour.locator('.house-plan__window').count() >= 2, 'Floor 2 plan is missing window markers');
  check(await tour.locator('.house-plan__fixture--bed').count() === 1, 'Floor 2 plan is missing master bed footprint');
  check(await tour.locator('.house-plan__portal').count() >= 1, 'Floor 2 plan is missing door marker');
  check(await tour.locator('.house-plan__light').count() >= 2, 'Floor 2 plan is missing light points');

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button'));
  await tour.locator('.house-plan__position').waitFor({ state: 'visible' });
  await desktop.screenshot({ path: `${outputDir}/floor-2-plan.png`, fullPage: true, timeout: 120_000 });
  report.desktop.plan = 'PASS';
  report.desktop.positionMarker = 'PASS';

  await fastClick(tour.locator('.plan-mode-switch').getByRole('button', { name: 'DOLLHOUSE', exact: true }));
  check(await tour.locator('.house-plan').getAttribute('class').then((value) => value.includes('house-plan--dollhouse')), 'Dollhouse mode class was not applied');
  await desktop.screenshot({ path: `${outputDir}/floor-2-dollhouse.png`, fullPage: true, timeout: 120_000 });
  report.desktop.dollhouse = 'PASS';

  await fastClick(tour.locator('.plan-mode-switch').getByRole('button', { name: 'WALK', exact: true }));
  await desktop.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person' && canvas?.dataset.tourStop === 'stair-upper';
  });
  await waitForModel(desktop);
  await desktop.screenshot({ path: `${outputDir}/upper-landing-walk.png`, fullPage: true, timeout: 120_000 });
  report.desktop.upperLandingWalk = 'PASS';

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  observe(mobile);
  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(mobile);
  const mobileTour = await openFloorTwo(mobile);
  await fastClick(mobileTour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button'));
  await mobileTour.locator('.house-plan__position').waitFor({ state: 'visible' });

  const overflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  check(overflow.scrollWidth <= overflow.clientWidth + 1, `Mobile horizontal overflow: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`);

  const planBox = await mobileTour.locator('.house-plan').boundingBox();
  check(planBox && planBox.width >= 320 && planBox.height >= 360, 'Mobile plan is too small for navigation');
  await mobileTour.locator('.house-plan-card--hero').screenshot({ path: `${outputDir}/mobile-floor-2-plan.png`, timeout: 120_000, animations: 'disabled' });
  report.mobile.plan = 'PASS';
  report.mobile.noHorizontalOverflow = 'PASS';

  check(report.consoleErrors.length === 0, `Console errors: ${report.consoleErrors.join(' | ')}`);
  check(report.pageErrors.length === 0, `Page errors: ${report.pageErrors.join(' | ')}`);
  check(report.failedResponses.length === 0, `HTTP failures: ${JSON.stringify(report.failedResponses)}`);
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
