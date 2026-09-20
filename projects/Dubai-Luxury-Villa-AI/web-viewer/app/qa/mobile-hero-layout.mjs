import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VILLA_URL ?? 'http://127.0.0.1:4173/';
const outputDir = process.env.QA_OUTPUT ?? 'qa-mobile-hero-layout-output';
await mkdir(outputDir, { recursive: true });

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function measure(page, label) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const hero = document.querySelector('.sales-hero');
    const copy = document.querySelector('.sales-hero__copy');
    const heading = document.querySelector('.sales-hero h1');
    const lead = document.querySelector('.sales-hero__lead');
    const actions = document.querySelector('.sales-hero__actions');
    if (!hero || !copy || !heading || !lead || !actions) return null;

    const box = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth
      };
    };

    const offenders = [...document.querySelectorAll('body *')]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          className: typeof node.className === 'string' ? node.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth
        };
      })
      .filter((item) => item.width > 0 && (item.left < -1 || item.right > root.clientWidth + 1))
      .slice(0, 16);

    return {
      document: { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth },
      hero: box(hero),
      copy: box(copy),
      heading: box(heading),
      lead: box(lead),
      actions: box(actions),
      offenders
    };
  });

  check(metrics, `${label}: hero metrics unavailable`);
  check(
    metrics.document.scrollWidth <= metrics.document.clientWidth + 1,
    `${label}: document overflows horizontally (${metrics.document.scrollWidth}px > ${metrics.document.clientWidth}px); offenders=${JSON.stringify(metrics.offenders)}`
  );
  for (const key of ['hero', 'copy', 'heading', 'lead', 'actions']) {
    const value = metrics[key];
    check(
      value.scrollWidth <= value.clientWidth + 1,
      `${label}: ${key} clips internally (${value.scrollWidth}px > ${value.clientWidth}px)`
    );
  }
  check(
    metrics.copy.right <= metrics.hero.right + 1,
    `${label}: hero copy extends beyond hero card (${metrics.copy.right}px > ${metrics.hero.right}px)`
  );

  return metrics;
}

const browser = await chromium.launch({ headless: true });
const report = {
  status: 'RUNNING',
  widths: {},
  consoleErrors: [],
  pageErrors: []
};

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error)));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('.sales-hero h1').waitFor({ state: 'visible', timeout: 30_000 });

  report.widths['390'] = await measure(page, '390px');
  await page.screenshot({ path: `${outputDir}/hero-390.png`, fullPage: false, animations: 'disabled' });

  await page.setViewportSize({ width: 320, height: 800 });
  report.widths['320'] = await measure(page, '320px');
  await page.screenshot({ path: `${outputDir}/hero-320.png`, fullPage: false, animations: 'disabled' });

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
