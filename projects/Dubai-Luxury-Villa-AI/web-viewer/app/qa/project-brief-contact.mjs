import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(process.argv[2] ?? process.env.VILLA_URL ?? 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  const brief = page.locator('#brief');
  const email = brief.getByRole('link', { name: 'Email my project brief' });
  await email.click();
  await brief.getByRole('status').filter({ hasText: 'Add one detail about your project' }).waitFor();
  check(await page.evaluate(() => document.activeElement?.id === 'project-notes'), 'Empty request did not focus the notes field');

  await brief.getByRole('radio', { name: 'Kitchen design' }).check();
  await brief.getByLabel('Location', { exact: false }).fill('Porto');
  await brief.getByLabel('Approximate area', { exact: false }).fill('24.5');
  await brief.getByLabel('Where shall we begin?', { exact: false }).selectOption('Layout and storage');
  await brief.getByRole('checkbox', { name: 'Natural light' }).check();
  const extraViews = brief.getByRole('checkbox', { name: /Additional room views/ });
  const walkthrough = brief.getByRole('checkbox', { name: /Interactive 3D walkthrough/ });
  check(!await extraViews.isChecked() && !await walkthrough.isChecked(), 'Optional scope ideas were preselected');
  await extraViews.check();
  await walkthrough.check();
  await brief.getByLabel('What do you have in mind?', { exact: false }).fill('Warm timber & garden views?\nSpace for family breakfasts.');
  const summary = brief.locator('.brief-summary');
  for (const detail of ['Kitchen design', 'Layout and storage', '24.5 m²', 'Additional room views', 'Interactive 3D walkthrough']) {
    check((await summary.innerText()).includes(detail), `Enquiry summary is missing ${detail}`);
  }

  const href = await email.getAttribute('href');
  const draft = new URL(href);
  check(draft.protocol === 'mailto:' && draft.pathname === 'safal0645@gmail.com', 'Email recipient changed');
  check(draft.searchParams.get('subject') === 'Project enquiry — Kitchen design', 'Email subject lost project type');
  const body = draft.searchParams.get('body');
  for (const detail of [
    'Project: Kitchen design', 'Location: Porto', 'Scope: Layout and storage',
    'Approximate area: 24.5 m²', 'Priorities: Natural light',
    'Optional ideas to discuss: Additional room views; Interactive 3D walkthrough',
    'Warm timber & garden views?\r\nSpace for family breakfasts.'
  ]) check(body.includes(detail), `Email draft is missing ${detail}`);
  await summary.getByText('Preview the full message', { exact: true }).click();
  check((await summary.locator('pre').textContent()) === body.replace(/\r\n/g, '\n'), 'Full message preview differs from email body');
  await summary.getByRole('button', { name: 'Edit choices' }).click();
  check(await brief.getByRole('radio', { name: 'Villa architecture' }).evaluate((field) => field === document.activeElement), 'Edit choices did not return focus to the project options');

  // Let the user-action handler run without asking the test machine to launch an email app.
  await email.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
  await email.click();
  await brief.getByRole('status').filter({ hasText: 'Review it and press Send there.' }).waitFor();

  await brief.getByRole('button', { name: 'Copy brief for Telegram' }).click();
  await brief.getByRole('status').filter({ hasText: 'Brief copied.' }).waitFor();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const expectedCopy = body.replace(/\r\n/g, '\n');
  const normalizedClipboard = clipboard.replace(/\r\n/g, '\n');
  check(normalizedClipboard === expectedCopy, 'Copied brief differs from email body');
  check(await brief.getByRole('link', { name: 'Open @Alexfox14' }).getAttribute('href') === 'https://t.me/Alexfox14', 'Telegram contact changed');

  const downloadPromise = page.waitForEvent('download');
  await brief.getByRole('button', { name: 'Download my brief' }).click();
  const download = await downloadPromise;
  check(download.suggestedFilename() === 'architectural-ai-lab-project-brief.txt', 'Download filename changed');
  const fileContent = await readFile(await download.path(), 'utf8');
  check(fileContent === normalizedClipboard, 'Downloaded brief differs from copied text');
  await brief.getByRole('status').filter({ hasText: 'Your brief is ready.' }).waitFor();

  for (const invalidArea of ['0', '-2', '100001']) {
    await brief.getByLabel('Approximate area', { exact: false }).fill(invalidArea);
    await brief.getByRole('status').filter({ hasText: 'Includes your selected materials and atmosphere.' }).waitFor();
    check(!await brief.getByLabel('Approximate area', { exact: false }).evaluate((field) => field.checkValidity()), `Invalid area ${invalidArea} accepted`);
    check((await summary.locator('dd').allTextContents()).includes('To be measured.'), `Summary shows invalid area ${invalidArea}`);
    check((await summary.locator('pre').textContent()).includes('Approximate area: To be measured.'), `Full preview shows invalid area ${invalidArea}`);
  }
  await email.click();
  check(!await brief.getByRole('status').innerText().then((text) => text.includes('Review it and press Send')), 'Invalid area opened an email draft');

  await brief.getByLabel('Approximate area', { exact: false }).fill('24.5');
  await brief.getByRole('radio', { name: 'Villa architecture' }).check();
  check(await brief.getByLabel('Approximate area', { exact: false }).inputValue() === '', 'Kitchen area leaked into villa');
  await brief.getByRole('radio', { name: 'Kitchen design' }).check();
  check(await brief.getByLabel('Approximate area', { exact: false }).inputValue() === '24.5', 'Kitchen area was lost');
  const longNotes = 'Ж'.repeat(1000);
  await brief.getByLabel('What do you have in mind?', { exact: false }).fill(longNotes);
  const copyForEmail = brief.getByRole('button', { name: 'Copy full brief for email' });
  await copyForEmail.waitFor();
  const shortEmailHref = await brief.getByRole('link', { name: 'Open email draft' }).getAttribute('href');
  check(!shortEmailHref.includes('&body='), 'Long brief still depends on a mailto body');
  await copyForEmail.click();
  await brief.getByRole('status').filter({ hasText: 'Brief copied. Open the email draft' }).waitFor();
  check((await page.evaluate(() => navigator.clipboard.readText())).includes(longNotes), 'Long brief was not copied in full');
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  console.log('PASS: brief validates requests, populates email, copies to Telegram, downloads the same text and retains type drafts.');
} finally {
  await browser.close();
}
