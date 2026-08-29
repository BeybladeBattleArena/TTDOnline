const base = require('./index');
const progression = require('./progression-v5');
const singleplayer = require('./singleplayer-v6');
const secureGift = require('./gift-v7-secure');
const socialFix = require('./social-v6-fix');
const catalogGacha = require('./catalog-gacha-v7');
const hga1Shop = require('./hga1-shop-v1');
const onboarding = require('./onboarding-v9');
const deckSocial = require('./deck-social-v18');
const overdrive = require('./overdrive-v1');
const runStart = require('./run-start-v19');
const accountProgression = require('./account-progression-v21');
const items = require('./items-v1');
const collectionActions = require('./collection-actions-v1');

module.exports = {
  ...base, ...progression, ...singleplayer, ...secureGift, ...socialFix, ...catalogGacha, ...hga1Shop,
  ...onboarding, ...deckSocial, ...runStart, ...overdrive, ...items,
  mergeAllDiceV1: collectionActions.mergeAllDiceV1,
  sellDieV1: collectionActions.sellDieV1,
  getAccountProgressionV21:accountProgression.getAccountProgressionV21,
};
