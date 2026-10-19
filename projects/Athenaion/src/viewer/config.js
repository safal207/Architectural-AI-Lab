import { QUALITY } from '../core/quality.js';

export function readOptions(params, { smallScreen = false, reducedMotion = false } = {}) {
  const shot = Number(params.get('shot'));
  const requested = params.get('quality');
  return {
    shot: Number.isInteger(shot) && shot >= 1 && shot <= 9 ? shot : 1,
    quality: Object.hasOwn(QUALITY, requested) ? requested : smallScreen ? 'lite' : 'preview',
    lang: params.get('lang') === 'en' ? 'en' : 'ru',
    animate: !reducedMotion && params.get('animate') === '1',
    mode: params.get('mode') === 'still' ? 'still' : 'interactive',
  };
}

export function interactiveSize(width, height, quality) {
  const scale = Math.min(1, quality.renderScale ?? 1, Math.sqrt((quality.maxPixels ?? 2_073_600) / Math.max(1, width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function updateViewURL(input, { shot, quality, lang, live = false, animate = false }) {
  const url = new URL(input);
  url.search = '';
  url.hash = live ? 'world' : '';
  url.searchParams.set('shot', String(shot));
  url.searchParams.set('quality', quality);
  url.searchParams.set('lang', lang);
  for (const key of ['only', 'skip', 'test', 'mode', 'w', 'h', 'spp', 'view', 'animate']) url.searchParams.delete(key);
  if (live) url.searchParams.set('view', '3d');
  if (live && animate) url.searchParams.set('animate', '1');
  return url;
}
