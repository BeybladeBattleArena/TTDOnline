import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const sourceDir = 'assets/source/soul-saber-attack';
const sourceManifestPath = path.join(sourceDir, 'parts.json');
const outputPath = 'assets/soul-saber-attack.svg';
const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

if (sourceManifest.encoding !== 'gzip+base64' || !Array.isArray(sourceManifest.parts) || !sourceManifest.parts.length) {
  throw new Error('Soul Saber vector source manifest is invalid.');
}

const chunks = sourceManifest.parts.map((part) => {
  const file = path.join(sourceDir, part.file);
  const text = fs.readFileSync(file, 'utf8').trim();
  if (text.length !== part.length) throw new Error(`${part.file}: length mismatch.`);
  if (sha256(text) !== part.sha256) throw new Error(`${part.file}: SHA-256 mismatch.`);
  return text;
});
const packed = chunks.join('');
if (packed.length !== sourceManifest.joinedLength) throw new Error('Soul Saber packed source length mismatch.');
if (sha256(packed) !== sourceManifest.joinedSha256) throw new Error('Soul Saber packed source SHA-256 mismatch.');

const svg = zlib.gunzipSync(Buffer.from(packed, 'base64')).toString('utf8');
const required = [
  '<svg',
  'viewBox="0 0 1536 1536"',
  'id="weaponOutline"',
  'id="weapon-shape"',
  'filter="url(#weaponOutline)"',
  'scale(.66667)',
  '<path',
];
for (const marker of required) {
  if (!svg.includes(marker)) throw new Error(`Soul Saber vector source is missing ${marker}.`);
}
for (const forbidden of ['<image', 'data:image/', '<foreignObject']) {
  if (svg.includes(forbidden)) throw new Error(`Soul Saber vector source contains forbidden raster/embed content: ${forbidden}`);
}

fs.writeFileSync(outputPath, svg);
console.log(`Materialized ${outputPath} from checksummed canonical vector source (${Buffer.byteLength(svg)} bytes).`);
