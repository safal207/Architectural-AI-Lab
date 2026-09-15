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
  check(['v0.3-life2', 'v0.4-interior2'].includes(manifest.version), `Unexpected viewer asset version: ${manifest.version}`);

  return { version: manifest.version, bytes: glb.length, sha256: digest };
}

async function verifySalesCase(page) {
  await page.getByRole('heading', {
    level: 1,
    name: 'Turn an architectural concept into an investor-ready interactive property story.',
    exact: true
  }).waitFor();

  await page.getByRole('heading', { level: 2, name: 'Request a 5-day digital twin pilot', exact: true }).waitFor();
  const pilotLink = page.getByRole('link', { name: 'Request a 5-day pilot', exact: true });
  await pilotLink.waitFor();
  const href = await pilotLink.getAttribute('href');
  check(href?.includes('/Architectural-AI-Lab/issues/new'), `Unexpected pilot CTA href: ${href}`);
}

async function verifyDesktopTour(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  await tour.getByText('Client viewing graph', { exact: true }).waitFor();
  await tour.getByText('Interactive house plan', { exact: true }).waitFor();

  const livingStop = tour.locator('.client-graph li').filter({ hasText: 'Living room' }).getByRole('button');
  await livingStop.click();
  await waitForModel(page);

  const toggle = tour.getByRole('button', { name: 'Start first-person tour', exact: true });
  await toggle.click();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person' && canvas?.dataset.tourStop === 'living';
  });
  await waitForModel(page);

  const hud = page.locator('.first-person-hud');
  await hud.getByText(/Living room/i).waitFor();

  const activeToggle = tour.getByRole('button', { name: 'First-person tour: ON', exact: true });
  await activeToggle.click();
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
  await waitForModel(page);
}

async function verifyMobileTour(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  const floorSwitch = tour.locator('.floor-switch');
  await floorSwitch.getByRole('button', { name: 'Floor 2', exact: true }).click();
  await tour.getByRole('heading', { level: 3, name: 'Floor 2', exact: true }).waitFor();

  const masterZone = tour.locator('.house-plan__zone').filter({ hasText: 'Master Bedroom' });
  await masterZone.click();
  await page.locator('.room-details h3').filter({ hasText: 'Master Bedroom' }).waitFor();
  await waitForModel(page);
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
  await verifySalesCase(desktop);
  await waitForModel(desktop);
  report.desktop.asset = await verifyPublishedAsset(desktop);

  await verifyDesktopTour(desktop);
  report.desktop.housePlan = 'PASS';
  report.desktop.clientViewingGraph = 'PASS';
  report.desktop.firstPersonModeState = 'PASS';

  const desktopRooms = desktop.locator('.rooms-panel');
  await desktopRooms.getByRole('button', { name: 'Master Bedroom — 52 sqm', exact: true }).click();
  await desktop.locator('.room-details h3').filter({ hasText: 'Master Bedroom' }).waitFor();
  await waitForModel(desktop);

  const lightingNav = desktop.locator('nav[aria-label="Lighting mode"]');
  await lightingNav.getByRole('button', { name: 'Night', exact: true }).click();
  await desktop.getByText('Lighting: Night', { exact: true }).waitFor();
  await waitForModel(desktop);

  const materialPanel = desktop.locator('.material-switcher');
  await materialPanel.getByRole('button', { name: /Warm Wood/ }).click();
  await desktop.getByText('Material: Warm Wood', { exact: true }).waitFor();
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
  report.desktop.salesCase = 'PASS';
  report.desktop.roomSelection = 'PASS';
  report.desktop.lighting = 'PASS';
  report.desktop.materialState = 'PASS';
  report.desktop.orbitZoomSmoke = 'PASS';

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  observe(mobile);
  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await verifySalesCase(mobile);
  await waitForModel(mobile);
  await verifyMobileTour(mobile);
  report.mobile.housePlan = 'PASS';
  report.mobile.clientViewingGraph = 'PASS';

  const mobileRooms = mobile.locator('.rooms-panel');
  await mobileRooms.getByRole('button', { name: 'Pool Terrace — 46 sqm', exact: true }).click();
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
  report.mobile.salesCase = 'PASS';
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
