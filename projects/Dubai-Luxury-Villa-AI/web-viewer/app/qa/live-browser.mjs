import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { revealViewer } from './reveal-viewer.mjs';

const baseUrl = process.env.VILLA_URL ?? 'https://safal207.github.io/Architectural-AI-Lab/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-output';
const captureScreenshots = process.env.QA_SCREENSHOTS !== '0';
const ACCEPTED_ASSET_VERSIONS = new Set([
  'v0.3-life2',
  'v0.4-interior2',
  'v0.4-interior3-feature-candidate',
  'v0.4-pool-context-v4-feature-candidate'
]);
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function fastClick(locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate((element) => element.click());
}

async function assertHeroContained(page, label) {
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector('.sales-hero');
    const copy = document.querySelector('.sales-hero__copy');
    const heading = document.querySelector('.sales-hero h1');
    const lead = document.querySelector('.sales-hero__lead');
    if (!hero || !copy || !heading || !lead) return null;
    return {
      heroClientWidth: hero.clientWidth,
      heroScrollWidth: hero.scrollWidth,
      copyClientWidth: copy.clientWidth,
      copyScrollWidth: copy.scrollWidth,
      headingClientWidth: heading.clientWidth,
      headingScrollWidth: heading.scrollWidth,
      leadClientWidth: lead.clientWidth,
      leadScrollWidth: lead.scrollWidth
    };
  });

  check(metrics, `${label}: hero containment metrics unavailable`);
  check(
    metrics.copyScrollWidth <= metrics.copyClientWidth + 1,
    `${label}: hero copy clips internally (${metrics.copyScrollWidth}px > ${metrics.copyClientWidth}px)`
  );
  check(
    metrics.headingScrollWidth <= metrics.headingClientWidth + 1,
    `${label}: hero heading clips internally (${metrics.headingScrollWidth}px > ${metrics.headingClientWidth}px)`
  );
  check(
    metrics.leadScrollWidth <= metrics.leadClientWidth + 1,
    `${label}: hero lead clips internally (${metrics.leadScrollWidth}px > ${metrics.leadClientWidth}px)`
  );
  return metrics;
}

