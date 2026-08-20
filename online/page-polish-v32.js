(() => {
  'use strict';
  if(window.__TTD_PAGE_POLISH_V32)return;
  window.__TTD_PAGE_POLISH_V32=true;

  const HISTORY_KEY='ttd_gacha_pull_history_v32';
  const style=document.createElement('style');
  style.id='ttd-page-polish-v32-style';
  style.textContent=`
    #ttdGachaHistoryV32{width:min(390px,100%);margin:-4px auto 0;border:1px solid rgba(151,160,189,.24);border-radius:9px;background:rgba(5,7,13,.64);overflow:hidden;}
    #ttdGachaHistoryV32>summary{list-style:none;cursor:pointer;padding:7px 10px;color:var(--mist);font-size:10px;font-weight:700;letter-spacing:.035em;text-align:left;user-select:none;}
    #ttdGachaHistoryV32>summary::-webkit-details-marker{display:none;}
    #ttdGachaHistoryV32>summary::before{content:'▼ ';color:var(--gold);}
    #ttdGachaHistoryV32[open]>summary{border-bottom:1px solid rgba(151,160,189,.16);}
    #ttdGachaHistoryBodyV32{padding:7px 9px 9px;display:flex;flex-direction:column;gap:8px;max-height:34dvh;overflow:auto;}
    .ttdGachaHistoryEntryV32{padding-top:7px;border-top:1px solid rgba(151,160,189,.12);}
    .ttdGachaHistoryEntryV32:first-child{padding-top:0;border-top:0;}
    .ttdGachaHistoryDateV32{margin-bottom:5px;color:var(--mist-dim);font:700 8px 'Space Mono',monospace;}
    .ttdGachaHistoryCardsV32{display:flex;flex-wrap:wrap;gap:4px;}
    .ttdGachaHistoryCardsV32 .pullCard{width:42px!important;height:53px!important;border-radius:7px!important;animation:none!important;transform:none!important;}
    .ttdGachaHistoryCardsV32 .pullCard .glyphWrap{width:23px!important;height:23px!important;margin-top:1px!important;}
    .ttdGachaHistoryCardsV32 .pullCard .pname{font-size:5.7px!important;margin-top:1px!important;line-height:1.05!important;}
    .ttdGachaHistoryCardsV32 .pullCard .prare{font-size:5px!important;line-height:1!important;}
    #deckTabs .deckTab .ttdDeckTabLabel{display:inline-block!important;max-width:calc(100% - 30px)!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;vertical-align:middle!important;}
    #deckTabs .deckTab .ttdDeckEditName{position:static!important;right:auto!important;top:auto!important;transform:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:18px!important;height:18px!important;margin-left:4px!important;padding:0!important;vertical-align:middle!important;}
  `;
  document.head.appendChild(style);

  const safeParse=(value,fallback)=>{try{const v=JSON.parse(value);return v??fallback;}catch(_){return fallback;}};
  const loadHistory=()=>{
    const rows=safeParse(localStorage.getItem(HISTORY_KEY),'');
    return Array.isArray(rows)?rows.slice(0,3):[];
  };
  const saveHistory=(rows)=>{try{localStorage.setItem(HISTORY_KEY,JSON.stringify(rows.slice(0,3)));}catch(_){}};
  function historyHost(){
    const results=document.getElementById('pullResults');
    if(!results)return null;
    let details=document.getElementById('ttdGachaHistoryV32');
    if(!details){
      details=document.createElement('details');details.id='ttdGachaHistoryV32';
      details.innerHTML='<summary>Pull History</summary><div id="ttdGachaHistoryBodyV32"></div>';
      results.insertAdjacentElement('afterend',details);
    }
    return details;
  }
  function formatDate(ms){
    try{return new Date(ms).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(_){return new Date(ms).toLocaleString();}
  }
  function renderHistory(){
    const details=historyHost();if(!details)return;
    const body=document.getElementById('ttdGachaHistoryBodyV32');if(!body)return;
    const rows=loadHistory();
    if(!rows.length){body.innerHTML='<div class="invEmpty" style="padding:8px 4px;font-size:9px">No pulls recorded yet.</div>';return;}
    body.innerHTML='';
    rows.forEach((row)=>{
      const entry=document.createElement('div');entry.className='ttdGachaHistoryEntryV32';
      const date=document.createElement('div');date.className='ttdGachaHistoryDateV32';date.textContent=formatDate(row.at);
      const cards=document.createElement('div');cards.className='ttdGachaHistoryCardsV32';
      (Array.isArray(row.cards)?row.cards:[]).forEach((html)=>{
        const shell=document.createElement('div');shell.innerHTML=String(html||'');const card=shell.firstElementChild;if(card)cards.appendChild(card);
      });
      entry.append(date,cards);body.appendChild(entry);
    });
  }

  const results=document.getElementById('pullResults');
  let captureTimer=0;
  if(results){
    new MutationObserver(()=>{
      clearTimeout(captureTimer);
      captureTimer=setTimeout(()=>{
        const cards=[...results.querySelectorAll(':scope > .pullCard')];
        if(!cards.length)return;
        const rows=loadHistory();
        rows.unshift({at:Date.now(),cards:cards.map((card)=>card.outerHTML)});
        saveHistory(rows);renderHistory();
        const details=historyHost();if(details)details.open=false;
      },35);
    }).observe(results,{childList:true});
  }
  renderHistory();

  function clickIfNeeded(selector,predicate){
    const el=document.querySelector(selector);if(!el)return;
    if(predicate&&!predicate(el))return;
    el.click();
  }
  function setControl(id,value,eventName){
    const el=document.getElementById(id);if(!el||el.value===value)return;
    el.value=value;el.dispatchEvent(new Event(eventName,{bubbles:true}));
  }
  function resetDeckFilters(){
    setControl('deckSearch','', 'input');
    setControl('deckSort','favoriteClass','change');
    setControl('deckRarityFilter','all','change');
    setControl('deckElementFilter','all','change');
    setControl('deckSocketFilter','all','change');
    const fav=document.getElementById('deckFavoriteFilter');if(fav?.classList.contains('active'))fav.click();
    const grid=document.getElementById('collectionGrid');if(grid)grid.scrollTop=0;
  }
  function resetPage(id){
    if(id==='shopScreen'){
      clickIfNeeded('#shopMainTabs [data-shoptab="general"]',(el)=>!el.classList.contains('active'));
      requestAnimationFrame(()=>{
        const btn=[...document.querySelectorAll('#shopSubRow .shopSubBtn')].find((el)=>el.textContent.trim()==='NEW');
        if(btn&&!btn.classList.contains('active'))btn.click();
        document.getElementById('shopGrid')?.scrollTo?.({top:0});
      });
    }else if(id==='inventoryScreen'){
      clickIfNeeded('#invTabs [data-invtab="rewards"]',(el)=>!el.classList.contains('active'));
      document.getElementById('invGrid')?.scrollTo?.({top:0});
    }else if(id==='stageScreen'){
      requestAnimationFrame(()=>clickIfNeeded('#diffRow .diffBtn.normal',(el)=>!el.classList.contains('selected')));
    }else if(id==='deckScreen'){
      requestAnimationFrame(resetDeckFilters);
    }else if(id==='gachaScreen'){
      if(results)results.innerHTML='';
      const details=historyHost();if(details)details.open=false;
      renderHistory();
    }
  }

  let activeId=document.querySelector('.screen.active')?.id||'';
  const observeScreens=()=>{
    const next=document.querySelector('.screen.active')?.id||'';
    if(next&&next!==activeId){activeId=next;resetPage(next);}
  };
  const app=document.getElementById('app')||document.body;
  new MutationObserver(observeScreens).observe(app,{subtree:true,attributes:true,attributeFilter:['class']});
})();
