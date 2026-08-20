(() => {
  'use strict';
  if(window.__TTD_MESSAGE_NORMALIZER_V32)return;
  window.__TTD_MESSAGE_NORMALIZER_V32=true;
  const frame=document.getElementById('gameFrame');
  window.addEventListener('message',(event)=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const message=event.data;
    if(!message||typeof message!=='object')return;
    if(message.type==='ttd:deck-v18-save-request'||message.type==='ttd:deck-v18-equip-request'){
      try{delete message.name;}catch(_){}
    }
  },true);
})();
