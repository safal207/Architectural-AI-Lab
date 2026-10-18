import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const upstream = JSON.parse(await readFile(new URL('../upstream.json', import.meta.url), 'utf8'));
export function verifyAsset(bytes, asset) {
  if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Asset integrity mismatch: ${asset.path}`);
}

export async function prepareAssets() {
  const asset = upstream.farGrid;
  const file = path.join(ROOT, asset.path);
  try {
    const bytes = await readFile(file);
    verifyAsset(bytes, asset);
    return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('[assets] Downloading the pinned upstream mountain grid (24 MB)…');
  const url = `https://raw.githubusercontent.com/Leonxlnx/athenaion/${upstream.revision}/${asset.path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Mountain grid download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyAsset(bytes, asset);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try { await writeFile(temporary, bytes); await rename(temporary, file); }
  finally { await rm(temporary, { force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareAssets();
