(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_DIE_INPUT_V1)return;
  window.__TTD_MOVING_SCREEN_DIE_INPUT_V1=true;

  let lane=null,activePointer=null;
  function api(){return window.TTDMovingScreen||null;}
  function consume(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
  function down(event){if(!api()?.active||activePointer!=null)return;const hit=api()?.hitTestDieClient?.(event.clientX,event.clientY);if(!hit)return;if(!api()?.beginDieGestureClient?.(event.clientX,event.clientY,event.pointerId))return;activePointer=event.pointerId;try{lane?.setPointerCapture?.(event.pointerId);}catch(_){}consume(event);}
  function move(event){if(activePointer!==event.pointerId)return;api()?.moveDieGestureClient?.(event.clientX,event.clientY,event.pointerId);consume(event);}
  function finish(event,cancelled=false){if(activePointer!==event.pointerId)return;api()?.endDieGestureClient?.(event.clientX,event.clientY,event.pointerId,cancelled);try{lane?.releasePointerCapture?.(event.pointerId);}catch(_){}activePointer=null;consume(event);}
  function bind(){const next=document.getElementById('laneWrap');if(next===lane)return;if(lane){lane.removeEventListener('pointerdown',down,true);lane.removeEventListener('pointermove',move,true);lane.removeEventListener('pointerup',up,true);lane.removeEventListener('pointercancel',cancel,true);}lane=next;if(!lane)return;lane.addEventListener('pointerdown',down,true);lane.addEventListener('pointermove',move,true);lane.addEventListener('pointerup',up,true);lane.addEventListener('pointercancel',cancel,true);}
  function up(event){finish(event,false);}function cancel(event){finish(event,true);}
  const observer=new MutationObserver(bind);observer.observe(document.documentElement,{childList:true,subtree:true});bind();
})();