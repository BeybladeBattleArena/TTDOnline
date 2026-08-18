import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const sourcePath = path.join(rootDir, 'dicefile.json');
const outputPath = path.join(rootDir, 'functions', 'dicefile.generated.json');
const catalog = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const allowedRarities = new Set(['common','rare','unique','legendary']);
const allowedCategories = new Set(['physical','special','status']);
const errors = [];

if (catalog.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
if (!catalog.catalogVersion || typeof catalog.catalogVersion !== 'string') errors.push('catalogVersion must be a non-empty string.');
if (!catalog.dice || typeof catalog.dice !== 'object' || Array.isArray(catalog.dice)) errors.push('dice must be an object keyed by permanent die ID.');

const names = new Map();
for (const [key, die] of Object.entries(catalog.dice || {})) {
  if (!/^[a-z0-9]+$/.test(key)) errors.push(`${key}: die key must contain only lowercase letters and numbers.`);
  if (!die || typeof die !== 'object' || Array.isArray(die)) { errors.push(`${key}: definition must be an object.`); continue; }
  if (typeof die.name !== 'string' || !die.name.trim()) errors.push(`${key}: name is required.`);
  if (names.has(die.name)) errors.push(`${key}: display name duplicates ${names.get(die.name)} (${die.name}).`);
  else names.set(die.name, key);
  if (!allowedRarities.has(die.rarity)) errors.push(`${key}: unsupported rarity ${die.rarity}.`);
  if (!allowedCategories.has(die.category)) errors.push(`${key}: unsupported category ${die.category}.`);
  if (!Number.isFinite(die.dmg) || die.dmg < 0) errors.push(`${key}: dmg must be a non-negative number.`);
  if (!Number.isFinite(die.atk) || die.atk <= 0) errors.push(`${key}: atk must be greater than 0.`);
  if (!Number.isFinite(die.hp) || die.hp <= 0) errors.push(`${key}: hp must be greater than 0.`);
  if (!die.affinities || typeof die.affinities !== 'object' || Array.isArray(die.affinities)) errors.push(`${key}: affinities must be an object.`);
  else {
    const affinityTotal = Object.values(die.affinities).reduce((sum, value) => sum + (Number(value) || 0), 0);
    if (affinityTotal > 1.000001) errors.push(`${key}: elemental affinities total more than 100%.`);
    for (const [element, value] of Object.entries(die.affinities)) {
      if (!Number.isFinite(value) || value < 0 || value > 1) errors.push(`${key}: affinity ${element} must be between 0 and 1.`);
    }
  }
  if (die.special && (typeof die.special !== 'object' || Array.isArray(die.special) || typeof die.special.kind !== 'string')) {
    errors.push(`${key}: special must be an object with a string kind.`);
  }
}

const soul = catalog.dice?.soulscimitar;
if (!soul) errors.push('Soul Scimitar is missing.');
else {
  if (soul.atk !== 4.3) errors.push('Soul Scimitar cooldown must remain 4.3 seconds unless its design is intentionally revised.');
  if (soul.category !== 'special') errors.push('Soul Scimitar must use Special damage.');
  if (Number(soul.affinities?.arcane) !== 1) errors.push('Soul Scimitar must remain 100% Arcane.');
  if (soul.special?.kind !== 'soulScimitar') errors.push('Soul Scimitar must use the soulScimitar runtime handler.');
  if (soul.special?.healFraction !== 0.25) errors.push('Soul Scimitar C4 healing must be 25%.');
  if (soul.special?.targetSlowChance !== 0.15) errors.push('Soul Scimitar C5 Slow chance must be 15%.');
  if (soul.special?.pierceSlowChance !== 0.07) errors.push('Soul Scimitar C7 pierce Slow chance must be 7%.');
}

if (errors.length) {
  console.error(`dicefile.json failed validation with ${errors.length} error(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

const generated = {
  schemaVersion: catalog.schemaVersion,
  catalogVersion: catalog.catalogVersion,
  dice: catalog.dice,
};
fs.mkdirSync(path.dirname(outputPath), { recursive:true });
fs.writeFileSync(outputPath, JSON.stringify(generated, null, 2) + '\n');
console.log(`Validated ${Object.keys(catalog.dice).length} dice and generated functions/dicefile.generated.json.`);
