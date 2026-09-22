import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = process.env.QA_OUTPUT ?? 'qa-design-studio-output';
await mkdir(output, { recursive: true });
const report = { status: 'RUNNING', errors: [], glbRequests: 0, checks: [] };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(30_000);
page.on('pageerror', error => report.errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
page.on('request', request => { if (/\.glb(?:\?|$)/.test(request.url())) report.glbRequests++; });
const check = (value, message) => { if (!value) throw new Error(message); };
const waitStop = async id => page.waitForFunction(stop => document.querySelector('.three-canvas')?.dataset.tourStop === stop && document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', id, { timeout: 120_000 });
async function download(name) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my brief', exact: true }).click();
  const file = await promise;
  await file.saveAs(`${output}/${name}.txt`);
  await page.locator('#brief').getByRole('status')
    .filter({ hasText: /^Your brief is ready\. Check your downloads\.$/ }).waitFor();
  return readFile(`${output}/${name}.txt`, 'utf8');
}
try {
  await page.goto(process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.modelState === 'loaded', undefined, { timeout: 120_000 });
  const tabs = page.getByRole('tablist', { name: 'Architectural gestures' });
  check(await page.locator('.design-intent__diagram').getAttribute('data-projection') === 'orthographic', 'Study must use the current model projection');
  for (const [title, asset] of [['Deep edges', 'edges'], ['Open thresholds', 'thresholds'], ['A timber thread', 'timber']]) {
    await tabs.getByRole('tab', { name: title }).click();
    const href = await page.locator('.design-intent__diagram image').getAttribute('href');
    check(href.endsWith('/' + asset + '.webp'), 'Study highlight image does not match selected gesture');
    await page.evaluate(async src => { const image = new Image(); image.src = src; await image.decode(); if (image.naturalWidth !== 1440 || image.naturalHeight !== 960) throw new Error('Invalid study image dimensions'); }, href);
  }
  report.checks.push('All three model-derived studies load at full resolution and track their selected gesture');
  await tabs.getByRole('tab', { name: 'Deep edges' }).click();
  await tabs.getByRole('tab', { name: 'Deep edges' }).focus();
  await page.keyboard.press('ArrowDown');
  check(await tabs.getByRole('tab', { name: 'Open thresholds' }).getAttribute('aria-selected') === 'true', 'ArrowDown did not select second design gesture');
  await page.keyboard.press('End');
  check(await tabs.getByRole('tab', { name: 'A timber thread' }).getAttribute('aria-selected') === 'true', 'End did not select timber gesture');
  await page.getByRole('button', { name: 'See the kitchen in 3D' }).click();
  await waitStop('dining');
  check(await page.evaluate(() => document.activeElement.id) === 'experience-title', 'Design-to-studio focus not moved');
  report.checks.push('Design tabs support arrow/end keys and enter the corresponding 3D space');
  await page.locator('.material-switcher').getByRole('button', { name: /Graphite Mineral/ }).click();
  await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.materialMode === 'graphite-mineral');
  check(await page.locator('.material-switcher button[aria-pressed="true"]').count() === 1, 'Palette selection not exclusive');
  const side = await page.locator('.material-study').boundingBox();
  const canvas = await page.locator('.three-canvas').boundingBox();
  check(side.x >= canvas.x + canvas.width - 2, 'Desktop palette is not alongside model');
  report.checks.push('Selected finish applies to the existing model, with chooser alongside it');
  await page.locator('.client-graph li').filter({ hasText: 'Master bedroom' }).getByRole('button').click();
  await waitStop('master');
  await page.getByRole('button', { name: 'Open master bedroom in 3D' }).click();
  check(await page.evaluate(() => document.activeElement.id) === 'experience-title', 'Plan-to-studio focus not moved');
  await waitStop('master');
  report.checks.push('Floor plan opens the selected room in the studio');

  await page.getByLabel('Location', { exact: false }).fill('Lisbon');
  await page.getByLabel('Approximate area', { exact: false }).fill('320');
  await page.getByLabel('Where shall we begin?', { exact: false }).selectOption('New villa concept');
  await page.getByRole('checkbox', { name: 'Natural light' }).check();
  await page.getByRole('radio', { name: 'Kitchen design', exact: true }).check();
  check(await page.locator('#project-area').inputValue() === '', 'Villa area leaked into kitchen');
  check(await page.locator('#project-scope').inputValue() === '', 'Villa scope leaked into kitchen');
  check(await page.locator('#project-location').inputValue() === 'Lisbon', 'Shared location lost');
  await page.locator('#project-area').fill('24.5');
  await page.locator('#project-scope').selectOption('Layout and storage');
  const kitchen = await download('kitchen');
  for (const line of ['Project: Kitchen design', 'Location: Lisbon', 'Approximate area: 24.5 m²', 'Scope: Layout and storage', 'Priorities: Natural light', 'Material direction: Graphite Mineral', 'Concept reference only']) check(kitchen.includes(line), `Missing export field: ${line}`);
  await page.locator('#project-location').fill('Porto');
  // Field edits invalidate the prepared status in a React effect after render.
  // Observe both states instead of sampling text before the effect has run.
  await page.locator('#brief').getByRole('status')
    .filter({ hasText: /^Includes your selected materials and atmosphere\.$/ }).waitFor();
  await page.getByRole('radio', { name: 'Villa architecture', exact: true }).check();
  check(await page.locator('#project-area').inputValue() === '320', 'Villa area was not remembered');
  check(await page.locator('#project-scope').inputValue() === 'New villa concept', 'Villa scope was not remembered');
  await page.locator('#project-area').fill('-2');
  check(!await page.locator('#project-area').evaluate(input => input.checkValidity()), 'Negative area accepted');
  await page.locator('#project-area').fill('320');
  report.checks.push('Brief exports actual fields, isolates category areas/scopes, preserves shared fields, invalidates stale status and rejects negative area');

  await page.locator('#design').scrollIntoViewIfNeeded();
  await page.locator('#design').screenshot({ path: `${output}/design-desktop.png` });
  await page.locator('.overview-button').click();
  await waitStop('overview');
  await page.locator('.residence-workbench').scrollIntoViewIfNeeded();
  await page.locator('.residence-workbench').screenshot({ path: `${output}/studio-desktop.png` });
  await page.locator('#brief').screenshot({ path: `${output}/brief-desktop.png` });

  report.widths = [];
  for (const width of [1024, 796, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.material-switcher').scrollIntoViewIfNeeded();
    const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, links: [...document.querySelectorAll('.project-chapters > div a')].map(a => { const b = a.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, height: b.height }; }) }));
    check(layout.content <= layout.width + 1, `Page overflow at ${width}`);
    check(layout.links.every(link => link.left >= 0 && link.right <= width && link.height >= 44), `Chapter navigation clips or small targets at ${width}`);
    await page.getByRole('navigation', { name: 'Project chapters' }).getByRole('link', { name: 'Plan', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.project-chapters a[href="#journey"]')?.getAttribute('aria-current') === 'location');
    report.widths.push({ width, overflow: layout.content - layout.width });
    if (width === 796) {
      await tabs.getByRole('tab', { name: 'Open thresholds' }).click();
      await page.locator('#design').screenshot({ style: '.project-chapters { visibility: hidden !important; }', path: `${output}/design-796.png` });
    }
    if (width === 390) {
      await page.locator('.kitchen-shortcut').click();
      await waitStop('dining');
      await page.locator('.material-switcher').getByRole('button', { name: /Sandstone Warmth/ }).click();
      await page.waitForFunction(() => document.querySelector('.three-canvas')?.dataset.materialMode === 'sandstone');
      await page.locator('.residence-workbench').screenshot({ path: `${output}/studio-mobile.png` });
      await page.locator('#design').screenshot({ style: ".project-chapters { visibility: hidden !important; }", path: `${output}/design-mobile.png` });
      await page.locator('#brief').screenshot({ style: ".project-chapters { visibility: hidden !important; }", path: `${output}/brief-mobile.png` });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1600 });
  await page.getByRole('navigation', { name: 'Project chapters' }).getByRole('link', { name: 'Brief', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.project-chapters a[href="#brief"]')?.getAttribute('aria-current') === 'location');
  report.checks.push('Final chapter stays active at the page bottom in tall viewports');
  check(report.glbRequests === 1, `Model reloaded ${report.glbRequests} times`);
  check(report.errors.length === 0, `Browser errors: ${report.errors.join('; ')}`);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = String(error.stack ?? error); throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
