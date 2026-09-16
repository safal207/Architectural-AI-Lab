import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-stair-hall-bead-output';
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

async function waitForStairState(page) {
  await page.waitForFunction(() => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.tourStop === 'stair-ground'
      && dataset?.viewMode === 'first-person'
      && dataset?.lightingMode === 'Day'
      && dataset?.lightingProfile === 'interior-adapted'
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
  check(dataUrl.startsWith('data:image/png;base64,'), 'Stair Hall canvas did not return PNG evidence');
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  check(bytes.length > 10_000, `Stair Hall evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
  return bytes.length;
}

async function measureVisualVariation(page) {
  return page.locator('.three-canvas canvas').evaluate((canvas) => {
    const probe = document.createElement('canvas');
    probe.width = canvas.width;
    probe.height = canvas.height;
    const context = probe.getContext('2d', { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, probe.width, probe.height);

    const counts = new Map();
    const step = Math.max(4, Math.round(Math.min(width, height) / 90));
    let sampleCount = 0;
    let luminanceSum = 0;
    let luminanceSquareSum = 0;

    for (let y = Math.floor(step / 2); y < height; y += step) {
      for (let x = Math.floor(step / 2); x < width; x += step) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const key = `${r >> 4}:${g >> 4}:${b >> 4}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminanceSum += luminance;
        luminanceSquareSum += luminance * luminance;
        sampleCount += 1;
      }
    }

    let dominant = 0;
    let entropy = 0;
    counts.forEach((count) => {
      dominant = Math.max(dominant, count);
      const probability = count / sampleCount;
      entropy -= probability * Math.log2(probability);
    });

    const luminanceMean = luminanceSum / sampleCount;
    const luminanceVariance = Math.max(
      0,
      luminanceSquareSum / sampleCount - luminanceMean * luminanceMean
    );

    return {
      sampleCount,
      dominantColorFraction: dominant / sampleCount,
      entropyBits: entropy,
      luminanceStdDev: Math.sqrt(luminanceVariance)
    };
  });
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  stop: 'stair-ground',
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
  visualVariation: null,
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

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Stair hall' }).getByRole('button'));
  await waitForStairState(page);

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
  check(report.lightingProfile === 'interior-adapted', `Unexpected Stair Hall lighting profile: ${report.lightingProfile}`);
  check(report.materialMode === 'warm-limestone', `Unexpected material mode: ${report.materialMode}`);
  check(report.materialResponseProfile === 'family-microcontrast-v1', `Unexpected material response: ${report.materialResponseProfile}`);
  check(report.materialFamilyCount === 4, `Expected 4 material families, found ${report.materialFamilyCount}`);
  check(report.walkGraph === 'ready', `Walk graph is ${report.walkGraph}`);
  check(report.lightEngine === 'runtime-only', `Unexpected light engine: ${report.lightEngine}`);
  check(report.importedLights === 0, `Imported GLB lights leaked into browser (${report.importedLights})`);

  report.visualVariation = await measureVisualVariation(page);
  check(
    report.visualVariation.dominantColorFraction < 0.60,
    `Stair Hall frame is visually flat: dominant quantized color occupies ${(report.visualVariation.dominantColorFraction * 100).toFixed(1)}%`
  );
  check(
    report.visualVariation.entropyBits > 1.75,
    `Stair Hall frame lacks visual variation: entropy ${report.visualVariation.entropyBits.toFixed(2)} bits`
  );

  report.evidenceBytes = await captureCanvas(page, `${outputDir}/stair-hall-day.png`);
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
