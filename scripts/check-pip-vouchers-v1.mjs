import fs from 'node:fs';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=(path)=>fs.readFileSync(new URL(path,root),'utf8');
const amounts=[1000,5000,10000,20000,40000,60000,80000,100000];
const expectedBlob={
  1000:'e00b9f0fefcc39d7eb525ebdca555626534e7da1',
  5000:'e448ba10efe9d121cea51e893d4c410338c663ff',
  10000:'229efc1571670e743f760c1156041e2d51df5a52',
  20000:'0a4f3422ba908a2f4ea3329ec0cf09c881c14a8d',
  40000:'11dcaf35677a27f90e738417f3852c06e899c1ef',
  60000:'72383d482373782916e4806da1c10b8be902b701',
  80000:'6eebe4fabae69590a20702bfeb1798f46de1fb86',
  100000:'231a82a9c5af9d101cfc88f921da7facb7ecc48f',
};
const fail=(msg)=>{throw new Error(msg);};
const includes=(text,needle,msg)=>{if(!text.includes(needle))fail(msg||`Missing marker: ${needle}`);};
const gitBlobSha=(buf)=>crypto.createHash('sha1').update(Buffer.from(`blob ${buf.length}\0`)).update(buf).digest('hex');

const items=read('functions/items-v1.js');
const gift=read('functions/gift-v7-secure.js');
const ui=read('online/pip-vouchers-v1.js');
const loader=read('online/game-loader.html');
const itemAssets=read('online/item-assets-v1.js');
const itemClient=read('online/item-inventory-client-v1.js');
const manifest=JSON.parse(read('assets/game-assets.json'));
const immutable=JSON.parse(read('assets/immutable-assets.lock.json'));

includes(items,'fixedSellValuePips:amount','Pip Voucher helper must use fixed-value Inventory resale.');
includes(items,"rewardOnly:true",'Pip Vouchers must remain reward-only.');
includes(gift,"'TTD-PIP-VOUCHERS'",'Test redeem code is missing.');
includes(gift,'reward:{ items:PIP_VOUCHER_TEST_ITEMS }','Test code must grant Inventory items, not currency directly.');
includes(gift,'itemGrants:reward.items','Gift-code receipts must record item grants.');
includes(itemClient,"/^Redeemed\\b/i",'Successful gift codes must refresh authoritative item inventory.');
includes(loader,"/online/pip-vouchers-v1.js?v=1",'Pip Voucher Rewards renderer is not loaded independently.');
includes(ui,"String(invActiveTab)==='rewards'",'Pip Vouchers must render only in Rewards.');
includes(ui,"document.querySelector('#tiRoot .tiItems .tiGrid')||document.getElementById('invGrid')",'Pip Vouchers must target the canonical v22 Inventory grid with a legacy fallback.');
includes(ui,'ttdPipVoucherCardV2','Pip Voucher renderer must use the current canonical card contract.');
includes(ui,'new MutationObserver(queueRender)','Pip Voucher renderer must survive Inventory redraws.');
includes(ui,'ttd:item-sell-request','Pip Voucher UI must use generic item selling.');
includes(ui,'object-fit:contain','Voucher art must be contained without crop/stretch.');
if(fs.existsSync(new URL('functions/pip-vouchers-v1.js',root)))fail('Parallel Pip Voucher callable must not exist.');
if(fs.existsSync(new URL('online/pip-voucher-redeem-client-v1.js',root)))fail('Parallel Pip Voucher redeem client must not exist.');

for(const amount of amounts){
  const id=`pip_voucher_${amount}`;
  const filename=`assets/items/pip-voucher-${amount}.png`;
  includes(items,`${id}:pipVoucher(${amount})`,`Missing canonical item definition ${id}.`);
  includes(itemAssets,`${id}:asset('/${filename}')`,`Missing canonical item-art route ${id}.`);
  includes(ui,`${amount}`,`Rewards UI is missing denomination ${amount}.`);
  const path=new URL(filename,root);
  if(!fs.existsSync(path))fail(`Missing PNG master ${filename}.`);
  const buf=fs.readFileSync(path);
  if(buf.length<24||buf.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')fail(`${filename} is not a genuine PNG.`);
  const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
  if(width!==1536||height!==658)fail(`${filename} must remain 1536x658; got ${width}x${height}.`);
  const actual=gitBlobSha(buf);
  if(actual!==expectedBlob[amount])fail(`${filename} bytes changed: expected Git blob ${expectedBlob[amount]}, got ${actual}.`);
  const key=`itemPipVoucher${amount}`;
  const entry=manifest.assets?.[key];
  if(!entry||entry.path!==`/${filename}`||entry.format!=='image/png'||entry.width!==1536||entry.height!==658)fail(`Invalid game-assets registration ${key}.`);
  if(entry.usage?.shop)fail(`${key} must not declare Shop usage.`);
  if(entry.usage?.inventory?.fit!=='contain'||entry.usage?.detail?.fit!=='contain')fail(`${key} must use contain presentation.`);
  if(immutable.assets?.[filename]!==expectedBlob[amount])fail(`Immutable lock mismatch for ${filename}.`);
}

includes(ui,"Looks like you're ${amount.toLocaleString('en-US')} Pips richer! Woohoo! (Sell this item to obtain the currency)",'Canonical voucher flavor-text template changed.');
console.log('Pip Voucher release contract passed.');
