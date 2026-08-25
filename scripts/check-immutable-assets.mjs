import fs from 'node:fs';
import crypto from 'node:crypto';

const manifestPath = 'assets/game-assets.json';
const lockPath = 'assets/immutable-assets.lock.json';
const immutableFormats = new Set(['image/png', 'audio/mpeg', 'svg']);

function fail(message) {
  console.error(`immutable-assets: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`could not read ${path}: ${error.message}`);
  }
}

function normalizeAssetPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/assets/')) {
    fail(`invalid registered asset path ${JSON.stringify(path)}`);
  }
  const normalized = path.slice(1);
  if (normalized.includes('..') || normalized.includes('\\')) {
    fail(`unsafe registered asset path ${path}`);
  }
  return normalized;
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

const manifest = readJson(manifestPath);
const lock = readJson(lockPath);

if (lock.schemaVersion !== 1) fail(`unsupported lock schema ${lock.schemaVersion}`);
if (lock.algorithm !== 'git-blob-sha1') fail(`unsupported lock algorithm ${lock.algorithm}`);
if (!lock.assets || typeof lock.assets !== 'object' || Array.isArray(lock.assets)) {
  fail('lock assets must be an object');
}
if (!manifest.assets || typeof manifest.assets !== 'object' || Array.isArray(manifest.assets)) {
  fail('game-assets manifest has no assets object');
}

const registered = new Set();
for (const [assetId, asset] of Object.entries(manifest.assets)) {
  if (!asset || typeof asset !== 'object') fail(`manifest entry ${assetId} is invalid`);
  if (!immutableFormats.has(asset.format)) continue;
  registered.add(normalizeAssetPath(asset.path));
}

const locked = new Set(Object.keys(lock.assets));
const missingLocks = [...registered].filter(path => !locked.has(path)).sort();
const staleLocks = [...locked].filter(path => !registered.has(path)).sort();
if (missingLocks.length) fail(`registered immutable assets missing from lock: ${missingLocks.join(', ')}`);
if (staleLocks.length) fail(`lock contains assets that are no longer registered immutable masters: ${staleLocks.join(', ')}`);

for (const path of [...registered].sort()) {
  if (!fs.existsSync(path)) fail(`registered immutable asset is missing: ${path}`);
  const expected = lock.assets[path];
  if (!/^[0-9a-f]{40}$/.test(expected || '')) fail(`invalid locked hash for ${path}`);
  const actual = gitBlobSha(fs.readFileSync(path));
  if (actual !== expected) {
    fail(`${path} bytes changed (expected ${expected}, got ${actual}). Approved asset changes must update the source file and immutable lock deliberately in the same reviewed change.`);
  }
}

console.log(`immutable-assets: verified ${registered.size} registered PNG/MP3/SVG masters byte-for-byte`);
