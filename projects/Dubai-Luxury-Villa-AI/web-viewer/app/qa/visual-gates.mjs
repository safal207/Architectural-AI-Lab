import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-visual-gates-output';
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

async function waitForStop(page, stopId) {
  await page.waitForFunction(
    (id) => document.querySelector('.three-canvas')?.dataset.tourStop === id,
    stopId,
    { timeout: 120_000 }
  );
  await waitForModel(page);
  await page.waitForTimeout(350);
}

async function selectRouteStop(page, title, stopId) {
  const tour = page.locator('.tour-experience');
  const stop = tour.locator('.client-graph li').filter({ hasText: title }).getByRole('button');
  await stop.click();
  await waitForStop(page, stopId);
}

async function captureViewer(page, name) {
  const viewer = page.locator('.viewer-panel');
  await viewer.scrollIntoViewIfNeeded();
  await viewer.screenshot({ path: `${outputDir}/${name}.png` });
}

async function capturePlan(page, name) {
  const plan = page.locator('.house-plan-card');
  await plan.scrollIntoViewIfNeeded();
  await plan.screenshot({ path: `${outputDir}/${name}.png` });
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  url: baseUrl,
  captures: [],
  consoleErrors: [],
  pageErrors: []
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(page);

  await captureViewer(page, '01-exterior-overview');
  report.captures.push('01-exterior-overview');

  const tour = page.locator('.tour-experience');
  const enter = tour.getByRole('button', { name: 'Enter the house', exact: true });
  await enter.click({ force: true });
  await waitForStop(page, 'entry');
  await captureViewer(page, '02-entry');
  report.captures.push('02-entry');

  const stops = [
    ['Living room', 'living', '03-living'],
    ['Kitchen + dining', 'dining', '04-dining'],
    ['Stair hall', 'stair-ground', '05-stair-ground'],
    ['Upper landing', 'stair-upper', '06-upper-landing'],
    ['Master bedroom', 'master', '07-master-bedroom'],
    ['Pool terrace', 'pool', '08-pool-terrace']
  ];

  for (const [title, stopId, fileName] of stops) {
    await selectRouteStop(page, title, stopId);
    await captureViewer(page, fileName);
    report.captures.push(fileName);
  }

  const floor1 = tour.locator('.floor-switch').getByRole('button', { name: 'Floor 1', exact: true });
  await floor1.click();
  await capturePlan(page, '09-floor-1-plan');
  report.captures.push('09-floor-1-plan');

  const floor2 = tour.locator('.floor-switch').getByRole('button', { name: 'Floor 2', exact: true });
  await floor2.click();
  await capturePlan(page, '10-floor-2-plan');
  report.captures.push('10-floor-2-plan');

  check(report.consoleErrors.length === 0, `Console errors: ${report.consoleErrors.join(' | ')}`);
  check(report.pageErrors.length === 0, `Page errors: ${report.pageErrors.join(' | ')}`);
  check(report.captures.length === 10, `Expected 10 captures, received ${report.captures.length}`);

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
