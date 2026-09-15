import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-first-person-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForModel(page) {
  await page.locator('.three-canvas canvas').waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded',
    undefined,
    { timeout: 120_000 }
  );
}

async function enterHouse(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  await tour.getByRole('button', { name: 'Enter the house', exact: true }).click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person' && canvas?.dataset.tourStop === 'entry';
  });
  await waitForModel(page);
  check(await page.locator('.three-canvas').getAttribute('data-walk-graph') === 'ready', 'Walk graph was not built from the promoted GLB anchors');
}

const browser = await chromium.launch({ headless: true });
const report = { status: 'RUNNING', desktop: {}, mobile: {}, consoleErrors: [], pageErrors: [] };

function observe(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  observe(desktop);
  await desktop.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(desktop);
  await enterHouse(desktop);

  const tour = desktop.locator('.tour-experience');
  await tour.locator('.client-graph li').filter({ hasText: 'Kitchen + dining' }).getByRole('button').click();
  await desktop.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'dining');
  await tour.locator('.client-graph li').filter({ hasText: 'Stair hall' }).getByRole('button').click();
  await desktop.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'stair-ground');
  await tour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button').click();
  await desktop.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'stair-upper');
  await desktop.locator('.first-person-hud').getByText(/Floor 2/i).waitFor();
  await desktop.screenshot({ path: `${outputDir}/desktop-first-person.png`, fullPage: true });
  report.desktop.entry = 'PASS';
  report.desktop.walkGraph = 'PASS';
  report.desktop.stairTransition = 'PASS';

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  observe(mobile);
  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(mobile);
  await enterHouse(mobile);
  const pad = mobile.locator('.touch-walk-pad');
  await pad.waitFor({ state: 'visible' });
  check(await pad.getByRole('button', { name: 'Walk forward' }).isVisible(), 'Forward touch control is hidden');
  check(await pad.getByRole('button', { name: 'Step left' }).isVisible(), 'Left touch control is hidden');
  await mobile.screenshot({ path: `${outputDir}/mobile-first-person.png`, fullPage: true });
  report.mobile.entry = 'PASS';
  report.mobile.touchControls = 'PASS';

  check(report.consoleErrors.length === 0, `Console errors: ${report.consoleErrors.join(' | ')}`);
  check(report.pageErrors.length === 0, `Page errors: ${report.pageErrors.join(' | ')}`);
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
