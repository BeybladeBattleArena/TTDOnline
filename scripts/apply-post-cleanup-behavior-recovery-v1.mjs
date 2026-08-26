import fs from 'node:fs';

function replaceExactly(source,from,to,label){
  const count=source.split(from).length-1;
  if(count!==1)throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(from,to);
}

// 1) Make presentation independent of Test Map success while preserving its old ordering:
//    Test Map attempt first, presentation second. Presentation is now an ordinary script rather
//    than fetched source text evaluated inside the run bridge.
{
  const file='online/run-ui-bridge-v21.js';
  let source=fs.readFileSync(file,'utf8');
  if(!source.includes('TTD_PRESENTATION_INDEPENDENT_LOAD_V1')){
    const start=source.indexOf("      const presentationResponse=await fetch('/online/game-presentation-v1.js?v=6'");
    if(start<0)throw new Error('Could not locate legacy presentation fetch/eval block.');
    const endMarker="window.TTDGamePresentation?.rebind?.();";
    const endStart=source.indexOf(endMarker,start);
    if(endStart<0)throw new Error('Could not locate legacy presentation rebind endpoint.');
    source=source.slice(0,start)+source.slice(endStart+endMarker.length);

    source=replaceExactly(
      source,
      "bridge:'continuous-world-v2 + same-map-battle-v5 + presentation-v6'",
      "bridge:'continuous-world-v2 + same-map-battle-v5'",
      'continuous-world error ownership',
    );

    const catchMarker="bridge:'continuous-world-v2 + same-map-battle-v5'";
    const catchIndex=source.indexOf(catchMarker);
    if(catchIndex<0)throw new Error('Could not locate continuous-world catch after presentation split.');
    const closePattern='\n    }\n  }';
    const closeIndex=source.indexOf(closePattern,catchIndex);
    if(closeIndex<0)throw new Error('Could not locate loadAdventurePlatformingV2 catch/function boundary.');
    const insertAt=closeIndex+'\n    }'.length;
    const block=`\n\n    // TTD_PRESENTATION_INDEPENDENT_LOAD_V1\n    // Preserve the old sequencing (world patches first, presentation wrappers second), but do\n    // not let a Test Map failure suppress mission/outcome presentation for every game mode.\n    try{\n      const presentationUrl=window.__TTD_ASSET_URL?.('/online/game-presentation-v1.js?v=6')||'/online/game-presentation-v1.js?v=6';\n      await new Promise((resolve,reject)=>{\n        if(window.__TTD_GAME_PRESENTATION_V6){resolve();return;}\n        const script=document.createElement('script');script.src=presentationUrl;script.async=false;\n        script.onload=resolve;script.onerror=()=>reject(new Error('Game presentation script could not load.'));\n        document.head.appendChild(script);\n      });\n      window.TTDGamePresentation?.rebind?.();\n    }catch(err){\n      console.error('Game presentation module could not load.',err);\n      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'presentation-v6',message:String(err?.message||err)},location.origin);}catch(_){}\n    }`;
    source=source.slice(0,insertAt)+block+source.slice(insertAt);
    fs.writeFileSync(file,source);
  }
}

// 2) Remove the last direct references to retired WebP item/loading placeholders. The item
//    authority is loaded before avatar-inventory-v22, so consumables resolve through it first.
{
  const file='online/avatar-inventory-v22.js';
  let source=fs.readFileSync(file,'utf8');
  if(!source.includes('TTD_APPROVED_ITEM_ART_V1')){
    const oldLine="const AS={avatar:A('/assets/ui/avatar-test-base.webp'),ticket:A('/assets/ui/epic-summon-ticket.webp'),tome:A('/assets/ui/exp-tome.webp'),horde:A('/assets/ui/loading-endless-horde.webp'),hata:A('/assets/ui/loading-al-hata.webp')};Object.values(AS).forEach(s=>{let i=new Image;i.src=s});";
    const newLine="// TTD_APPROVED_ITEM_ART_V1\nconst ITEM_ASSETS=window.__TTD_ITEM_ASSETS_V4||window.__TTD_ITEM_ASSETS_V1||{};\nconst AS={avatar:A('/assets/ui/avatar-test-base.webp'),ticket:ITEM_ASSETS.epic_summon_ticket||A('/assets/items/epic-summon-ticket.png'),tome:ITEM_ASSETS.exp_tome||A('/assets/items/exp-tome.png'),horde:A(window.__TTD_GAME_ASSETS?.loadingEndlessHorde?.path||'/assets/ui/loading-endless-horde.png'),hata:A(window.__TTD_GAME_ASSETS?.loadingAlHata?.path||'/assets/ui/loading-al-hata.png')};Object.values(AS).forEach(s=>{let i=new Image;i.src=s});";
    source=replaceExactly(source,oldLine,newLine,'avatar approved art routing');
  }

  // 3) Server-synced items intentionally carry semantic itemId/count data rather than copied
  //    image paths. The final Inventory renderer must resolve those IDs through the one approved
  //    item-art authority, otherwise ores/Mystery Chest/etc. degrade to generic fallback icons.
  if(!source.includes('TTD_APPROVED_ITEM_ID_ART_V1')){
    const oldIcon="function icon(i){if(i?.asset)return `<img src=\"${i.asset}\">`;if(i?.type==='chest')return chestSVG(i.difficultyKey);if(i?.type==='key')return keySVG(i.difficultyKey);if(i?.kind==='jewel')return gemSVG(i.jewelId);if(i?.kind==='card')return cardSVG(i.cardId);return '◆'}";
    const newIcon="// TTD_APPROVED_ITEM_ID_ART_V1\nfunction icon(i){const itemArt=i?.itemId&&ITEM_ASSETS[i.itemId];if(i?.asset)return `<img src=\"${i.asset}\">`;if(itemArt)return `<img src=\"${itemArt}\">`;if(i?.type==='chest')return chestSVG(i.difficultyKey);if(i?.type==='key')return keySVG(i.difficultyKey);if(i?.kind==='jewel')return gemSVG(i.jewelId);if(i?.kind==='card')return cardSVG(i.cardId);return '◆'}";
    source=replaceExactly(source,oldIcon,newIcon,'avatar semantic item art routing');
  }
  fs.writeFileSync(file,source);
}

console.log('Materialized independent presentation loading and approved Inventory/loading/item-id art routing.');
