const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const catalog = require('./dicefile.generated.json');

initializeApp();
const db = getFirestore();
const codeHash = 'b24bcd1535d69e85af89ab74f02aa3698884f09f5800f3dd4a2c3162d95319ee';
const dieKeys = Object.keys(catalog.dice || {});
if (dieKeys.length !== 51) throw new Error(`Expected 51 canonical dice, found ${dieKeys.length}. Refusing to seed an incomplete make-good code.`);

async function main() {
  const ref = db.doc(`giftCodes/${codeHash}`);
  const snap = await ref.get();
  if (snap.exists && Number(snap.data()?.redeemedCount || 0) > 0) throw new Error('Complete C7 make-good code has already been redeemed; refusing to overwrite it.');
  await ref.set({
    active: true,
    label: 'C7 Complete Catalog Make-Good',
    maxRedemptions: 1,
    redeemedCount: 0,
    catalogVersion: catalog.catalogVersion,
    dieCount: dieKeys.length,
    reward: {
      pips: 0,
      astras: 0,
      dice: [],
      ensureCatalogClass: 7,
      jewels: [],
      keys: {},
      cards: {},
    },
    createdAt: snap.exists ? (snap.data()?.createdAt || FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`Provisioned one-use complete-C7 make-good for ${dieKeys.length} canonical dice (${catalog.catalogVersion}).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
