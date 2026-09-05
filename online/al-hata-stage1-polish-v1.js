/* Al Hata Stage 1 refinement layer. Loaded last so authored region modules stay independently removable. */
window.__TTD_AL_HATA_STAGE1_POLISH_V1=true;

const AH_POLISH_SHELL_SPOTS=[
  {x:760,z:-250,y:1},{x:885,z:245,y:1},{x:1035,z:-270,y:1},{x:1185,z:255,y:1},
];
const AH_POLISH_OBJECTIVES={
  beach:['LANDING SHORE','Follow the coast inland'],
  jungle:['GOBLIN FRINGE','Push through the outer camp'],
  deepJungle:['DEEP JUNGLE','Climb through the old ruins'],
  fork:['ROUTE FORK','Cliff platforms or ambush bridge'],
  postFork:['TEMPLE TRAIL','The two routes reconverge'],
  templeApproach:['TEMPLE APPROACH','Reach the mountain forecourt'],
};
const AH_POLISH_COMBAT={
  1:['LANDING SHORE','Landfall'],
  2:['GOBLIN FRINGE','The jungle closes in'],
  3:['DEEP JUNGLE RUINS','Old Die Master ground'],
  4:['BRIDGE AMBUSH','Hold the center'],
  5:['TEMPLE FORECOURT','The mountain temple'],
};

function AH_polishRoundRect(g,x,y,w,h,r){
  const rr=Math.min(r,w*.5,h*.5);g.beginPath();g.moveTo(x+rr,y);g.lineTo(x+w-rr,y);g.quadraticCurveTo(x+w,y,x+w,y+rr);g.lineTo(x+w,y+h-rr);g.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);g.lineTo(x+rr,y+h);g.quadraticCurveTo(x,y+h,x,y+h-rr);g.lineTo(x,y+rr);g.quadraticCurveTo(x,y,x+rr,y);g.closePath();
}
function AH_polishEdgeDepth(g,w,h,alpha=.16){
  g.save();let grad=g.createLinearGradient(0,0,0,h*.22);grad.addColorStop(0,`rgba(7,12,13,${alpha})`);grad.addColorStop(1,'rgba(7,12,13,0)');g.fillStyle=grad;g.fillRect(0,0,w,h*.22);grad=g.createLinearGradient(0,h*.72,0,h);grad.addColorStop(0,'rgba(6,10,10,0)');grad.addColorStop(1,`rgba(5,8,8,${alpha+.08})`);g.fillStyle=grad;g.fillRect(0,h*.72,w,h*.28);g.restore();
}
function AH_polishLeafEdges(g,w,h,area){
  if(area>3)return;g.save();g.globalAlpha=area===1?.20:.28;g.fillStyle=area===1?'#28523b':'#163a28';for(let i=0;i<6;i++){const left=i%2===0,x=left?-8:w+8,y=h*(.22+i*.12),ang=(left?1:-1)*(.55+(i%3)*.08);g.save();g.translate(x,y);g.rotate(ang);g.beginPath();g.ellipse(0,0,15+(i%2)*5,46+(i%3)*7,0,0,AH_TAU);g.fill();g.restore();}g.restore();
}
function AH_polishMountain(g,w,h,area){
  if(area>=5)return;const strength=.07+area*.025,horizon=h*.34,peakX=w*(.76-area*.025),peakY=horizon-h*(.10+area*.018);g.save();g.globalAlpha=strength;g.fillStyle='#233c3a';g.beginPath();g.moveTo(w*.42,horizon+25);g.lineTo(w*.57,horizon-8);g.lineTo(peakX,peakY);g.lineTo(w*.92,horizon-5);g.lineTo(w*1.08,horizon+26);g.closePath();g.fill();g.fillStyle='#d8dfd2';g.globalAlpha=strength*.55;g.beginPath();g.moveTo(peakX-h*.04,peakY+h*.04);g.lineTo(peakX,peakY);g.lineTo(peakX+h*.055,peakY+h*.055);g.closePath();g.fill();g.restore();
}
function AH_polishCombatPlate(g,w,h,area,elapsed){
  if(elapsed>3.0)return;const info=AH_POLISH_COMBAT[area];if(!info)return;const fade=elapsed<.25?elapsed/.25:elapsed>2.45?(3-elapsed)/.55:1,a=AH_clamp(fade,0,1);g.save();g.globalAlpha=a*.92;const boxW=Math.min(245,w*.62),boxH=52,x=14,y=14;AH_polishRoundRect(g,x,y,boxW,boxH,9);g.fillStyle='rgba(9,16,18,.72)';g.fill();g.strokeStyle='rgba(229,216,168,.30)';g.lineWidth=1;g.stroke();g.fillStyle='#f0dfad';g.font='700 12px sans-serif';g.textBaseline='top';g.fillText(info[0],x+12,y+10);g.fillStyle='rgba(236,241,220,.75)';g.font='10px sans-serif';g.fillText(info[1],x+12,y+29);g.restore();
}
function AH_polishPincerCue(g,w,h,elapsed){
  if(elapsed>3.0)return;const fade=AH_clamp(elapsed/.25,0,1)*AH_clamp((3-elapsed)/.6,0,1);g.save();g.globalAlpha=.72*fade;g.strokeStyle='#e5bf78';g.fillStyle='rgba(11,16,17,.58)';g.lineWidth=2;const cy=h*.42;for(const side of [-1,1]){const x=side<0?12:w-12,dir=side<0?1:-1;g.beginPath();g.moveTo(x,cy-20);g.lineTo(x+dir*25,cy);g.lineTo(x,cy+20);g.stroke();g.beginPath();g.moveTo(x+dir*11,cy-13);g.lineTo(x+dir*29,cy);g.lineTo(x+dir*11,cy+13);g.stroke();}g.textAlign='center';g.font='700 10px sans-serif';g.fillStyle='#f0d59e';g.fillText('PINCER',w*.5,cy-26);g.restore();
}

