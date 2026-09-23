import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { revealViewer } from './reveal-viewer.mjs';

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

async function captureCanvas(page, path) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const dataUrl = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  check(dataUrl.startsWith('data:image/png;base64,'), 'Upper Landing canvas did not return PNG evidence');
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  check(bytes.length > 10_000, `Upper Landing evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
  return bytes.length;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  stop: 'stair-upper',
  lighting: null,
  lightingProfile: null,
  material: null,
  materialResponseProfile: null,
  materialResponseCount: 0,
  materialFamilyCount: 0,
  lightEngine: null,
  importedLights: 0,
  interiorLights: 0,
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
  await page.goto(captureUrl.toString(), { waitUntil: 'networkidle', timeout: 120_000 });
  await revealViewer(page);
  await waitForModel(page);

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');
  await waitForModel(page);

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Upper landing' }).getByRole('button'));
  await page.waitForFunction(() => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.tourStop === 'stair-upper'
      && dataset?.viewMode === 'first-person'
      && dataset?.modelState === 'loaded'
      && canvas?.dataset.qaCapture === 'preserved';
  }, undefined, { timeout: 120_000 });
  await waitForModel(page);
  await page.locator('.first-person-hud').getByText(/Floor 2/i).waitFor();

  const canvas = page.locator('.three-canvas');
  report.lighting = await canvas.getAttribute('data-lighting-mode');
  report.lightingProfile = await canvas.getAttribute('data-lighting-profile');
  report.material = await canvas.getAttribute('data-material-mode');
  report.materialResponseProfile = await canvas.getAttribute('data-material-response-profile');
  report.materialResponseCount = Number(await canvas.getAttribute('data-material-response-count') ?? 0);
  report.materialFamilyCount = Number(await canvas.getAttribute('data-material-family-count') ?? 0);
  report.walkGraph = await canvas.getAttribute('data-walk-graph');
  report.lightEngine = await canvas.getAttribute('data-light-engine');
  report.importedLights = Number(await canvas.getAttribute('data-imported-light-count') ?? 0);
  report.interiorLights = Number(await canvas.getAttribute('data-interior-light-count') ?? 0);

  check(report.walkGraph === 'ready', `Walk graph is ${report.walkGraph}`);
  check(report.lightEngine === 'runtime-only', `Unexpected light engine: ${report.lightEngine}`);
  check(report.lightingProfile === 'landing-adapted', `Unexpected lighting profile: ${report.lightingProfile}`);
  check(report.materialResponseProfile === 'family-microcontrast-v1', `Unexpected material response: ${report.materialResponseProfile}`);
  check(report.materialResponseCount >= 4, `Too few runtime material responses: ${report.materialResponseCount}`);
  check(report.materialFamilyCount === 4, `Expected 4 material families, found ${report.materialFamilyCount}`);
  check(report.interiorLights >= 5, `Runtime interior light layer is incomplete: ${report.interiorLights}`);
  check(report.importedLights === 0, `Imported GLB punctual lights leaked into browser: ${report.importedLights}`);

  report.evidenceBytes = await captureCanvas(page, `${outputDir}/upper-landing.png`);

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
