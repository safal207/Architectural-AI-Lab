import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-editorial-resilience-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForTour(page, stop) {
  await page.waitForFunction((expectedStop) => {
    const canvas = document.querySelector('.three-canvas');
    return canvas?.dataset.modelState === 'loaded'
      && canvas.dataset.viewMode === 'first-person'
      && canvas.dataset.tourStop === expectedStop;
  }, stop, { timeout: 120_000 });
}

async function downloadBrief(page, filename) {
  const section = page.locator('#brief');
  const downloadPromise = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Download my brief', exact: true }).click();
  const download = await downloadPromise;
  check(download.suggestedFilename() === 'architectural-ai-lab-project-brief.txt', 'Brief filename changed unexpectedly');
  const destination = `${outputDir}/${filename}.txt`;
  await download.saveAs(destination);
  check(await download.failure() === null, 'Brief download failed');
  await section.getByRole('status').filter({ hasText: 'Your brief is ready.' }).waitFor();
  const content = await readFile(destination, 'utf8');
  check(content.includes('ARCHITECTURAL AI LAB / PROJECT BRIEF'), 'Downloaded file is not a project brief');
  return content;
}

async function assertBriefNeedsDownload(page) {
  await page.locator('#brief').getByRole('status')
    .filter({ hasText: 'Includes your selected materials and atmosphere.' }).waitFor();
  check(!await page.locator('#brief').getByRole('status').innerText().then((text) => text.includes('Your brief is ready.')),
    'Brief still claims it is prepared after preferences changed');
}

async function assertGalleryWorks(page) {
  const trigger = page.getByRole('button', { name: 'Enlarge Kitchen & living image', exact: true });
  await trigger.click();
  const gallery = page.getByRole('dialog', { name: 'Residence image gallery', exact: true });
  await gallery.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('.image-dialog img');
    return image?.complete && image.naturalWidth >= 800;
  });
  const firstImage = await gallery.locator('img').getAttribute('src');
  await page.keyboard.press('ArrowLeft');
  await gallery.locator('img[src$="residence-1600.webp"]').waitFor();
  await page.keyboard.press('ArrowRight');
  await gallery.locator('img[src$="interior-1600.webp"]').waitFor();
  check(await gallery.locator('img').getAttribute('src') === firstImage, 'Gallery arrow keys did not wrap back to the first image');
  await page.keyboard.press('Escape');
  await gallery.waitFor({ state: 'hidden' });
  check(await trigger.evaluate((button) => document.activeElement === button), 'Gallery did not restore focus to the image trigger');
}

const report = {
  url: baseUrl,
  status: 'RUNNING',
  normal: { consoleErrors: [], pageErrors: [] },
  webglUnavailable: { consoleErrors: [], pageErrors: [] }
};
const browser = await chromium.launch({ headless: true });

function observe(page, result) {
  page.setDefaultTimeout(30_000);
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => result.pageErrors.push(String(error)));
}

