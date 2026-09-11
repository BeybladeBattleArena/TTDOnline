(() => {
  'use strict';

  const STYLE_ID = 'ttdJewelPickerUxV1Styles';
  const CARD_CLASS = 'ttdJewelPickerUxV1';
  const PANEL_CLASS = 'ttdJewelPickerSearchPanel';

  function installStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #jewelPickerCard.${CARD_CLASS}{max-height:calc(100dvh - 32px);overflow:hidden;display:flex;flex-direction:column;}
      #jewelPickerCard.${CARD_CLASS} > h2,#jewelPickerCard.${CARD_CLASS} > p,#jewelPickerCard.${CARD_CLASS} > .${PANEL_CLASS},#jewelPickerCard.${CARD_CLASS} > .closeBtn{flex:0 0 auto;}
      #jewelPickerCard.${CARD_CLASS} .enchantCardOptions{flex:1 1 auto;min-height:0;max-height:52dvh;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:2px 4px 6px 0;scrollbar-width:thin;}
      #jewelPickerCard.${CARD_CLASS} .enchantCardOption{flex:0 0 auto;}
      #jewelPickerCard .${PANEL_CLASS}{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:6px;align-items:center;margin:0 0 9px;text-align:left;}
      #jewelPickerCard .ttdJewelPickerSearchInput{width:100%;min-width:0;height:34px;border:1px solid var(--ink-700);border-radius:8px;outline:none;background:var(--ink-950);color:var(--parchment);padding:7px 10px;font-family:'Inter',sans-serif;font-size:12px;-webkit-user-select:text;user-select:text;touch-action:manipulation;}
      #jewelPickerCard .ttdJewelPickerSearchInput::placeholder{color:var(--mist-dim);}
      #jewelPickerCard .ttdJewelPickerSearchInput:focus{border-color:var(--gold);box-shadow:0 0 0 2px rgba(217,178,106,.12);}
      #jewelPickerCard .ttdJewelPickerSearchClear{appearance:none;width:34px;height:34px;padding:0;border:1px solid var(--ink-700);border-radius:8px;background:var(--ink-950);color:var(--mist);font-size:18px;line-height:1;cursor:pointer;touch-action:manipulation;}
      #jewelPickerCard .ttdJewelPickerSearchClear:disabled{opacity:.35;cursor:default;}
      #jewelPickerCard .ttdJewelPickerSearchMeta{grid-column:1 / -1;min-height:11px;margin:-1px 2px 0;color:var(--mist-dim);font-family:'Space Mono',monospace;font-size:9px;line-height:1.2;}
    `;
    document.head.appendChild(style);
  }

  function enhancePicker(card){
    if(!card) return;
    const list = card.querySelector('.enchantCardOptions');
    const buttons = list ? Array.from(list.querySelectorAll('.enchantCardOption[data-jewelinstid]')) : [];
    if(!list || !buttons.length){card.classList.remove(CARD_CLASS);return;}
    card.classList.add(CARD_CLASS);
    if(card.querySelector('.' + PANEL_CLASS)) return;

    const panel = document.createElement('div');
    panel.className = PANEL_CLASS;
    panel.setAttribute('role','search');
    const input = document.createElement('input');
    input.className = 'ttdJewelPickerSearchInput';
    input.type = 'search';
    input.placeholder = 'Search jewels…';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label','Search jewels to socket');
    const clear = document.createElement('button');
    clear.className = 'ttdJewelPickerSearchClear';
    clear.type = 'button';
    clear.textContent = '×';
    clear.setAttribute('aria-label','Clear jewel search');
    const meta = document.createElement('div');
    meta.className = 'ttdJewelPickerSearchMeta';
    panel.append(input,clear,meta);
    list.before(panel);

    const applyFilter = () => {
      const query = input.value.toLowerCase().trim();
      const terms = query.split(/\s+/).filter(Boolean);
      let visible = 0;
      buttons.forEach((button) => {
        const label = button.textContent.toLowerCase();
        const matches = terms.every((term) => label.includes(term));
        button.hidden = !matches;
        if(matches) visible += 1;
      });
      clear.disabled = !query;
      meta.textContent = query ? `${visible} of ${buttons.length} jewels` : `${buttons.length} jewels`;
      list.scrollTop = 0;
    };

    input.addEventListener('input',applyFilter);
    clear.addEventListener('click',() => {input.value='';applyFilter();input.focus({preventScroll:true});});
    applyFilter();
  }

  function boot(){
    installStyles();
    const card = document.getElementById('jewelPickerCard');
    if(!card) return;
    enhancePicker(card);
    new MutationObserver(() => enhancePicker(card)).observe(card,{childList:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
