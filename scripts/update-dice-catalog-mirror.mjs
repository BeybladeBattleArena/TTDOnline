import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const sourcePath = path.join(rootDir, 'dicefile.json');
const mirrorPath = path.join(rootDir, 'functions', 'dicefile.generated.json');

const source = fs.readFileSync(sourcePath);
JSON.parse(source.toString('utf8'));
fs.writeFileSync(mirrorPath, source);
console.log('Updated functions/dicefile.generated.json as an exact mirror of dicefile.json. Review and commit both files together.');