/** Require the real model to load and reject placeholder fallback; include resource diagnostics on failure. */
async function waitForModel(page) {
  try {
    await page.locator('.three-canvas canvas').waitFor({ state: 'visible', timeout: 120_000 });
    await page.waitForFunction(
      () => ['loaded', 'fallback'].includes(document.querySelector('.three-canvas')?.dataset.modelState),
      undefined,
      { timeout: 120_000 }
    );
    check(await page.locator('.three-canvas').getAttribute('data-model-state') === 'loaded', 'Viewer fell back to placeholder massing');
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      url: location.href,
      viewer: { ...document.querySelector('.three-canvas')?.dataset },
      loading: document.querySelector('.viewer-loading')?.textContent?.trim() ?? null,
      modelResources: performance.getEntriesByType('resource')
        .filter((resource) => new URL(resource.name).pathname.endsWith('/villa.glb'))
        .map(({ name, duration, transferSize, decodedBodySize }) => ({ name, duration, transferSize, decodedBodySize }))
    })).catch(() => ({ url: page.url(), pageClosed: page.isClosed() }));
    throw new Error(`Model failed to load: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
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
  check(ACCEPTED_ASSET_VERSIONS.has(manifest.version), `Unexpected viewer asset version: ${manifest.version}`);

  if (manifest.version === 'v0.4-pool-context-v4-feature-candidate') {
    check(
      manifest.navigation_boundary === 'GUIDED_PRESENTATION_SEPARATE_FROM_EXPLORE_ROUTE',
      `Unexpected navigation boundary: ${manifest.navigation_boundary}`
    );
    const presentationNodes = new Set(manifest.presentation_nodes ?? []);
    check(presentationNodes.has('tour_present_pool'), 'Pool Guided camera node missing from live manifest');
    check(presentationNodes.has('tour_present_look_pool'), 'Pool Guided target node missing from live manifest');
  }

  return {
    version: manifest.version,
    bytes: glb.length,
    sha256: digest,
    navigationBoundary: manifest.navigation_boundary ?? null,
    presentationNodes: manifest.presentation_nodes ?? []
  };
}

/** Verify the residence hero, decoded source image, space stories and local-brief entry points. */
async function verifyPortfolio(page) {
  await page.getByRole('heading', { level: 1, name: 'See your space come to life.', exact: true }).waitFor();

  const heroImage = page.locator('.hero-image img');
  await heroImage.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('.hero-image img');
    return image?.complete && image.naturalWidth > 0;
  });
  const imageSource = await heroImage.evaluate((image) => image.currentSrc);
  check(new URL(imageSource).pathname.includes('/editorial/residence-'), 'Hero does not show the residence image');
  await page.getByRole('button', { name: /Enter the residence/ }).waitFor({ state: 'visible' });

  const stories = page.locator('.space-stories');
  await stories.getByRole('heading', { level: 3, name: 'The everyday, reimagined.', exact: true }).waitFor();
  await stories.getByRole('heading', { level: 3, name: 'Evenings open to the sky.', exact: true }).waitFor();
  await stories.getByRole('button', { name: 'Explore the kitchen', exact: true }).waitFor();
  await stories.getByRole('button', { name: 'Explore the terrace', exact: true }).waitFor();
  check(await stories.locator('.space-story__image img').count() === 2, 'Expected kitchen and terrace image stories');

  const briefLink = page.locator('.header-brief');
  check(await briefLink.getAttribute('href') === '#brief', 'Project navigation does not point to the brief');
  await page.locator('#brief').getByRole('button', { name: 'Download my brief', exact: true }).waitFor();
}

/** Check native modal state, decoded images, both arrow keys, closing controls and restored trigger focus. */
async function verifyGallery(page) {
  const openGallery = page.getByRole('button', { name: 'Enlarge Kitchen & living image', exact: true });
  await openGallery.click();
  const gallery = page.getByRole('dialog', { name: 'Residence image gallery', exact: true });
  await gallery.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('.image-dialog img');
    return image?.complete && image.naturalWidth > 0 && image.currentSrc.includes('/interior-');
  });
  check(await gallery.evaluate((element) => element.open), 'Gallery opened without native modal state');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => {
    const image = document.querySelector('.image-dialog img');
    return image?.complete && image.naturalWidth > 0 && image.currentSrc.includes('/residence-');
  });
  await page.keyboard.press('ArrowLeft');
  await gallery.getByRole('img', { name: /fluted timber kitchen island/i }).waitFor();
  await page.keyboard.press('Escape');
  await gallery.waitFor({ state: 'hidden' });
  check(await openGallery.evaluate((button) => button === document.activeElement), 'Closing the gallery did not return focus to its trigger');

  await page.getByRole('button', { name: 'Enlarge Pool & terrace image', exact: true }).click();
  await gallery.waitFor({ state: 'visible' });
  await gallery.getByRole('button', { name: 'Close image gallery', exact: true }).click();
  await gallery.waitFor({ state: 'hidden' });
}

/**
 * Download a kitchen brief and verify notes, current palette and atmosphere in the saved file.
 * Return a compact evidence record after the ready status appears.
 */
async function verifyProjectBrief(page, label) {
  const brief = page.locator('#brief');
  const notes = 'A quiet kitchen with an island.\nKeep the garden view.';
  await brief.getByText('Kitchen design', { exact: true }).click();
  check(await brief.getByRole('radio', { name: 'Kitchen design', exact: true }).isChecked(), 'Project type selection did not update');
  await brief.getByRole('textbox', { name: /What do you have in mind/ }).fill(notes);
  const expectedMaterial = (await page.locator('.material-switcher__options button[aria-pressed="true"] strong').innerText()).trim();
  const expectedLighting = (await page.locator('nav[aria-label="Lighting mode"] button[aria-pressed="true"]').innerText()).trim();
  const exploredSpace = (await brief.locator('.brief-inspiration strong').innerText()).trim();

  const downloadPromise = page.waitForEvent('download');
  await brief.getByRole('button', { name: 'Download my brief', exact: true }).click();
  const download = await downloadPromise;
  check(download.suggestedFilename() === 'architectural-ai-lab-project-brief.txt', 'Brief filename is unexpected');
  const downloadPath = `${outputDir}/${label}-project-brief.txt`;
  await download.saveAs(downloadPath);
  check(await download.failure() === null, 'Project brief download failed');
  const content = await readFile(downloadPath, 'utf8');
  for (const expected of [
    'ARCHITECTURAL AI LAB / PROJECT BRIEF',
    'Project: Kitchen design',
    `Material direction: ${expectedMaterial}`,
    `Preferred atmosphere: ${expectedLighting}`,
    `Space explored in 3D: ${exploredSpace}`,
    notes,
    'Concept planning brief. Not construction documentation.'
  ]) {
    check(content.includes(expected), `Downloaded brief is missing ${JSON.stringify(expected)}`);
  }
  await brief.getByRole('status').filter({ hasText: 'Your brief is ready.' }).waitFor();
  return { filename: download.suggestedFilename(), material: expectedMaterial, lighting: expectedLighting, notesPreserved: true };
}

/** Exercise desktop plan selection, Guided/Explore transitions and WALK exit/reentry without model reloads. */
async function verifyDesktopTour(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  await tour.getByRole('heading', { name: 'Plan your journey.', exact: true }).waitFor();
  await tour.getByText('Concept floor plan', { exact: true }).waitFor();

  const livingZone = tour.locator('.house-plan__zone--living');
  await fastClick(livingZone);
  await waitForModel(page);

  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person'
      && canvas?.dataset.tourStop === 'living'
      && canvas?.dataset.interactionMode === 'guided';
  });

  const canvas = page.locator('.three-canvas');
  check(await canvas.getAttribute('data-viewer-runtime') === 'persistent-scene-v2', 'Live persistent viewer runtime missing');
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Live viewer loaded villa.glb more than once');

  const hud = page.locator('.first-person-hud');
  await hud.getByText(/Living room/i).waitFor();

  const diningStop = tour.locator('.client-graph li').filter({ hasText: 'Kitchen + dining' }).getByRole('button');
  await fastClick(diningStop);
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.tourStop === 'dining');
  await hud.getByText(/Kitchen \+ dining/i).waitFor();

  const modes = page.locator('.viewer-mode-switch');
  await fastClick(modes.getByRole('button', { name: 'Explore', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'explore');
  await page.locator('.walkthrough-onboarding').waitFor({ state: 'visible' });
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Live Explore mode reloaded villa.glb');

  await fastClick(modes.getByRole('button', { name: 'Guided', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'guided');

  const walkMode = tour.getByRole('button', { name: 'WALK', exact: true });
  await fastClick(walkMode);
  check(await walkMode.getAttribute('aria-pressed') === 'true', 'WALK plan mode did not activate');
  await fastClick(page.getByRole('button', { name: 'Exit walkthrough', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
  await page.waitForFunction(() => !document.querySelector('.house-plan-stage--walk'));
  check(await walkMode.getAttribute('aria-pressed') === 'false', 'Exit left the WALK plan mode active');
  check(await tour.getByRole('button', { name: 'PLAN', exact: true }).getAttribute('aria-pressed') === 'true', 'Exit did not restore PLAN mode');

  await fastClick(tour.getByRole('button', { name: 'Enter the house', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'first-person');
  check(await walkMode.getAttribute('aria-pressed') === 'true', 'Entering the house did not activate WALK plan mode');
  await fastClick(tour.getByRole('button', { name: 'First-person tour: ON', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
  await page.waitForFunction(() => !document.querySelector('.house-plan-stage--walk'));
  check(await walkMode.getAttribute('aria-pressed') === 'false', 'Tour toggle left the WALK plan mode active');
  check(await tour.getByRole('button', { name: 'PLAN', exact: true }).getAttribute('aria-pressed') === 'true', 'Tour toggle did not restore PLAN mode');
  await waitForModel(page);
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Exiting live walkthrough reloaded villa.glb');
}

/** Exercise upper-floor room selection and touch-control visibility across Guided/Explore and tour exit. */
async function verifyMobileTour(page) {
  const tour = page.locator('.tour-experience');
  await tour.waitFor();
  const floorSwitch = tour.locator('.floor-switch');
  await fastClick(floorSwitch.getByRole('button', { name: 'Floor 2', exact: true }));
  await tour.getByRole('heading', { level: 3, name: /^Floor 2\b/ }).waitFor();

  const masterZone = tour.locator('.house-plan__zone').filter({ hasText: 'Master Bedroom' });
  await fastClick(masterZone);
  await page.locator('.room-details h3').filter({ hasText: 'Master Bedroom' }).waitFor();
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person'
      && canvas?.dataset.tourStop === 'master'
      && canvas?.dataset.interactionMode === 'guided';
  });
  await waitForModel(page);

  const canvas = page.locator('.three-canvas');
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Mobile live viewer loaded villa.glb more than once');

  const modes = page.locator('.viewer-mode-switch');
  await fastClick(modes.getByRole('button', { name: 'Explore', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'explore');
  const pad = page.locator('.touch-walk-pad');
  await pad.waitFor({ state: 'visible' });
  await pad.getByRole('button', { name: 'Walk forward', exact: true }).waitFor();

  await fastClick(modes.getByRole('button', { name: 'Guided', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.interactionMode === 'guided');
  check(await pad.count() === 0, 'Mobile movement pad remained visible after returning to Guided');

  await fastClick(page.getByRole('button', { name: 'Exit walkthrough', exact: true }));
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');
  check(Number(await canvas.getAttribute('data-model-load-count')) === 1, 'Exiting mobile walkthrough reloaded villa.glb');
}

const browser = await chromium.launch({ headless: true });
const report = {
  url: baseUrl,
  status: 'RUNNING',
  desktop: {},
  mobile: {},
  screenshots: captureScreenshots ? 'enabled' : 'disabled (QA_SCREENSHOTS=0)',
  consoleErrors: [],
  pageErrors: [],
  failedResponses: []
};

/** Track model requests, browser errors and failed HTTP responses for a desktop or mobile run. */
function observe(page, result) {
  page.setDefaultTimeout(30_000);
  result.modelRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/villa.glb')) result.modelRequests += 1;
  });
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
  observe(desktop, report.desktop);
  await desktop.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  console.log('Desktop page loaded');
  await verifyPortfolio(desktop);
  await verifyGallery(desktop);
  report.desktop.gallery = 'PASS';
  await revealViewer(desktop);
  await waitForModel(desktop);
  report.desktop.asset = await verifyPublishedAsset(desktop);
  console.log('Desktop model and asset verified');

  await verifyDesktopTour(desktop);
  report.desktop.housePlan = 'PASS';
  report.desktop.clientViewingGraph = 'PASS';
  report.desktop.firstPersonModeState = 'PASS';
  report.desktop.guidedExploreBoundary = 'PASS';
  report.desktop.persistentScene = 'PASS';
  report.desktop.planSelectionEntersTour = 'PASS';
  report.desktop.exitClearsWalkMode = 'PASS';
  console.log('Desktop plan selection and tour exit verified');

  const desktopRooms = desktop.locator('.rooms-panel');
  await fastClick(desktopRooms.getByRole('button', { name: 'Master Bedroom — 52 sqm', exact: true }));
  await desktop.locator('.room-details h3').filter({ hasText: 'Master Bedroom' }).waitFor();
  await desktop.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person' && canvas?.dataset.tourStop === 'master';
  });
  await waitForModel(desktop);
  report.desktop.masterRoomOpensMasterStop = 'PASS';
  await fastClick(desktop.getByRole('button', { name: 'Exit walkthrough', exact: true }));
  await desktop.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.viewMode === 'orbit');

  const lightingNav = desktop.locator('nav[aria-label="Lighting mode"]');
  await fastClick(lightingNav.getByRole('button', { name: 'Night', exact: true }));
  await desktop.getByText('Lighting: Night', { exact: true }).waitFor();
  await waitForModel(desktop);

  const materialPanel = desktop.locator('.material-switcher');
  await fastClick(materialPanel.getByRole('button', { name: /Graphite Mineral/ }));
  await desktop.getByText('Material: Graphite Mineral', { exact: true }).waitFor();
  await fastClick(materialPanel.getByRole('button', { name: /Sandstone Warmth/ }));
  await desktop.getByText('Material: Sandstone Warmth', { exact: true }).waitFor();
  await waitForModel(desktop);
  report.desktop.projectBrief = await verifyProjectBrief(desktop, 'desktop');

  const canvas = desktop.locator('.three-canvas canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  check(box && box.width > 300 && box.height > 200, 'Desktop WebGL canvas is unexpectedly small');
  await desktop.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await desktop.mouse.down();
  await desktop.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.48, { steps: 8 });
  await desktop.mouse.up();
  await desktop.mouse.wheel(0, -500);
  await desktop.waitForTimeout(500);
  check(await desktop.locator('.three-canvas').getAttribute('data-model-state') === 'loaded', 'Model stopped being loaded after orbit/zoom interaction');
  check(report.desktop.modelRequests === 1, `Desktop loaded villa.glb ${report.desktop.modelRequests} times; expected one request from the production viewer`);

  if (captureScreenshots) await desktop.screenshot({ path: `${outputDir}/desktop.png`, fullPage: false, animations: 'disabled', timeout: 60_000 });
  report.desktop.portfolio = 'PASS';
  report.desktop.roomSelection = 'PASS';
  report.desktop.lighting = 'PASS';
  report.desktop.materialState = 'PASS';
  report.desktop.orbitZoomSmoke = 'PASS';
  console.log('Desktop interactions verified');
  await desktop.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true
  });
  observe(mobile, report.mobile);
  await mobile.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  console.log('Mobile page loaded');
  await verifyPortfolio(mobile);
  await verifyGallery(mobile);
  report.mobile.gallery = 'PASS';
  await revealViewer(mobile);
  await waitForModel(mobile);
  await verifyMobileTour(mobile);
  report.mobile.housePlan = 'PASS';
  report.mobile.planSelectionEntersTour = 'PASS';
  report.mobile.guidedExploreBoundary = 'PASS';
  report.mobile.touchControls = 'PASS';
  report.mobile.persistentScene = 'PASS';
  report.mobile.projectBrief = await verifyProjectBrief(mobile, 'mobile');

  const mobileRooms = mobile.locator('.rooms-panel');
  await fastClick(mobileRooms.getByRole('button', { name: 'Pool Terrace — 46 sqm', exact: true }));
  await mobile.locator('.room-details h3').filter({ hasText: 'Pool Terrace' }).waitFor();
  await mobile.waitForFunction(() => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.viewMode === 'first-person' && canvas?.dataset.tourStop === 'pool';
  });
  await waitForModel(mobile);
  check(report.mobile.modelRequests === 1, `Mobile loaded villa.glb ${report.mobile.modelRequests} times; expected one request from the production viewer`);

  const overflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  check(overflow.scrollWidth <= overflow.clientWidth + 1, `Mobile horizontal overflow: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`);

  report.mobile.heroContainment390 = await assertHeroContained(mobile, '390px mobile');

  await mobile.setViewportSize({ width: 320, height: 800 });
  await mobile.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const narrowOverflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  check(
    narrowOverflow.scrollWidth <= narrowOverflow.clientWidth + 1,
    `320px horizontal overflow: ${narrowOverflow.scrollWidth}px > ${narrowOverflow.clientWidth}px`
  );
  report.mobile.heroContainment320 = await assertHeroContained(mobile, '320px mobile');

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const mobileCanvas = await mobile.locator('.three-canvas canvas').boundingBox();
  check(mobileCanvas && mobileCanvas.width >= 300 && mobileCanvas.height >= 180, 'Mobile WebGL canvas is unexpectedly small');
  if (captureScreenshots) await mobile.screenshot({ path: `${outputDir}/mobile.png`, fullPage: false, animations: 'disabled', timeout: 60_000 });
  report.mobile.portfolio = 'PASS';
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
