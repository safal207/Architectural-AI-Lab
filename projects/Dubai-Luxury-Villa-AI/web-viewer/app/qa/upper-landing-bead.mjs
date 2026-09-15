import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-upper-landing-bead-output';
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

async function captureClip(page, locator, path) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const box = await locator.boundingBox();
  check(box && box.width > 1 && box.height > 1, 'Upper Landing viewer has no usable bounding box');
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: box.width,
      height: box.height
    },
    timeout: 60_000
  });
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  stop: 'stair-upper',
  lighting: null,
  material: null,
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

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');
  await waitForModel(page);

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button'));
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.tourStop === 'stair-upper' && canvas?.dataset.viewMode === 'first-person';
  });
  await waitForModel(page);
  await page.locator('.first-person-hud').getByText(/Floor 2/i).waitFor();

  const canvas = page.locator('.three-canvas');
  report.lighting = await canvas.getAttribute('data-lighting-mode');
  report.material = await canvas.getAttribute('data-material-mode');
  report.walkGraph = await canvas.getAttribute('data-walk-graph');

  await captureClip(page, page.locator('.viewer-panel'), `${outputDir}/upper-landing.png`);

  check(report.walkGraph === 'ready', `Walk graph is ${report.walkGraph}`);
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
