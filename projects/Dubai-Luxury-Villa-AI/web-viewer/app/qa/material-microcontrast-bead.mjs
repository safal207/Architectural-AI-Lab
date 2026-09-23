import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { revealViewer } from './reveal-viewer.mjs';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-material-microcontrast-output';
await mkdir(outputDir, { recursive: true });

const STOPS = [
  { id: 'living', label: 'Living room', file: 'living.png', lightingProfile: 'interior-adapted' },
  { id: 'stair-upper', label: 'Upper landing', file: 'upper-landing.png', lightingProfile: 'landing-adapted' },
  { id: 'master', label: 'Master bedroom', file: 'master-bedroom.png', lightingProfile: 'interior-adapted' }
];

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

async function waitForMaterialResponse(page) {
  await page.waitForFunction(() => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.materialResponseProfile === 'family-microcontrast-v1'
      && Number(dataset?.materialResponseCount ?? 0) >= 4
      && Number(dataset?.materialFamilyCount ?? 0) === 4
      && canvas?.dataset.qaCapture === 'preserved';
  }, undefined, { timeout: 120_000 });
}

async function captureCanvas(page, path) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const dataUrl = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  check(dataUrl.startsWith('data:image/png;base64,'), 'Material bead canvas did not return PNG evidence');
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  check(bytes.length > 10_000, `Material bead evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
  return bytes.length;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  materialMode: null,
  materialResponseProfile: null,
  materialResponseCount: 0,
  materialFamilyCount: 0,
  frames: [],
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

  for (const stop of STOPS) {
    await fastClick(tour.locator('.client-graph li').filter({ hasText: stop.label }).getByRole('button'));
    await page.waitForFunction((stopId) => {
      const dataset = document.querySelector('.three-canvas')?.dataset;
      return dataset?.tourStop === stopId && dataset?.viewMode === 'first-person';
    }, stop.id, { timeout: 120_000 });
    await waitForModel(page);
    await waitForMaterialResponse(page);

    const canvas = page.locator('.three-canvas');
    const frame = {
      stop: stop.id,
      lightingProfile: await canvas.getAttribute('data-lighting-profile'),
      materialMode: await canvas.getAttribute('data-material-mode'),
      materialResponseProfile: await canvas.getAttribute('data-material-response-profile'),
      materialResponseCount: Number(await canvas.getAttribute('data-material-response-count') ?? 0),
      materialFamilyCount: Number(await canvas.getAttribute('data-material-family-count') ?? 0),
      walkGraph: await canvas.getAttribute('data-walk-graph'),
      evidenceBytes: 0
    };

    check(frame.walkGraph === 'ready', `${stop.id}: walk graph is ${frame.walkGraph}`);
    check(frame.lightingProfile === stop.lightingProfile, `${stop.id}: expected ${stop.lightingProfile}, got ${frame.lightingProfile}`);
    check(frame.materialResponseProfile === 'family-microcontrast-v1', `${stop.id}: material response missing`);
    check(frame.materialResponseCount >= 4, `${stop.id}: too few tuned materials (${frame.materialResponseCount})`);
    check(frame.materialFamilyCount === 4, `${stop.id}: expected 4 material families, got ${frame.materialFamilyCount}`);

    frame.evidenceBytes = await captureCanvas(page, `${outputDir}/${stop.file}`);
    report.frames.push(frame);
  }

  const canvas = page.locator('.three-canvas');
  report.materialMode = await canvas.getAttribute('data-material-mode');
  report.materialResponseProfile = await canvas.getAttribute('data-material-response-profile');
  report.materialResponseCount = Number(await canvas.getAttribute('data-material-response-count') ?? 0);
  report.materialFamilyCount = Number(await canvas.getAttribute('data-material-family-count') ?? 0);

  check(report.materialMode === 'warm-limestone', `Unexpected default material mode: ${report.materialMode}`);
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
