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
    const image = document.querySelector('.hero-image img');
    if (!hero || !copy || !heading || !lead || !actions || !image) return null;

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

    const sectionSelectors = [
      '.app-shell',
      '.site-header',
      '.sales-hero',
      '.hero-image',
      '.hero-enter',
      '.spaces-section',
      '.space-stories',
      '.experience-section',
      '.tour-experience',
      '.house-plan-card',
      '.client-graph-card',
      '.viewer-toolbar',
      '.app-grid',
      '.viewer-panel',
      '.three-canvas',
      '.material-story',
      '.material-switcher',
      '.project-brief',
      '.site-footer'
    ];
    const sections = Object.fromEntries(sectionSelectors.map((selector) => {
      const node = document.querySelector(selector);
      return [selector, node ? box(node) : null];
    }));

    return {
      document: { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth },
      hero: box(hero),
      copy: box(copy),
      heading: box(heading),
      lead: box(lead),
      actions: box(actions),
      heroImage: { complete: image.complete, naturalWidth: image.naturalWidth, currentSrc: image.currentSrc },
      sections,
      offenders
    };
  });

  check(metrics, `${label}: hero metrics unavailable`);
  // The mobile hero image intentionally reaches the viewport edges beyond the
  // inset copy column. Check its viewport bounds separately, while requiring
  // all text and controls to remain internally contained.
  for (const key of ['copy', 'heading', 'lead', 'actions']) {
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

function assertPageContained(metrics, label) {
  check(
    metrics.document.scrollWidth <= metrics.document.clientWidth + 1,
    `${label}: horizontal overflow (${metrics.document.scrollWidth}px > ${metrics.document.clientWidth}px); sections=${JSON.stringify(metrics.sections)}; offenders=${JSON.stringify(metrics.offenders)}`
  );
  check(metrics.heroImage.complete && metrics.heroImage.naturalWidth > 0, `${label}: residence hero image failed to load`);
  for (const [selector, section] of Object.entries(metrics.sections)) {
    check(section, `${label}: missing section ${selector}`);
    check(
      section.left >= -1 && section.right <= metrics.document.clientWidth + 1,
      `${label}: ${selector} extends outside the viewport (${section.left}px–${section.right}px)`
    );
    if (selector !== '.sales-hero') {
      check(
        section.scrollWidth <= section.clientWidth + 1,
        `${label}: ${selector} overflows internally (${section.scrollWidth}px > ${section.clientWidth}px)`
      );
    }
  }
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
  await page.waitForFunction(() => {
    const image = document.querySelector('.hero-image img');
    return image?.complete && image.naturalWidth > 0;
  });
  await page.evaluate(() => document.fonts.ready);

  for (const [label, width] of [['390', 390], ['320', 320], ['390-return', 390]]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    const metrics = await measure(page, label);
    report.widths[label] = metrics;
    metrics.windowMaxScrollX = await page.evaluate(() => {
      const y = window.scrollY;
      // Override the page's smooth scrolling so the result is read after the move.
      window.scrollTo({ left: 99999, top: y, behavior: 'instant' });
      const x = window.scrollX;
      window.scrollTo({ left: 0, top: y, behavior: 'instant' });
      return x;
    });
    await page.screenshot({ path: `${outputDir}/hero-${label}.png`, fullPage: false, animations: 'disabled' });
    assertPageContained(metrics, label);
    check(metrics.windowMaxScrollX <= 1, `${label}: page can scroll horizontally by ${metrics.windowMaxScrollX}px`);
  }

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
