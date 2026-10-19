import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readOptions, interactiveSize, updateViewURL } from '../src/viewer/config.js';
import { getQuality } from '../src/core/quality.js';
import { VIEWS, COPY } from '../src/viewer/catalog.js';
import { verifyAsset } from '../tools/prepare-assets.mjs';
import { SHOTS } from '../src/world/shots.js';

test('malformed or prototype-named quality and invalid shots use safe defaults', () => {
  for (const shot of ['0', '-2', '2.1', 'NaN', '10']) assert.equal(readOptions(new URLSearchParams({ shot })).shot, 1);
  for (const quality of ['toString', '__proto__', 'constructor', 'missing']) {
    assert.equal(readOptions(new URLSearchParams({ quality })).quality, 'preview');
    assert.equal(getQuality(quality).name, 'preview');
  }
  assert.equal(readOptions(new URLSearchParams(), { smallScreen: true }).quality, 'lite');
});
test('reduced motion overrides an animation deep link', () => {
  assert.equal(readOptions(new URLSearchParams('animate=1'), { reducedMotion: true }).animate, false);
  assert.equal(readOptions(new URLSearchParams('animate=1')).animate, true);
});
test('interactive resolution stays within a pixel budget while retaining aspect', () => {
  for (const name of ['lite', 'preview', 'high']) {
    const q = getQuality(name), size = interactiveSize(3840, 2160, q);
    assert.ok(size.width * size.height <= (q.maxPixels ?? 2073600) * 1.002);
    assert.ok(Math.abs(size.width / size.height - 16 / 9) < .005);
  }
  assert.deepEqual(interactiveSize(0, 0, getQuality('lite')), { width: 1, height: 1 });
});
test('sharing retains the hosting subpath and selected view, and removes render-only overrides', () => {
  const url = updateViewURL('https://example.test/portfolio/athenaion/?only=birds&skip=terrain&mode=still&w=9999&secret=x#about', { shot: 7, quality: 'lite', lang: 'en', live: true, animate: true });
  assert.equal(url.pathname, '/portfolio/athenaion/');
  assert.equal(url.hash, '#world');
  assert.deepEqual(Object.fromEntries(url.searchParams), { shot: '7', quality: 'lite', lang: 'en', view: '3d', animate: '1' });
});
test('gallery IDs match actual cameras, with complete RU and EN copy', () => {
  assert.deepEqual(VIEWS.map((v) => v.id), SHOTS.map((s) => s.id));
  assert.deepEqual(Object.keys(COPY.ru).sort(), Object.keys(COPY.en).sort());
  for (const view of VIEWS) for (const lang of ['ru', 'en']) assert.ok(view[lang].length === 3 && view[lang].every(Boolean));
});
test('asset verification rejects both truncation and same-size corruption', () => {
  const bytes = Buffer.from('verified asset');
  const asset = { path: 'fixture.bin', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  assert.doesNotThrow(() => verifyAsset(bytes, asset));
  assert.throws(() => verifyAsset(bytes.subarray(1), asset), /integrity mismatch/);
  const corrupt = Buffer.from(bytes); corrupt[0] ^= 1;
  assert.throws(() => verifyAsset(corrupt, asset), /integrity mismatch/);
});