try {
  // Keep only one page alive at a time so this focused regression does not
  // compete with another WebGL instance for software-rendering resources.
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  observe(page, report.normal);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await page.getByRole('button', { name: /Enter the residence/ }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'experience-title');
  await waitForTour(page, 'pool');
  report.normal.heroEntryFocusAndStop = 'PASS';

  await page.getByRole('button', { name: 'Explore the kitchen', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'experience-title');
  await waitForTour(page, 'dining');
  report.normal.kitchenEntryFocusAndStop = 'PASS';

  const master = page.locator('.rooms-panel').getByRole('button', { name: 'Master Bedroom — 52 sqm', exact: true });
  await master.click();
  await waitForTour(page, 'master');
  const details = page.locator('.room-details');
  await details.getByRole('heading', { name: 'Master Bedroom', exact: true }).waitFor();
  check(await master.getAttribute('aria-pressed') === 'true', 'Master button did not become selected');
  check(/52\s*m²/.test(await details.innerText()), 'Master room area is missing before the transition');

  await page.locator('.client-graph li').filter({ hasText: 'Stair hall' }).getByRole('button').click();
  await waitForTour(page, 'stair-ground');
  await details.getByRole('heading', { name: 'Stair hall', exact: true }).waitFor();
  const stairDetails = await details.innerText();
  check(!/Master Bedroom|52\s*m²|Concept area/i.test(stairDetails), 'Stair hall retained stale master room details');
  check(await page.locator('.room-selector button[aria-pressed="true"]').count() === 0, 'A room shortcut stayed selected at Stair hall');
  report.normal.stairClearsRoomDetailsAndSelection = 'PASS';

  await page.locator('#brief').getByRole('textbox', { name: /What do you have in mind/ }).fill('A calm home with warm timber.');
  await downloadBrief(page, 'initial-brief');
  await page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ }).click();
  await assertBriefNeedsDownload(page);
  const paletteBrief = await downloadBrief(page, 'palette-updated-brief');
  check(paletteBrief.includes('Material direction: Graphite Mineral'), 'Updated palette was not included in the new brief');
  report.normal.paletteClearsPreparedStatus = 'PASS';

  const lighting = page.locator('nav[aria-label="Lighting mode"]');
  const previousLighting = (await lighting.locator('button[aria-pressed="true"]').innerText()).trim();
  const nextLighting = previousLighting === 'Night' ? 'Day' : 'Night';
  await lighting.getByRole('button', { name: nextLighting, exact: true }).click();
  await assertBriefNeedsDownload(page);
  const lightingBrief = await downloadBrief(page, 'lighting-updated-brief');
  check(lightingBrief.includes(`Preferred atmosphere: ${nextLighting}`), 'Updated lighting was not included in the new brief');
  report.normal.lightingClearsPreparedStatus = 'PASS';
  check(report.normal.consoleErrors.length === 0, `Unexpected console errors: ${report.normal.consoleErrors.join(' | ')}`);
  check(report.normal.pageErrors.length === 0, `Unexpected page errors: ${report.normal.pageErrors.join(' | ')}`);
  await page.close();

  const unavailable = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  observe(unavailable, report.webglUnavailable);
  await unavailable.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
      return originalGetContext.call(this, type, ...args);
    };
  });
  await unavailable.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const fallback = unavailable.locator('.scene-unavailable');
  await fallback.getByRole('heading', { name: "The 3D view couldn't open.", exact: true }).waitFor({ timeout: 120_000 });
  await fallback.getByRole('button', { name: 'Try the 3D view again', exact: true }).waitFor();
  await unavailable.getByRole('heading', { level: 1, name: /^Desert,\s*distilled\.$/ }).waitFor();
  await unavailable.waitForFunction(() => {
    const image = document.querySelector('.scene-unavailable img');
    return image?.complete && image.naturalWidth >= 800;
  });
  check(await unavailable.evaluate(() => !!document.createElement('canvas').getContext('2d')), 'Failure simulation disabled ordinary 2D canvas');
  report.webglUnavailable.fallbackAndPortfolio = 'PASS';

  await assertGalleryWorks(unavailable);
  report.webglUnavailable.galleryStillWorks = 'PASS';
  await unavailable.locator('.material-switcher').getByRole('button', { name: /Sandstone Warmth/ }).click();
  const fallbackNotes = 'Plan a kitchen around the garden view.';
  await unavailable.locator('#brief').getByText('Kitchen design', { exact: true }).click();
  await unavailable.locator('#brief').getByRole('textbox', { name: /What do you have in mind/ }).fill(fallbackNotes);
  const fallbackBrief = await downloadBrief(unavailable, 'webgl-unavailable-brief');
  check(fallbackBrief.includes('Project: Kitchen design'), 'Fallback brief lost the chosen project type');
  check(fallbackBrief.includes('Material direction: Sandstone Warmth'), 'Fallback brief lost the chosen palette');
  check(fallbackBrief.includes(fallbackNotes), 'Fallback brief lost the project notes');
  report.webglUnavailable.paletteAndBriefStillWork = 'PASS';
  // Renderer/React errors are expected in this intentionally failed context.
  // The boundary and surviving interactions above are the acceptance criteria.
  report.webglUnavailable.errorsAreExpected = true;
  await unavailable.close();
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
