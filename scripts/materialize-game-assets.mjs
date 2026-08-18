import fs from 'node:fs';
import zlib from 'node:zlib';

const sourcePath = 'assets/source/soul-saber-attack.svg.gz.b64';
const outputPath = 'assets/soul-saber-attack.svg';

const packed = fs.readFileSync(sourcePath, 'utf8').trim();
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
console.log(`Materialized ${outputPath} from canonical vector source (${Buffer.byteLength(svg)} bytes).`);
