'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();
const REGION = 'us-central1';
const TEST_CODE = 'TTD-PIP-VOUCHERS';
const REDEMPTION_ID = 'pip_voucher_test_pack_v1';
const VOUCHERS = Object.freeze([
  ['pip_voucher_1000',1000],
  ['pip_voucher_5000',5000],
  ['pip_voucher_10000',10000],
  ['pip_voucher_20000',20000],
  ['pip_voucher_40000',40000],
  ['pip_voucher_60000',60000],
  ['pip_voucher_80000',80000],
  ['pip_voucher_100000',100000],
]);

function normalizeCode(value){
  return String(value||'').trim().toUpperCase().replace(/\s+/g,'').slice(0,80);
}
function safeCount(value){
  return Math.max(0,Math.min(999999,Math.floor(Number(value)||0)));
}

exports.redeemPipVoucherTestCodeV1 = onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Authentication required.');
  if(normalizeCode(request.data?.code)!==TEST_CODE)throw new HttpsError('not-found','That online gift code is not valid.');

  const uid=request.auth.uid;
  const redemptionRef=db.doc(`users/${uid}/redemptions/${REDEMPTION_ID}`);
  const gameRef=db.doc(`users/${uid}/game/state`);
  const itemRefs=VOUCHERS.map(([itemId])=>db.doc(`users/${uid}/items/${itemId}`));
  const receiptRef=db.collection(`users/${uid}/transactions`).doc();
  let revision=0,inventoryVersion=0;

  await db.runTransaction(async(tx)=>{
    const [redemptionSnap,gameSnap,...itemSnaps]=await Promise.all([
      tx.get(redemptionRef),tx.get(gameRef),...itemRefs.map(ref=>tx.get(ref)),
    ]);
    if(redemptionSnap.exists)throw new HttpsError('already-exists','This account already redeemed the Pip Voucher test pack.');
    if(!gameSnap.exists)throw new HttpsError('failed-precondition','The online profile is not initialized.');
    const game=gameSnap.data()||{};
    revision=(Number.isSafeInteger(game.revision)?game.revision:0)+1;
    inventoryVersion=(Number.isSafeInteger(game.inventoryVersion)?game.inventoryVersion:0)+1;

    VOUCHERS.forEach(([itemId,amount],index)=>{
      const current=safeCount(itemSnaps[index]?.data()?.count);
      tx.set(itemRefs[index],{
        schemaVersion:1,
        itemId,
        name:`${amount.toLocaleString('en-US')} Pip Voucher`,
        category:'rewards',
        count:current+1,
        source:'pip_voucher_test_code',
        updatedAt:FieldValue.serverTimestamp(),
        updatedAtMs:Date.now(),
      },{merge:true});
    });

    tx.update(gameRef,{revision,inventoryVersion,updatedAt:FieldValue.serverTimestamp()});
    tx.set(redemptionRef,{
      label:'Pip Voucher Test Pack',
      builtin:true,
      itemIds:VOUCHERS.map(([itemId])=>itemId),
      redeemedAt:FieldValue.serverTimestamp(),
    });
    tx.set(receiptRef,{
      operation:'gift_code_items',
      label:'Pip Voucher Test Pack',
      itemGrants:Object.fromEntries(VOUCHERS.map(([itemId])=>[itemId,1])),
      stateRevisionAfter:revision,
      inventoryVersionAfter:inventoryVersion,
      createdAt:FieldValue.serverTimestamp(),
    });
  });

  return {
    ok:true,
    label:'Pip Voucher Test Pack',
    receiptId:receiptRef.id,
    revision,
    inventoryVersion,
    items:VOUCHERS.map(([itemId,amount])=>({itemId,amount,count:1})),
  };
});

exports._PIP_VOUCHER_TEST_CODE=TEST_CODE;
exports._PIP_VOUCHERS=VOUCHERS;
