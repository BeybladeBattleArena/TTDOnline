const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const catalog = require('./dicefile.generated.json');

initializeApp();
const db = getFirestore();
const codeHash = '88ae26a42f6af9f02577834e5e7005b87ca6ff0e973c4f62d76aeee94001eb84';
const dieKeys = Object.keys(catalog.dice || {});
if (dieKeys.length !== 51) throw new Error(`Expected 51 canonical dice, found ${dieKeys.length}. Refusing to seed an incomplete vault.`);

async function main() {
  const ref = db.doc(`giftCodes/${codeHash}`);
  const snap = await ref.get();
  if (snap.exists && Number(snap.data()?.redeemedCount || 0) > 0) throw new Error('C7 vault code has already been redeemed; refusing to overwrite it.');
  await ref.set({
    active: true,
    label: 'C7 Complete Dice Vault',
    maxRedemptions: 1,
    redeemedCount: 0,
    catalogVersion: catalog.catalogVersion,
    dieCount: dieKeys.length,
    reward: {
      pips: 0,
      astras: 0,
      dice: dieKeys.map((key) => ({ key, cls: 7 })),
      jewels: [],
      keys: {},
      cards: {},
    },
    createdAt: snap.exists ? (snap.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Provisioned one-use C7 vault for ${dieKeys.length} canonical dice (${catalog.catalogVersion}).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
