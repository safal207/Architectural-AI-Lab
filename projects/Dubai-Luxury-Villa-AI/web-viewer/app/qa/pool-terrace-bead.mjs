import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-pool-terrace-bead-output';
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

async function waitForPoolState(page) {
  await page.waitForFunction(() => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.tourStop === 'pool'
      && dataset?.viewMode === 'first-person'
      && dataset?.lightingMode === 'Day'
      && dataset?.lightingProfile === 'global'
      && dataset?.materialResponseProfile === 'family-microcontrast-v1'
      && Number(dataset?.materialResponseCount ?? 0) >= 4
      && Number(dataset?.materialFamilyCount ?? 0) === 4
      && dataset?.walkGraph === 'ready'
      && dataset?.lightEngine === 'runtime-only'
      && dataset?.modelState === 'loaded'
      && canvas?.dataset.qaCapture === 'preserved';
  }, undefined, { timeout: 120_000 });
}

async function captureCanvas(page, path) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const dataUrl = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  check(dataUrl.startsWith('data:image/png;base64,'), 'Pool Terrace canvas did not return PNG evidence');
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  check(bytes.length > 10_000, `Pool Terrace evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
  return bytes.length;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  stop: 'pool',
  lightingMode: null,
  lightingProfile: null,
  materialMode: null,
  materialResponseProfile: null,
  materialResponseCount: 0,
  materialFamilyCount: 0,
  walkGraph: null,
  lightEngine: null,
  importedLights: 0,
  evidenceBytes: 0,
  consoleErrors: [],
  pageErrors: []
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));

  const captureUrl = new URL(baseUrl);
  captureUrl.searchParams.set('qaCapture', '1');
  captureUrl.searchParams.set('lighting', 'day');
  await page.goto(captureUrl.toString(), { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(page);

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');
  await waitForModel(page);

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Pool terrace' }).getByRole('button'));
  await waitForPoolState(page);

  const canvas = page.locator('.three-canvas');
  report.lightingMode = await canvas.getAttribute('data-lighting-mode');
  report.lightingProfile = await canvas.getAttribute('data-lighting-profile');
  report.materialMode = await canvas.getAttribute('data-material-mode');
  report.materialResponseProfile = await canvas.getAttribute('data-material-response-profile');
  report.materialResponseCount = Number(await canvas.getAttribute('data-material-response-count') ?? 0);
  report.materialFamilyCount = Number(await canvas.getAttribute('data-material-family-count') ?? 0);
  report.walkGraph = await canvas.getAttribute('data-walk-graph');
  report.lightEngine = await canvas.getAttribute('data-light-engine');
  report.importedLights = Number(await canvas.getAttribute('data-imported-light-count') ?? 0);

  check(report.lightingMode === 'Day', `Unexpected lighting mode: ${report.lightingMode}`);
  check(report.lightingProfile === 'global', `Unexpected Pool Terrace lighting profile: ${report.lightingProfile}`);
  check(report.materialMode === 'warm-limestone', `Unexpected material mode: ${report.materialMode}`);
  check(report.materialResponseProfile === 'family-microcontrast-v1', `Unexpected material response: ${report.materialResponseProfile}`);
  check(report.materialFamilyCount === 4, `Expected 4 material families, found ${report.materialFamilyCount}`);
  check(report.walkGraph === 'ready', `Walk graph is ${report.walkGraph}`);
  check(report.lightEngine === 'runtime-only', `Unexpected light engine: ${report.lightEngine}`);
  check(report.importedLights === 0, `Imported GLB lights leaked into browser (${report.importedLights})`);

  report.evidenceBytes = await captureCanvas(page, `${outputDir}/pool-terrace-day.png`);
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
