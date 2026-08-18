(() => {
  'use strict';
  const frame=document.getElementById('gameFrame');

  function activeDeckIsFull(message){
    const decks=message?.decks;
    const idx=Number(message?.activeDeckIdx);
    if(!Array.isArray(decks)||!Number.isInteger(idx)||idx<0||idx>=decks.length)return false;
    const deck=decks[idx];
    return Array.isArray(deck)&&deck.length===5&&deck.every(slot=>
      slot&&typeof slot==='object'&&typeof slot.key==='string'&&slot.key&&typeof slot.instId==='string'&&slot.instId
    );
  }

  // Deck editing remains a local draft while the currently selected deck has an empty slot.
  // This listener runs in capture before the older cloud-sync handlers, so removing a die no
  // longer persists an invalid playable deck to Firebase. As soon as slot five is filled, the
  // next normal save event is allowed through and the authoritative deck sync resumes.
  window.addEventListener('message',(event)=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const message=event.data||{};
    if(message.type!=='ttd:deck-state-request')return;
    if(activeDeckIsFull(message))return;
    event.stopImmediatePropagation();
  },true);
})();