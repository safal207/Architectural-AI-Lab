import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'];
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

export function summarizeReports(reports, { profile, target }) {
  if (reports.length !== 3) throw new Error(`Expected 3 complete reports, received ${reports.length}`);
  for (const report of reports) {
    if (report.runtimeError) throw new Error(`Lighthouse failed: ${report.runtimeError.message}`);
    if (report.configSettings?.formFactor !== profile) throw new Error('Unexpected device profile');
    if (report.audits?.['http-status-code']?.score !== 1) throw new Error('Page did not load successfully');
    for (const id of categories) {
      if (!Number.isFinite(report.categories?.[id]?.score)) throw new Error(`Missing score: ${id}`);
    }
    for (const id of metrics) {
      if (!Number.isFinite(report.audits?.[id]?.numericValue)) throw new Error(`Missing metric: ${id}`);
    }
  }
  const scores = Object.fromEntries(categories.map((id) => [id, median(reports.map((report) => report.categories[id].score))]));
  const values = Object.fromEntries(metrics.map((id) => [id, median(reports.map((report) => report.audits[id].numericValue))]));
  const warnings = [...new Set(reports.flatMap((report) => report.runWarnings || []))];
  const lines = [
    `## Lighthouse — ${profile} / ${target}`,
    '',
    `URL: ${reports[0].requestedUrl}`,
    `Lighthouse ${reports[0].lighthouseVersion}; ${reports.length} runs. Each value below is its own median.`,
    '',
    '| Category | Score / 100 | Target |',
    '| --- | ---: | --- |',
    ...categories.map((id) => `| ${id} | ${Math.round(scores[id] * 100)} | ${scores[id] >= 0.9 ? 'Met' : 'Warning: below 90'} |`),
    '',
    '| Metric | Median |',
    '| --- | ---: |',
    ...metrics.map((id) => `| ${id} | ${id === 'cumulative-layout-shift' ? values[id].toFixed(3) : `${Math.round(values[id])} ms`} |`),
    '',
    'Scores below 90 are advisory. A green job means the audit completed, not that every quality target was met.',
    'Download the HTML/JSON reports from this run’s artifacts for findings. Lab measurements do not certify real-user performance or 3D interaction behavior.',
    ...(warnings.length ? ['', 'Lighthouse run warnings:', ...warnings.map((warning) => `- ${warning}`)] : []),
    '',
  ];
  return { profile, target, runs: reports.length, scores, metrics: values, warnings, markdown: lines.join('\n') };
}

async function main() {
  const directory = '.lighthouseci';
  const files = (await readdir(directory)).filter((name) => /^lhr-.*\.json$/.test(name));
  const reports = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))));
  const summary = summarizeReports(reports, {
    profile: process.env.LIGHTHOUSE_PROFILE || 'mobile',
    target: process.env.LIGHTHOUSE_TARGET || 'local',
  });
  await mkdir('reports', { recursive: true });
  await writeFile('reports/summary.json', JSON.stringify(summary, null, 2));
  await writeFile('reports/summary.md', summary.markdown);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary.markdown);
  console.log(summary.markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
