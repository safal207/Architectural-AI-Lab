import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReports } from './summarize.mjs';

function report(score = 0.95) {
  return {
    requestedUrl: 'http://localhost/',
    lighthouseVersion: '12.6.1',
    configSettings: { formFactor: 'mobile' },
    categories: Object.fromEntries(['performance', 'accessibility', 'best-practices', 'seo'].map((id) => [id, { score }])),
    audits: {
      'http-status-code': { score: 1 },
      ...Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift'].map((id) => [id, { numericValue: 1 }])),
    },
  };
}
const context = { profile: 'mobile', target: 'local' };

test('medians retain low scores as visible warnings without masking them', () => {
  const summary = summarizeReports([report(0.2), report(0.8), report(0.95)], context);
  assert.equal(summary.scores.performance, 0.8);
  assert.match(summary.markdown, /performance \| 80 \| Warning/);
});

test('partial collection and Lighthouse runtime failures cannot report success', () => {
  assert.throws(() => summarizeReports([report()], context), /Expected 3/);
  assert.throws(() => summarizeReports([report(), report(), { runtimeError: { message: 'Timeout' } }], context), /Timeout/);
});

test('wrong device, failed HTTP response and missing measurements fail the run', () => {
  const wrongDevice = report();
  wrongDevice.configSettings.formFactor = 'desktop';
  assert.throws(() => summarizeReports([report(), report(), wrongDevice], context), /device profile/);
  const missing = report();
  missing.categories.performance.score = null;
  assert.throws(() => summarizeReports([report(), report(), missing], context), /Missing score/);
  const failed = report();
  failed.audits['http-status-code'].score = 0;
  assert.throws(() => summarizeReports([report(), report(), failed], context), /load successfully/);
});
