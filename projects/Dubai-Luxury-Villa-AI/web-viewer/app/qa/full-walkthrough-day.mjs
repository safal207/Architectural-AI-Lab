import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { revealViewer } from './reveal-viewer.mjs';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-full-walkthrough-day-output';
await mkdir(outputDir, { recursive: true });

const STOPS = [
  { id: 'entry', label: 'Main entry', file: '01-entry.png', lightingProfile: 'interior-adapted' },
  { id: 'living', label: 'Living room', file: '02-living.png', lightingProfile: 'interior-adapted' },
  { id: 'dining', label: 'Kitchen + dining', file: '03-dining.png', lightingProfile: 'interior-adapted' },
  { id: 'stair-ground', label: 'Stair hall', file: '04-stair-ground.png', lightingProfile: 'interior-adapted' },
  { id: 'stair-upper', label: 'Upper landing', file: '05-upper-landing.png', lightingProfile: 'landing-adapted' },
  { id: 'master', label: 'Master bedroom', file: '06-master-bedroom.png', lightingProfile: 'interior-adapted' },
  { id: 'pool', label: 'Pool terrace', file: '07-pool-terrace.png', lightingProfile: 'global' }
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

async function waitForStop(page, stop) {
  await page.waitForFunction((expected) => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.tourStop === expected.id
      && dataset?.viewMode === 'first-person'
      && dataset?.lightingMode === 'Day'
      && dataset?.lightingProfile === expected.lightingProfile
      && dataset?.materialResponseProfile === 'family-microcontrast-v1'
      && Number(dataset?.materialResponseCount ?? 0) >= 4
      && Number(dataset?.materialFamilyCount ?? 0) === 4
      && dataset?.walkGraph === 'ready'
      && dataset?.lightEngine === 'runtime-only'
      && dataset?.modelState === 'loaded'
      && canvas?.dataset.qaCapture === 'preserved';
  }, stop, { timeout: 120_000 });
}

async function captureCanvas(page, path) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const dataUrl = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  check(dataUrl.startsWith('data:image/png;base64,'), 'Walkthrough canvas did not return PNG evidence');
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  check(bytes.length > 10_000, `Walkthrough evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
  return bytes.length;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  lightingMode: 'Day',
  materialMode: null,
  materialResponseProfile: null,
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
  captureUrl.searchParams.set('lighting', 'day');
  await page.goto(captureUrl.toString(), { waitUntil: 'networkidle', timeout: 120_000 });
  await revealViewer(page);
  await waitForModel(page);

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');
  await waitForModel(page);

  for (const stop of STOPS) {
    if (stop.id !== 'entry') {
      await fastClick(tour.locator('.client-graph li').filter({ hasText: stop.label }).getByRole('button'));
    }
    await waitForStop(page, stop);

    const canvas = page.locator('.three-canvas');
    const frame = {
      stop: stop.id,
      lightingMode: await canvas.getAttribute('data-lighting-mode'),
      lightingProfile: await canvas.getAttribute('data-lighting-profile'),
      materialMode: await canvas.getAttribute('data-material-mode'),
      materialResponseProfile: await canvas.getAttribute('data-material-response-profile'),
      materialResponseCount: Number(await canvas.getAttribute('data-material-response-count') ?? 0),
      materialFamilyCount: Number(await canvas.getAttribute('data-material-family-count') ?? 0),
      interiorLights: Number(await canvas.getAttribute('data-interior-light-count') ?? 0),
      importedLights: Number(await canvas.getAttribute('data-imported-light-count') ?? 0),
      lightEngine: await canvas.getAttribute('data-light-engine'),
      walkGraph: await canvas.getAttribute('data-walk-graph'),
      evidenceBytes: 0
    };

    check(frame.lightingProfile === stop.lightingProfile, `${stop.id}: expected ${stop.lightingProfile}, got ${frame.lightingProfile}`);
    check(frame.materialMode === 'warm-limestone', `${stop.id}: unexpected material mode ${frame.materialMode}`);
    check(frame.materialResponseProfile === 'family-microcontrast-v1', `${stop.id}: material response missing`);
    check(frame.materialFamilyCount === 4, `${stop.id}: expected 4 material families, got ${frame.materialFamilyCount}`);
    check(frame.walkGraph === 'ready', `${stop.id}: walk graph is ${frame.walkGraph}`);
    check(frame.lightEngine === 'runtime-only', `${stop.id}: unexpected light engine ${frame.lightEngine}`);
    check(frame.importedLights === 0, `${stop.id}: imported GLB lights leaked into browser (${frame.importedLights})`);

    frame.evidenceBytes = await captureCanvas(page, `${outputDir}/${stop.file}`);
    report.frames.push(frame);
  }

  const canvas = page.locator('.three-canvas');
  report.materialMode = await canvas.getAttribute('data-material-mode');
  report.materialResponseProfile = await canvas.getAttribute('data-material-response-profile');

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
