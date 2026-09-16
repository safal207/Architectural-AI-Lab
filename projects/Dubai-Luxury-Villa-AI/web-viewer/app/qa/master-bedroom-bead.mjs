import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-master-bedroom-bead-output';
await mkdir(outputDir, { recursive: true });

const MODES = [
  { name: 'Day', file: 'master-day.png' },
  { name: 'Evening', file: 'master-evening.png' },
  { name: 'Night', file: 'master-night.png' }
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

async function waitForMasterState(page, lightingName) {
  await page.waitForFunction((expectedLighting) => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    const canvas = document.querySelector('.three-canvas canvas');
    return dataset?.tourStop === 'master'
      && dataset?.viewMode === 'first-person'
      && dataset?.lightingMode === expectedLighting
      && dataset?.lightingProfile === 'interior-adapted'
      && dataset?.materialResponseProfile === 'family-microcontrast-v1'
      && Number(dataset?.materialResponseCount ?? 0) >= 4
      && Number(dataset?.materialFamilyCount ?? 0) === 4
      && dataset?.modelState === 'loaded'
      && canvas?.dataset.qaCapture === 'preserved';
  }, lightingName, { timeout: 120_000 });
}

async function captureViewer(page, path) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const dataUrl = await page.locator('.three-canvas canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
  check(dataUrl.startsWith('data:image/png;base64,'), 'WebGL canvas did not return PNG evidence');
  const payload = dataUrl.slice('data:image/png;base64,'.length);
  const bytes = Buffer.from(payload, 'base64');
  check(bytes.length > 10_000, `WebGL evidence is unexpectedly small (${bytes.length} bytes)`);
  await writeFile(path, bytes);
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  stop: 'master',
  assetVersion: null,
  sourceArtifactId: null,
  masterComposition: null,
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

  const manifestResponse = await page.request.get(new URL('villa.asset.json', baseUrl).toString());
  check(manifestResponse.ok(), `villa.asset.json unavailable: HTTP ${manifestResponse.status()}`);
  const manifest = await manifestResponse.json();
  report.assetVersion = manifest.version ?? null;
  report.masterComposition = manifest.source_pipeline?.master_composition ?? null;

  check(report.assetVersion === 'v0.4-interior3-feature-candidate', `Unexpected asset version: ${report.assetVersion}`);
  check(
    report.masterComposition === 'v0.4-interior3 quiet-luxury r5 layer',
    `Quiet-luxury master composition is not the promoted viewer asset: ${report.masterComposition}`
  );

  const captureUrl = new URL(baseUrl);
  captureUrl.searchParams.set('qaCapture', '1');
  await page.goto(captureUrl.toString(), { waitUntil: 'networkidle', timeout: 120_000 });
  await waitForModel(page);

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');
  await waitForModel(page);

  await fastClick(tour.locator('.client-graph li').filter({ hasText: 'Master bedroom' }).getByRole('button'));
  await page.waitForFunction(() => {
    const dataset = document.querySelector('.three-canvas')?.dataset;
    return dataset?.tourStop === 'master' && dataset?.viewMode === 'first-person';
  }, undefined, { timeout: 120_000 });
  await waitForModel(page);

  for (const mode of MODES) {
    await fastClick(page.getByRole('button', { name: mode.name, exact: true }));
    await waitForMasterState(page, mode.name);

    const canvas = page.locator('.three-canvas');
    const frame = {
      lightingMode: await canvas.getAttribute('data-lighting-mode'),
      lightingProfile: await canvas.getAttribute('data-lighting-profile'),
      materialMode: await canvas.getAttribute('data-material-mode'),
      materialResponseProfile: await canvas.getAttribute('data-material-response-profile'),
      materialResponseCount: Number(await canvas.getAttribute('data-material-response-count') ?? 0),
      materialFamilyCount: Number(await canvas.getAttribute('data-material-family-count') ?? 0),
      interiorLights: Number(await canvas.getAttribute('data-interior-light-count') ?? 0),
      importedLights: Number(await canvas.getAttribute('data-imported-light-count') ?? 0),
      lightEngine: await canvas.getAttribute('data-light-engine'),
      walkGraph: await canvas.getAttribute('data-walk-graph')
    };

    check(frame.walkGraph === 'ready', `${mode.name}: walk graph is ${frame.walkGraph}`);
    check(frame.lightEngine === 'runtime-only', `${mode.name}: unexpected light engine ${frame.lightEngine}`);
    check(frame.lightingProfile === 'interior-adapted', `${mode.name}: unexpected lighting profile ${frame.lightingProfile}`);
    check(frame.materialResponseProfile === 'family-microcontrast-v1', `${mode.name}: material response missing`);
    check(frame.materialResponseCount >= 4, `${mode.name}: too few tuned materials (${frame.materialResponseCount})`);
    check(frame.materialFamilyCount === 4, `${mode.name}: expected 4 material families, got ${frame.materialFamilyCount}`);
    check(frame.interiorLights >= 6, `${mode.name}: quiet-luxury runtime light layer incomplete (${frame.interiorLights})`);
    check(frame.importedLights === 0, `${mode.name}: imported GLB punctual lights leaked into browser (${frame.importedLights})`);

    await captureViewer(page, `${outputDir}/${mode.file}`);
    report.frames.push(frame);
  }

  const canvas = page.locator('.three-canvas');
  report.materialMode = await canvas.getAttribute('data-material-mode');
  report.materialResponseProfile = await canvas.getAttribute('data-material-response-profile');

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
