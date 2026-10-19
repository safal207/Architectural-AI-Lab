import { VIEWS, COPY } from './catalog.js';
import { readOptions, updateViewURL } from './config.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const state = readOptions(params, { smallScreen: matchMedia('(max-width: 700px)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
let live = false, busy = false, attempted = false, activeQuality = state.quality;
let statusKey = '', loadingKey = 'loading', buildIndex = 0, buildTotal = 15;
const copy = () => COPY[state.lang];
const viewURL = (isLive = live) => updateViewURL(location.href, { ...state, live: isLive });
const updateURL = () => history.replaceState(null, '', viewURL());
const status = (key) => { statusKey = key; $('status').textContent = copy()[key] || ''; };

function paintView({ updatePoster = true } = {}) {
  const view = VIEWS.find((v) => v.id === state.shot);
  const [place, title, description] = view[state.lang];
  $('view-place').textContent = place;
  $('view-title').textContent = title;
  $('view-description').textContent = description;
  $('poster').alt = `${title}. ${description}`;
  if (updatePoster) $('poster').src = `./media/shot${state.shot}.webp`;
  $('stage-label').textContent = `${String(state.shot).padStart(2, '0')} / 09 · ${live ? copy().live : copy().gallery}`;
  for (const card of $('shots').children) card.setAttribute('aria-current', String(Number(card.dataset.shot) === state.shot));
}

function paintLanguage() {
  document.documentElement.lang = state.lang;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = copy()[node.dataset.i18n];
  $('language').value = state.lang;
  $('shots').setAttribute('aria-label', copy().shots);
  $('viewport').setAttribute('aria-label', state.lang === 'ru' ? 'Интерактивный 3D-мир' : 'Interactive 3D world');
  $('share-url').setAttribute('aria-label', state.lang === 'ru' ? 'Ссылка на выбранный ракурс' : 'Link to the selected view');
  $('image-credit').textContent = live ? copy().liveCredit : copy().imageCredit;
  $('viewer-note').textContent = live ? copy().liveNote : copy().note;
  $('motion').textContent = state.animate ? copy().pause : copy().motion;
  $('launch').textContent = live ? copy().apply : copy().launch;
  $('loading-title').textContent = copy().building;
  $('loading-detail').textContent = loadingKey === 'progress' ? copy().progress(buildIndex, buildTotal) : copy()[loadingKey];
  $('status').textContent = copy()[statusKey] || '';
  for (const card of $('shots').children) {
    const view = VIEWS.find((v) => v.id === Number(card.dataset.shot));
    card.querySelector('span').textContent = `${String(view.id).padStart(2, '0')} · ${view[state.lang][1]}`;
    card.setAttribute('aria-label', `${view.id}. ${view[state.lang][1]}`);
  }
  paintView({ updatePoster: false });
}

for (const view of VIEWS) {
  const card = document.createElement('button');
  card.type = 'button'; card.className = 'shot'; card.dataset.shot = view.id;
  const image = document.createElement('img');
  image.src = `./media/shot${view.id}.webp`; image.alt = ''; image.loading = 'lazy'; image.width = 192; image.height = 120;
  card.append(image, document.createElement('span'));
  card.addEventListener('click', () => {
    state.shot = view.id;
    if (live) dispatchEvent(new CustomEvent('athenaion:select-shot', { detail: { id: state.shot } }));
    paintView(); updateURL();
  });
  $('shots').append(card);
}
// Ultra remains available to the offline render tools, without being a default browser choice.
if (state.quality === 'ultra') {
  const option = new Option('Ultra', 'ultra'); $('quality').append(option);
}
$('quality').value = state.quality;
paintLanguage(); paintView();
$('cancel-load').href = viewURL(false);

$('language').addEventListener('change', () => { state.lang = $('language').value; paintLanguage(); updateURL(); $('cancel-load').href = viewURL(false); });
$('quality').addEventListener('change', () => {
  state.quality = $('quality').value;
  $('launch').hidden = live && state.quality === activeQuality;
  updateURL();
});
$('gallery').addEventListener('click', () => location.assign(viewURL(false)));
$('motion').addEventListener('click', () => {
  state.animate = !state.animate;
  dispatchEvent(new CustomEvent('athenaion:animate', { detail: { enabled: state.animate } }));
  $('motion').setAttribute('aria-pressed', String(state.animate)); paintLanguage(); updateURL();
});
addEventListener('athenaion:shot-changed', (event) => {
  state.shot = Number(event.detail.id); paintView(); updateURL();
});
addEventListener('athenaion:build-progress', (event) => {
  const d = event.detail;
  buildIndex = d.index; buildTotal = d.total; loadingKey = 'progress';
  $('build-progress').max = d.total; $('build-progress').value = d.completed;
  $('loading-detail').textContent = copy().progress(d.index, d.total);
});
addEventListener('athenaion:compiling', () => { loadingKey = 'compiling'; $('loading-detail').textContent = copy().compiling; });
addEventListener('athenaion:context-lost', () => {
  live = false; $('stage').classList.remove('is-live'); status('contextLost');
  $('launch').hidden = false; $('quality').disabled = false; $('motion').hidden = true;
  paintLanguage(); updateURL();
});

function hasWebGL2() {
  const canvas = document.createElement('canvas');
  let gl;
  try { gl = canvas.getContext('webgl2'); } catch { return false; }
  if (!gl) return false;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

async function launch() {
  if (busy) return;
  if (attempted || live) { location.assign(viewURL(true)); return; }
  if (!hasWebGL2()) { status('unsupported'); return; }
  attempted = true; busy = true; status('');
  $('loading').hidden = false; $('launch').disabled = true; $('quality').disabled = true;
  $('cancel-load').href = viewURL(false);
  for (const card of $('shots').children) card.disabled = true;
  // main.js reads the selected state, including any changes made since page load.
  history.replaceState(null, '', viewURL(true));
  try {
    const { ready } = await import('../main.js');
    await ready;
    live = true; activeQuality = state.quality;
    $('stage').classList.add('is-live'); $('motion').hidden = false; $('gallery').hidden = false;
    $('launch').hidden = true;
    $('motion').setAttribute('aria-pressed', String(state.animate));
    if (window.__BUILD_REPORT?.failures.length) status('partial');
    paintLanguage(); updateURL();
    $('viewport').focus({ preventScroll: true });
  } catch (error) {
    console.error('[viewer]', error);
    status('error'); updateURL();
    $('viewport').replaceChildren();
  } finally {
    busy = false; $('loading').hidden = true; $('launch').disabled = false; $('quality').disabled = false;
    for (const card of $('shots').children) card.disabled = false;
  }
}
$('launch').addEventListener('click', launch);
$('share').addEventListener('click', async () => {
  const url = viewURL();
  try { await navigator.clipboard.writeText(url.href); status('copied'); }
  catch { $('share-url').hidden = false; $('share-url').value = url.href; $('share-url').focus(); $('share-url').select(); status('copyFallback'); }
});

if (state.mode === 'still' || params.has('test')) {
  document.body.classList.add('render-mode');
  $('loading').hidden = false;
  import('../main.js').then(({ ready }) => ready).catch(() => { $('loading').hidden = true; status('error'); });
} else if (params.get('view') === '3d') launch();
