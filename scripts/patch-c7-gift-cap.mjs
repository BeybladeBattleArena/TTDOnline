import fs from 'node:fs';

const serverPath='functions/singleplayer-v6.js';
const checkPath='scripts/check-v6-canonical-snapshot-v1.mjs';

let server=fs.readFileSync(serverPath,'utf8');
const oldCap="dice:Array.isArray(reward.dice) ? reward.dice.slice(0,20) : [],";
const newCap="dice:Array.isArray(reward.dice) ? reward.dice.slice(0,100) : [],";
if (!server.includes(oldCap)) throw new Error('Expected 20-die gift reward cap not found.');
if ((server.match(/reward\.dice\.slice\(0,20\)/g)||[]).length !== 1) throw new Error('Gift reward cap anchor is not unique.');
server=server.replace(oldCap,newCap);
fs.writeFileSync(serverPath,server);

let check=fs.readFileSync(checkPath,'utf8');
const anchor="assert(server.includes('canonicalDieKey(cleanString(spec?.key, 40))'),'gift rewards must canonicalize legacy die keys.');";
const assertion="assert(server.includes('reward.dice.slice(0,100)'),'gift codes must support complete-catalog reward bundles without truncation.');";
if (!check.includes(anchor)) throw new Error('Validator anchor not found.');
if (!check.includes(assertion)) check=check.replace(anchor,`${anchor}\n${assertion}`);
fs.writeFileSync(checkPath,check);

console.log('C7 vault gift capacity patch applied.');
