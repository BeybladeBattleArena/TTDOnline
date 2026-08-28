import fs from 'node:fs';

const serverPath='functions/singleplayer-v6.js';
const checkPath='scripts/check-v6-canonical-snapshot-v1.mjs';

let server=fs.readFileSync(serverPath,'utf8');
const rewardAnchor="    cards:reward.cards && typeof reward.cards === 'object' ? reward.cards : {},\n";
const rewardInsert="    cards:reward.cards && typeof reward.cards === 'object' ? reward.cards : {},\n    ensureCatalogClass:Number.isSafeInteger(reward.ensureCatalogClass) ? Math.max(1, Math.min(10, reward.ensureCatalogClass)) : null,\n";
if (!server.includes(rewardAnchor)) throw new Error('Gift reward validator anchor not found.');
server=server.replace(rewardAnchor,rewardInsert);

const readAnchor="    const reward = validateGiftReward(codeData.reward); const game = gameSnap.data();\n    const grantedDice = []; const grantedJewels = [];\n";
const readInsert="    const reward = validateGiftReward(codeData.reward); const game = gameSnap.data();\n    const ensuredClassSnap = reward.ensureCatalogClass\n      ? await tx.get(db.collection(`users/${auth.uid}/dice`).where('cls','==',reward.ensureCatalogClass))\n      : null;\n    const existingCatalogKeys = new Set(ensuredClassSnap\n      ? ensuredClassSnap.docs.map((doc) => canonicalDieKey(doc.data()?.key)).filter((key) => !!DICE_RARITY[key])\n      : []);\n    const grantedDice = []; const grantedJewels = [];\n";
if (!server.includes(readAnchor)) throw new Error('Gift transaction read anchor not found.');
server=server.replace(readAnchor,readInsert);

const explicitWrite="      tx.set(db.doc(`users/${auth.uid}/dice/${id}`), { id, key, rarity, source:'gift_code', cls, enchants:[null,null,null,null], createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });\n";
const explicitWriteNew=explicitWrite+"      if (reward.ensureCatalogClass === cls) existingCatalogKeys.add(key);\n";
if (!server.includes(explicitWrite)) throw new Error('Explicit gift die write anchor not found.');
server=server.replace(explicitWrite,explicitWriteNew);

const ensureAnchor="    for (const spec of reward.jewels) {\n";
const ensureBlock="    if (reward.ensureCatalogClass) {\n      for (const key of Object.keys(catalog.dice || {})) {\n        if (existingCatalogKeys.has(key)) continue;\n        const cls = reward.ensureCatalogClass; const id = serverId('d'); const rarity = DICE_RARITY[key];\n        const grant = { key, rarity, instance:{ id, cls, enchants:[null,null,null,null] } }; grantedDice.push(grant); existingCatalogKeys.add(key);\n        tx.set(db.doc(`users/${auth.uid}/dice/${id}`), { id, key, rarity, source:'gift_code_catalog_complete', cls, enchants:[null,null,null,null], createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });\n      }\n    }\n    for (const spec of reward.jewels) {\n";
if (!server.includes(ensureAnchor)) throw new Error('Gift jewel-loop anchor not found.');
server=server.replace(ensureAnchor,ensureBlock);

const receiptAnchor="    tx.set(receiptRef, { operation:'gift_code', codeHash:hash, label:cleanString(codeData.label || '',80), pips:reward.pips, astras:reward.astras, dieIds:grantedDice.map(d=>d.instance.id), jewelIds:grantedJewels.map(j=>j.id), createdAt:FieldValue.serverTimestamp() });\n";
const receiptNew="    tx.set(receiptRef, { operation:'gift_code', codeHash:hash, label:cleanString(codeData.label || '',80), pips:reward.pips, astras:reward.astras, ensureCatalogClass:reward.ensureCatalogClass, dieIds:grantedDice.map(d=>d.instance.id), jewelIds:grantedJewels.map(j=>j.id), createdAt:FieldValue.serverTimestamp() });\n";
if (!server.includes(receiptAnchor)) throw new Error('Gift receipt anchor not found.');
server=server.replace(receiptAnchor,receiptNew);
fs.writeFileSync(serverPath,server);

let check=fs.readFileSync(checkPath,'utf8');
const checkAnchor="assert(server.includes('reward.dice.slice(0,100)'),'gift codes must support complete-catalog reward bundles without truncation.');";
const checks=[
  "assert(server.includes('ensureCatalogClass:Number.isSafeInteger(reward.ensureCatalogClass)'),'gift rewards must support a bounded complete-catalog Class guarantee.');",
  "assert(server.includes(\"where('cls','==',reward.ensureCatalogClass)\"),'complete-catalog gift redemption must inspect existing dice at the requested Class.');",
  "assert(server.includes('for (const key of Object.keys(catalog.dice || {}))'),'complete-catalog gift redemption must derive coverage from the canonical catalog.');",
  "assert(server.includes('if (existingCatalogKeys.has(key)) continue;'),'complete-catalog gift redemption must skip already-owned dice at the requested Class.');"
].join('\n');
if (!check.includes(checkAnchor)) throw new Error('Gift capacity regression anchor not found.');
if (!check.includes("bounded complete-catalog Class guarantee")) check=check.replace(checkAnchor,`${checkAnchor}\n${checks}`);
fs.writeFileSync(checkPath,check);

console.log('Complete C7 make-good gift semantics staged.');
