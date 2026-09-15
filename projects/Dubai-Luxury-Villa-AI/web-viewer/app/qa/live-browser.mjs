import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'https://safal207.github.io/Architectural-AI-Lab/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-output';
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

async function verifyPublishedAsset(page) {
  const manifestResponse = await page.request.get(new URL('villa.asset.json', baseUrl).href);
  check(manifestResponse.ok(), `villa.asset.json returned ${manifestResponse.status()}`);
  const manifest = await manifestResponse.json();

  const glbResponse = await page.request.get(new URL('villa.glb', baseUrl).href);
  check(glbResponse.ok(), `villa.glb returned ${glbResponse.status()}`);
  const glb = await glbResponse.body();
  const digest = createHash('sha256').update(glb).digest('hex');

  check(glb.length === manifest.glb.bytes, `GLB byte mismatch: ${glb.length} != ${manifest.glb.bytes}`);
  check(digest === manifest.glb.sha256, `GLB SHA-256 mismatch: ${digest} != ${manifest.glb.sha256}`);
  check(manifest.version === 'v0.3-life2', `Unexpected viewer asset version: ${manifest.version}`);

  return { version: manifest.version, bytes: glb.length, sha256: digest };
}

const browser = await chromium.launch({ headless: true });
const report = {
  url: baseUrl,
  status: 'RUNNING',
  desktop: {},
  mobile: {},
  consoleErrors: [],
  pageErrors: [],
  failedResponses: []
};

function observe(page) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      report.failedResponses.push({ status: response.status(), url: response.url() });
    }
  });
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  observe(desktop);
  await desktop.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await desktop.getByRole('heading', { name: 'Dubai Luxury Villa AI' }).waitFor();
  await waitForModel(desktop);
  report.desktop.asset = await verifyPublishedAsset(desktop);

  await desktop.getByRole('button', { name: /Master Bedroom/ }).click();
  await desktop.locator('.room-details h3').filter({ hasText: 'Master Bedroom' }).waitFor();
  await waitForModel(desktop);

  await desktop.getByRole('button', { name: /^Night$/ }).click();
  await desktop.getByText('Lighting: Night').waitFor();
  await waitForModel(desktop);

  await desktop.getByRole('button', { name: /Warm Wood/ }).click();
  await desktop.getByText('Material: Warm Wood').waitFor();
  await waitForModel(desktop);

  const canvas = desktop.locator('.three-canvas canvas');
  const box = await canvas.boundingBox();
  check(box && box.width > 300 && box.height > 200, 'Desktop WebGL canvas is unexpectedly small');
  await desktop.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await desktop.mouse.down();
  await desktop.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.48, { steps: 8 });
  await desktop.mouse.up();
  await desktop.mouse.wheel(0, -500);
  await desktop.waitForTimeout(500);
  check(await desktop.locator('.three-canvas').getAttribute('data-model-state') === 'loaded', 'Model stopped being loaded after orbit/zoom interaction');

  await desktop.screenshot({ path: `${outputDir}/desktop.png`, fullPage: true });
  report.desktop.roomSelection = 'PASS';
  report.desktop.lighting = 'PASS';
  report.desktop.materialState = 'PASS';
  report.desktop.orbitZoomSmoke = 'PASS';

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  observe(mobile);
  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await mobile.getByRole('heading', { name: 'Dubai Luxury Villa AI' }).waitFor();
  await waitForModel(mobile);
  await mobile.getByRole('button', { name: /Pool Terrace/ }).click();
  await mobile.locator('.room-details h3').filter({ hasText: 'Pool Terrace' }).waitFor();
  await waitForModel(mobile);

  const overflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  check(overflow.scrollWidth <= overflow.clientWidth + 1, `Mobile horizontal overflow: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`);

  const mobileCanvas = await mobile.locator('.three-canvas canvas').boundingBox();
  check(mobileCanvas && mobileCanvas.width >= 300 && mobileCanvas.height >= 180, 'Mobile WebGL canvas is unexpectedly small');
  await mobile.screenshot({ path: `${outputDir}/mobile.png`, fullPage: true });
  report.mobile.roomSelection = 'PASS';
  report.mobile.noHorizontalOverflow = 'PASS';
  report.mobile.canvas = 'PASS';

  check(report.consoleErrors.length === 0, `Console errors detected: ${report.consoleErrors.join(' | ')}`);
  check(report.pageErrors.length === 0, `Page errors detected: ${report.pageErrors.join(' | ')}`);
  check(report.failedResponses.length === 0, `HTTP failures detected: ${JSON.stringify(report.failedResponses)}`);

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
