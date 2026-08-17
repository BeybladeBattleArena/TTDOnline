const base = require('./index');
const progression = require('./progression-v5');
const singleplayer = require('./singleplayer-v6');
const secureGift = require('./gift-v7-secure');
const socialFix = require('./social-v6-fix');
module.exports = { ...base, ...progression, ...singleplayer, ...secureGift, ...socialFix };
