import { createServer } from 'vite';
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceFiles = ['public/villa.glb', 'src/three/stairPresentation.js', 'src/three/poolPresentation.js', 'scripts/design-study-renderer.js', 'scripts/generate-design-study.mjs'];
const hash = data => createHash('sha256').update(data).digest('hex');
const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async path => {
  const bytes = await readFile(new URL('../' + path, import.meta.url));
  return [path, hash(path.endsWith('.glb') ? bytes : bytes.toString('utf8').replace(/\r\n/g, '\n'))];
})));
const server = await createServer({
  root: appRoot,
  configFile: false,
  server: { host: '127.0.0.1', port: 0 },
  plugins: [{name: 'design-study-export', configureServer(vite) {
    vite.middlewares.use('/__design-study', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><body style="margin:0"><script type="module" src="/scripts/design-study-renderer.js"></script></body></html>');
    });
  }}]
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors=[];
  page.on('pageerror', error=>errors.push(String(error)));
  await page.goto(server.resolvedUrls.local[0] + '__design-study');
  await page.waitForFunction(() => window.designStudyReady === true, null, { timeout: 120000 });
  const result = await page.evaluate(() => window.exportDesignStudy());
  if (errors.length) throw new Error(errors.join('\n'));
  const directory = new URL('../public/media/design-study/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const images = {};
  for (const [gesture, dataUrl] of Object.entries(result.images)) {
    const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
    const name = gesture + '.webp';
    await writeFile(new URL(name, directory), bytes);
    images[gesture] = { path: 'media/design-study/' + name, sha256: hash(bytes), bytes: bytes.length };
  }
  delete result.images;
  const manifest = { version: 1, sources, images, ...result };
  await writeFile(new URL('../data/design-study.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
  console.log('Exported three axonometric studies from the repaired production GLB:', Object.values(images).map(x=>x.bytes).join(', '), 'bytes');
} finally {
  await browser?.close();
  await server.close();
}
