import fs from 'node:fs';

const file='random-dice-game-33.html';
let s=fs.readFileSync(file,'utf8');
function one(from,to,label){const n=s.split(from).length-1;if(n!==1)throw new Error(`${label}: expected one match, found ${n}`);s=s.replace(from,to);}

one("icon:()=>keySVG('normal'), grant:()=>grantRewardKey('normal')","icon:()=>keySVG('normal'), grant:(purchase)=>grantRewardKey('normal',purchase)",'normal key provenance');
one("icon:()=>keySVG('hard'),   grant:()=>grantRewardKey('hard')","icon:()=>keySVG('hard'),   grant:(purchase)=>grantRewardKey('hard',purchase)",'hard key provenance');
one("icon:()=>keySVG('hell'),   grant:()=>grantRewardKey('hell')","icon:()=>keySVG('hell'),   grant:(purchase)=>grantRewardKey('hell',purchase)",'hell key provenance');
one("icon:()=>cardSVG('lesser'), grant:()=>grantEnchantCard('lesser')","icon:()=>cardSVG('lesser'), grant:(purchase)=>grantEnchantCard('lesser',purchase)",'lesser card provenance');
one("icon:()=>cardSVG('master'), grant:()=>grantEnchantCard('master')","icon:()=>cardSVG('master'), grant:(purchase)=>grantEnchantCard('master',purchase)",'master card provenance');

const start=s.indexOf('  function showBuyConfirm(cardEl, view){');
const end=s.indexOf('  function shopSellValuePips',start);
if(start<0||end<0||end<=start)throw new Error('buy-confirm section markers missing');
const replacement=`  function showBuyConfirm(cardEl, view){
    let qty=1;
    const currency=view.currency==='astras'?'astras':'pips';
    const currencyLabel=currency==='astras'?'Astras':'Pips';
    const balance=()=>currency==='astras'?Math.max(0,Math.floor(Number(account.astras)||0)):Math.max(0,Math.floor(Number(account.gold)||0));
    function render(){
      const total=view.cost*qty;
      cardEl.innerHTML=\`
        <h2 style="margin-top:6px;">Confirm Purchase</h2>
        \${view.multiBuy?\`
          <div class="qtyRow">
            <button class="qtyBtn" id="qtyMinus" \${qty<=1?'disabled':''}>−</button>
            <span class="qtyVal">\${qty}</span>
            <button class="qtyBtn" id="qtyPlus" \${(qty+1)*view.cost>balance()?'disabled':''}>+</button>
          </div>\`:''}
        <p style="color:var(--mist); font-size:13px; margin:12px 0 18px;">Buy this item for \${total} \${currencyLabel}?</p>
        <button class="closeBtn" id="buyYesBtn">Yes</button>
        <button class="closeBtn" id="buyCancelBtn" style="margin-top:8px; background:var(--ink-700);">Cancel</button>
      \`;
      document.getElementById('buyYesBtn').addEventListener('click',()=>{
        if(balance()<total){toastGlobal('Not enough '+currencyLabel);return;}
        if(currency==='astras')account.astras=Math.max(0,Math.floor(Number(account.astras)||0)-total);else account.gold=Math.max(0,Math.floor(Number(account.gold)||0)-total);
        for(let i=0;i<qty;i++)view.onBuy();
        saveAccount();renderShopGold();hideItemDetail();toastGlobal('Purchased '+qty+'× '+view.name);if(typeof shopActiveTab!=='undefined')renderShopGrid();
      });
      document.getElementById('buyCancelBtn').addEventListener('click',()=>renderItemDetailView(cardEl,view));
      if(view.multiBuy){
        document.getElementById('qtyMinus').addEventListener('click',()=>{if(qty>1){qty--;render();}});
        document.getElementById('qtyPlus').addEventListener('click',()=>{if((qty+1)*view.cost<=balance()){qty++;render();}});
      }
    }
    render();
  }
`;
s=s.slice(0,start)+replacement+s.slice(end);
fs.writeFileSync(file,s);
console.log('Currency-aware Shop purchase provenance materialized.');
