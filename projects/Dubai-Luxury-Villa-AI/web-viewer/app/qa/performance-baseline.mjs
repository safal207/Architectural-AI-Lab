import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-performance-baseline-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function fastClick(locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((element) => element.click());
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  modelReadyMs: null,
  modelRequests: 0,
  modelResponses: [],
  resourceSummary: {},
  stopTransitionsMs: [],
  consoleErrors: [],
  pageErrors: []
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/villa.glb')) report.modelRequests += 1;
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('/villa.glb')) {
      report.modelResponses.push({ status: response.status(), ok: response.ok() });
    }
  });

  const start = Date.now();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('.three-canvas canvas').waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(
    () => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded',
    undefined,
    { timeout: 120_000 }
  );
  report.modelReadyMs = Date.now() - start;

  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    initiatorType: entry.initiatorType,
    duration: entry.duration,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize
  })));

  const classify = (item) => {
    const path = new URL(item.name).pathname;
    if (path.endsWith('/villa.glb')) return 'glb';
    if (path.endsWith('.js')) return 'js';
    if (path.endsWith('.css')) return 'css';
    return null;
  };

  for (const kind of ['glb', 'js', 'css']) {
    const items = resources.filter((item) => classify(item) === kind);
    report.resourceSummary[kind] = {
      count: items.length,
      transferBytes: items.reduce((sum, item) => sum + (item.transferSize || 0), 0),
      encodedBytes: items.reduce((sum, item) => sum + (item.encodedBodySize || 0), 0),
      maxEncodedBytes: Math.max(0, ...items.map((item) => item.encodedBodySize || 0)),
      maxDurationMs: Math.max(0, ...items.map((item) => item.duration || 0))
    };
  }

  const canvas = page.locator('.three-canvas');
  check(await canvas.getAttribute('data-viewer-runtime') === 'persistent-scene-v2', 'Persistent viewer runtime missing');
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Model load count is not 1');
  check(report.modelRequests === 1, `villa.glb requested ${report.modelRequests} times during initial load`);
  check(report.modelResponses.length === 1 && report.modelResponses[0].ok, 'villa.glb response was not a single successful response');
  check(report.resourceSummary.glb.count === 1, `Expected one GLB resource, got ${report.resourceSummary.glb.count}`);
  check(report.resourceSummary.glb.maxEncodedBytes <= 12_000_000, `GLB sanity budget exceeded: ${report.resourceSummary.glb.maxEncodedBytes}`);
  check(report.resourceSummary.js.maxEncodedBytes <= 1_200_000, `Largest JS chunk sanity budget exceeded: ${report.resourceSummary.js.maxEncodedBytes}`);
  check(report.modelReadyMs <= 60_000, `Model-ready sanity budget exceeded: ${report.modelReadyMs}ms`);

  const tour = page.locator('.tour-experience');
  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'entry');

  const stops = [
    ['Kitchen + dining', 'dining'],
    ['Stair hall', 'stair-ground'],
    ['Upper landing', 'stair-upper'],
    ['Master bedroom', 'master'],
    ['Pool terrace', 'pool']
  ];

  for (const [label, id] of stops) {
    const before = Date.now();
    await fastClick(tour.locator('.client-graph li').filter({ hasText: label }).getByRole('button'));
    await page.waitForFunction(
      (expected) => document.querySelector('.three-canvas')?.dataset.tourStop === expected,
      id,
      { timeout: 30_000 }
    );
    report.stopTransitionsMs.push({ stop: id, ms: Date.now() - before });
    check(Number(await canvas.getAttribute('data-model-load-count')) === 1, `${id}: model reloaded`);
  }

  check(report.modelRequests === 1, `villa.glb requested ${report.modelRequests} times after Guided transitions`);
  check(Math.max(...report.stopTransitionsMs.map((item) => item.ms)) <= 5_000, 'A Guided stop transition exceeded 5s');
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
