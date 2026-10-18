import { cp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareAssets, upstream } from './prepare-assets.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const arg = process.argv.indexOf('--out');
const out = arg < 0 ? path.join(ROOT, 'dist') : path.resolve(process.argv[arg + 1] || '');
if (out === ROOT || !['dist', 'athenaion'].includes(path.basename(out))) throw new Error('Output must be a dist/ or athenaion/ directory');
await prepareAssets();
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of ['src', 'media', 'viewer.css', 'LICENSE', 'upstream.json']) await cp(path.join(ROOT, name), path.join(out, name), { recursive: true });
await mkdir(path.join(out, 'generated'), { recursive: true });
await cp(path.join(ROOT, upstream.farGrid.path), path.join(out, upstream.farGrid.path));
for (const name of ['build', 'examples/jsm', 'LICENSE']) await cp(path.join(ROOT, 'node_modules/three', name), path.join(out, 'vendor/three', name), { recursive: true });
const html = (await readFile(path.join(ROOT, 'index.html'), 'utf8')).replaceAll('./node_modules/', './vendor/');
await writeFile(path.join(out, 'index.html'), html);
console.log(`[build] Athenaion → ${out}`);