let AH_polishCombatArea=0,AH_polishCombatEntered=0;
for(const area of [1,2,3,4,5]){
  const base=AH_COMBAT_DRAWERS[area];if(typeof base!=='function')continue;
  AH_COMBAT_DRAWERS[area]=function AH_polishedCombatDrawer(args){
    base(args);const now=performance.now();if(AH_polishCombatArea!==area){AH_polishCombatArea=area;AH_polishCombatEntered=now;}const elapsed=(now-AH_polishCombatEntered)/1000;
    AH_polishMountain(args.back.g,args.back.w,args.back.h,area);AH_polishLeafEdges(args.front.g,args.front.w,args.front.h,area);AH_polishEdgeDepth(args.front.g,args.front.w,args.front.h,.12);AH_polishCombatPlate(args.front.g,args.front.w,args.front.h,area,elapsed);if(area===4)AH_polishPincerCue(args.front.g,args.front.w,args.front.h,elapsed);
  };
}

function AH_polishTraversalOverlay(segment){
  const info=AH_POLISH_OBJECTIVES[segment],c=document.getElementById('ttdPlatformCanvas');if(!info||!c||!session)return;const g=c.getContext('2d'),w=session.w,h=session.h;AH_polishEdgeDepth(g,w,h,.10);g.save();g.globalAlpha=.82;const bw=Math.min(250,w*.66),bh=43,x=12,y=12;AH_polishRoundRect(g,x,y,bw,bh,8);g.fillStyle='rgba(9,16,17,.65)';g.fill();g.strokeStyle='rgba(234,219,171,.22)';g.stroke();g.fillStyle='#ead9a7';g.font='700 10px sans-serif';g.textBaseline='top';g.fillText(info[0],x+10,y+8);g.fillStyle='rgba(232,238,216,.70)';g.font='9px sans-serif';g.fillText(info[1],x+10,y+24);g.restore();
}
for(const segment of Object.keys(AH_POLISH_OBJECTIVES)){
  const base=AH_SEGMENT_DRAWERS[segment];if(typeof base!=='function')continue;
  AH_SEGMENT_DRAWERS[segment]=function AH_polishedTraversalDrawer(){base();AH_polishTraversalOverlay(segment);};
}

const AH_POLISH_BASE_BEGIN_TRAVERSAL=AH_beginTraversal;
AH_beginTraversal=function AH_polishedBeginTraversal(segment){
  if(segment==='beach'&&AH_isState()){
    const world=AH_ensureWorld(),shell=world?.objects?.find(o=>o.id==='beach_shell');
    if(shell&&!shell.spawnResolved){const spot=AH_POLISH_SHELL_SPOTS[Math.floor(Math.random()*AH_POLISH_SHELL_SPOTS.length)];Object.assign(shell,spot,{spawnResolved:true});}
  }
  return AH_POLISH_BASE_BEGIN_TRAVERSAL(segment);
};

function AH_polishShellObject(){return AH_isState()?AH_ensureWorld()?.objects?.find(o=>o.id==='beach_shell'):null;}
function AH_polishFinishShellClaim(o,message){
  o.claimPending=false;o.serverClaimed=true;o.collected=true;o.opened=true;const world=AH_ensureWorld();
  if(!o.localClaimCredited){o.localClaimCredited=true;world.shells=(world.shells||0)+1;state.__ttdAlHataRewards.shells=(state.__ttdAlHataRewards.shells||0)+1;}
  floatObjectText(o,'INVENTORY +1');const count=Math.max(1,Number(message?.item?.count)||1);toast(`Pearlescent Island Shell added to Inventory · ×${count}`);try{window.parent.postMessage({type:'ttd:v6-refresh-request'},location.origin);}catch(_){}
}
AH_OBJECT_ATTACKERS.ah_shell=o=>{
  if(o.collected||o.claimPending)return;o.claimPending=true;const requestId=`ah-shell-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;o.claimRequestId=requestId;floatObjectText(o,'SECURING…');toast('Securing Pearlescent Island Shell to Inventory…');
  try{window.parent.postMessage({type:'ttd:al-hata-shell-claim-request',requestId,runId:''},location.origin);}catch(err){o.claimPending=false;toast('Shell pickup could not reach the item server.');return;}
  setTimeout(()=>{const shell=AH_polishShellObject();if(shell?.claimPending&&shell.claimRequestId===requestId){shell.claimPending=false;toast('Shell pickup timed out · the shell remains here.');}},15000);
};
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent)return;const m=event.data||{};if(!String(m.type||'').startsWith('ttd:al-hata-shell-claim-result'))return;const shell=AH_polishShellObject();if(!shell||!shell.claimPending||m.requestId!==shell.claimRequestId)return;
  if(m.type==='ttd:al-hata-shell-claim-result'&&m.ok!==false)AH_polishFinishShellClaim(shell,m);else{shell.claimPending=false;toast(m.message||'Shell pickup failed · the shell remains here.');}
});
