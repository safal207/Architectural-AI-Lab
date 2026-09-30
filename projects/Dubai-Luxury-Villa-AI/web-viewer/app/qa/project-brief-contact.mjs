import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const baseUrl = process.argv[2] ?? process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-project-brief-output';
const viewport = process.env.QA_VIEWPORT ?? 'desktop';
if (!['desktop', 'mobile'].includes(viewport)) throw new Error(`Unknown QA_VIEWPORT: ${viewport}`);
await mkdir(outputDir, { recursive: true });
let checkoutSha = null;
try { checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* Standalone local runs may not have Git metadata. */ }
const report = {
  status: 'RUNNING', url: baseUrl, viewport, checkoutSha,
  prHeadSha: process.env.PR_HEAD_SHA ?? null,
  startedAt: new Date().toISOString(), checks: [], errors: [],
  boundary: 'Browser preparation, clipboard and download only; no email or Telegram delivery is claimed.'
};
let browser;
let page;
function check(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: viewport === 'mobile' ? 390 : 1440, height: 900 },
    isMobile: viewport === 'mobile', hasTouch: viewport === 'mobile', reducedMotion: 'reduce'
  });
  page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', (error) => report.errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(message.text()); });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const brief = page.locator('#brief');
  const resultStatus = brief.locator('.brief-result[role="status"]');
  const email = brief.getByRole('link', { name: 'Email my project brief' });
  await email.click();
  await resultStatus.filter({ hasText: 'Add one detail about your project' }).waitFor();
  check(await page.evaluate(() => document.activeElement?.id === 'project-notes'), 'Empty request did not focus the notes field');
  report.checks.push('Empty enquiry is blocked and focuses notes');

  await brief.getByRole('radio', { name: 'Kitchen design' }).check();
  await brief.getByLabel('Location', { exact: false }).fill('Porto');
  await brief.getByLabel('Approximate area', { exact: false }).fill('24.5');
  await brief.getByLabel('Where shall we begin?', { exact: false }).selectOption('Layout and storage');
  await brief.getByLabel('Budget range', { exact: false }).fill('€20k–30k');
  await brief.getByLabel('Target timing', { exact: false }).selectOption('Within 3 months');
  await brief.getByRole('checkbox', { name: 'Natural light' }).check();
  const extraViews = brief.getByRole('checkbox', { name: /Additional room views/ });
  const walkthrough = brief.getByRole('checkbox', { name: /Interactive 3D walkthrough/ });
  check(!await extraViews.isChecked() && !await walkthrough.isChecked(), 'Optional scope ideas were preselected');
  await extraViews.check();
  await walkthrough.check();
  await brief.getByLabel('What do you have in mind?', { exact: false }).fill('Warm timber & garden views?\nSpace for family breakfasts.');
  const summary = brief.locator('.brief-summary');
  for (const detail of ['Kitchen design', 'Layout and storage', '24.5 m²', '€20k–30k', 'Within 3 months', 'Additional room views', 'Interactive 3D walkthrough']) {
    check((await summary.innerText()).includes(detail), `Enquiry summary is missing ${detail}`);
  }
  const readiness = brief.locator('.brief-readiness');
  await readiness.locator('strong').filter({ hasText: /^5\/5 practical details$/ }).waitFor();
  check(await readiness.getAttribute('role') === 'status', 'Brief readiness is not exposed as a live status');
  check(await readiness.getAttribute('aria-live') === 'polite' && await readiness.getAttribute('aria-atomic') === 'true', 'Brief readiness live-region semantics changed');

  await brief.getByLabel('Target timing', { exact: false }).selectOption('Exploring options');
  await readiness.locator('strong').filter({ hasText: /^4\/5 practical details$/ }).waitFor();
  await summary.getByText('Preview the full message', { exact: true }).click();
  const exploringPreview = await summary.locator('pre').textContent();
  check(exploringPreview.includes('Target timing: Exploring options'), 'Exploration timing context was lost from the brief');
  check(exploringPreview.includes('Next details to define:\n') && exploringPreview.includes('\nTarget timing\n'), 'Exploring options incorrectly removed target timing from next details');
  await summary.getByText('Preview the full message', { exact: true }).click();
  await brief.getByLabel('Target timing', { exact: false }).selectOption('Within 3 months');
  await readiness.locator('strong').filter({ hasText: /^5\/5 practical details$/ }).waitFor();
  report.checks.push('Budget/timing preserved; exploring options gives 4/5 with live-status semantics');

  const href = await email.getAttribute('href');
  check(href.length <= 1800, 'Short fixture unexpectedly exceeds the existing mailto ceiling');
  const draft = new URL(href);
  check(draft.protocol === 'mailto:' && draft.pathname === 'safal0645@gmail.com', 'Email recipient changed');
  check(draft.searchParams.get('subject') === 'Project enquiry — Kitchen design', 'Email subject lost project type');
  const body = draft.searchParams.get('body');
  check(typeof body === 'string', 'Short email draft has no body');
  for (const detail of [
    'Project: Kitchen design', 'Location: Porto', 'Scope: Layout and storage',
    'Approximate area: 24.5 m²', 'Budget range: €20k–30k', 'Target timing: Within 3 months',
    'Priorities: Natural light',
    'Optional ideas to discuss: Additional room views; Interactive 3D walkthrough',
    'Warm timber & garden views?\r\nSpace for family breakfasts.'
  ]) check(body.includes(detail), `Email draft is missing ${detail}`);
  await summary.getByText('Preview the full message', { exact: true }).click();
  check((await summary.locator('pre').textContent()) === body.replace(/\r\n/g, '\n'), 'Full message preview differs from email body');
  await summary.getByRole('button', { name: 'Edit choices' }).click();
  check(await brief.getByRole('radio', { name: 'Villa architecture' }).evaluate((field) => field === document.activeElement), 'Edit choices did not return focus to the project options');

  // Run the real app handler without launching a mail client or sending anything.
  await email.evaluate((element) => element.addEventListener('click', (event) => event.preventDefault(), { once: true, capture: true }));
  await email.click();
  await resultStatus.filter({ hasText: 'Review it and press Send there.' }).waitFor();

  await brief.getByRole('button', { name: 'Copy brief for Telegram' }).click();
  await resultStatus.filter({ hasText: 'Brief copied.' }).waitFor();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  const expectedCopy = body.replace(/\r\n/g, '\n');
  const normalizedClipboard = clipboard.replace(/\r\n/g, '\n');
  check(normalizedClipboard === expectedCopy, 'Copied brief differs from email body');
  check(await brief.getByRole('link', { name: 'Open @Alexfox14' }).getAttribute('href') === 'https://t.me/Alexfox14', 'Telegram contact changed');

  const downloadPromise = page.waitForEvent('download');
  await brief.getByRole('button', { name: 'Download my brief' }).click();
  const download = await downloadPromise;
  check(download.suggestedFilename() === 'architectural-ai-lab-project-brief.txt', 'Download filename changed');
  await download.saveAs(`${outputDir}/short-brief.txt`);
  check(await download.failure() === null, 'Short brief download failed');
  const fileContent = await readFile(`${outputDir}/short-brief.txt`, 'utf8');
  check(fileContent === normalizedClipboard, 'Downloaded brief differs from copied text');
  await resultStatus.filter({ hasText: 'Your brief is ready.' }).waitFor();
  report.checks.push('Short preview, mailto body, real clipboard and real download contain identical text');

  for (const invalidArea of ['0', '-2', '100001']) {
    await brief.getByLabel('Approximate area', { exact: false }).fill(invalidArea);
    await resultStatus.filter({ hasText: 'Includes scope, budget, timing, materials and atmosphere' }).waitFor();
    check(!await brief.getByLabel('Approximate area', { exact: false }).evaluate((field) => field.checkValidity()), `Invalid area ${invalidArea} accepted`);
    check((await summary.locator('dd').allTextContents()).includes('To be measured.'), `Summary shows invalid area ${invalidArea}`);
    check((await summary.locator('pre').textContent()).includes('Approximate area: To be measured.'), `Full preview shows invalid area ${invalidArea}`);
    await email.click();
    check(!(await resultStatus.innerText()).includes('Review it and press Send'), `Invalid area ${invalidArea} opened an email draft`);
  }
  report.checks.push('Zero, negative and over-limit areas invalidate prepared status and block email');

  await brief.getByLabel('Approximate area', { exact: false }).fill('24.5');
  await brief.getByRole('radio', { name: 'Villa architecture' }).check();
  check(await brief.getByLabel('Approximate area', { exact: false }).inputValue() === '', 'Kitchen area leaked into villa');
  await brief.getByRole('radio', { name: 'Kitchen design' }).check();
  check(await brief.getByLabel('Approximate area', { exact: false }).inputValue() === '24.5', 'Kitchen area was lost');
  report.checks.push('Switching project categories isolates and retains their areas');

  const longNotes = 'Ж'.repeat(1000);
  await brief.getByLabel('What do you have in mind?', { exact: false }).fill(longNotes);
  const copyForEmail = brief.getByRole('button', { name: 'Copy full brief for email' });
  await copyForEmail.waitFor();
  const shortEmailHref = await brief.getByRole('link', { name: 'Open email draft' }).getAttribute('href');
  const longDraft = new URL(shortEmailHref);
  check(longDraft.pathname === 'safal0645@gmail.com' && !longDraft.searchParams.has('body'), 'Long brief still depends on a mailto body or changed recipient');
  const longPreview = await summary.locator('pre').textContent();
  check(longPreview.includes(longNotes) && longPreview.includes('Budget range: €20k–30k') && longPreview.includes('Target timing: Within 3 months'), 'Long preview lost entered details');
  await copyForEmail.click();
  await resultStatus.filter({ hasText: 'Brief copied. Open the email draft' }).waitFor();
  check((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n') === longPreview, 'Long brief was not copied in full');
  report.checks.push('Long Unicode brief uses a body-free draft and copies every character');

  // Negative control: neither clipboard path works. Never turn failure into a success notice.
  await page.evaluate(async () => {
    await navigator.clipboard.writeText('preserve-existing-clipboard');
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true, value: async () => { throw new DOMException('Blocked by QA control', 'NotAllowedError'); }
    });
    const originalExecCommand = document.execCommand;
    document.execCommand = function (command, ...args) {
      return command === 'copy' ? false : originalExecCommand.call(this, command, ...args);
    };
  });
  await copyForEmail.click();
  await resultStatus.filter({ hasText: 'Copy is unavailable here. Download the brief' }).waitFor();
  check(!(await resultStatus.innerText()).includes('Brief copied.'), 'Clipboard failure falsely reports success');
  check(await page.evaluate(() => navigator.clipboard.readText()) === 'preserve-existing-clipboard', 'Failed copy changed the existing clipboard');
  const recoveryDownloadPromise = page.waitForEvent('download');
  await brief.getByRole('button', { name: 'Download my brief' }).click();
  const recoveryDownload = await recoveryDownloadPromise;
  await recoveryDownload.saveAs(`${outputDir}/recovery-brief.txt`);
  check(await recoveryDownload.failure() === null, 'Recovery download failed');
  check(await readFile(`${outputDir}/recovery-brief.txt`, 'utf8') === longPreview, 'Recovery download differs from the complete long preview');
  await resultStatus.filter({ hasText: 'Your brief is ready.' }).waitFor();
  report.checks.push('Both clipboard paths denied: honest failure, unchanged clipboard, lossless download recovery');

  check(report.errors.length === 0, `Browser errors: ${report.errors.join('; ')}`);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error?.stack ?? error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  try {
    await writeFile(`${outputDir}/report.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser?.close();
  }
}
