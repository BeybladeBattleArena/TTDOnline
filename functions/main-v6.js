const base = require('./index');
const progression = require('./progression-v5');
const singleplayer = require('./singleplayer-v6');
const giftFix = require('./gift-v6-fix2');
const socialFix = require('./social-v6-fix');
module.exports = { ...base, ...progression, ...singleplayer, ...giftFix, ...socialFix };
