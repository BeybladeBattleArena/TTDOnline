from pathlib import Path

p=Path('online/game-loader.js')
s=p.read_text()

replacements={
    "        fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);":"        __TTD_BATTLE_HOOKS.fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);",
    "        fireSlitherVine(idx, die, d, dmg, dieAff, potencyBonus, isCrit);":"        __TTD_BATTLE_HOOKS.fireSlitherVine(idx, die, d, dmg, dieAff, potencyBonus, isCrit);",
    "`${LOOP_TIME}\\n    updateSoulScimitars(dt);\\n    updateSlitherVines(dt);`":"`${LOOP_TIME}\\n    __TTD_BATTLE_HOOKS.updateSoulScimitars(dt);\\n    __TTD_BATTLE_HOOKS.updateSlitherVines(dt);`",
    "source=source.split(DRAW_LANE).join(`${DRAW_LANE} drawSlitherVines(); drawSoulScimitars();`);":"source=source.split(DRAW_LANE).join(`${DRAW_LANE} __TTD_BATTLE_HOOKS.drawSlitherVines(); __TTD_BATTLE_HOOKS.drawSoulScimitars();`);",
}
for old,new in replacements.items():
    if old not in s: raise SystemExit(f'missing battle hook marker: {old[:80]}')
    s=s.replace(old,new,1)

old="""    const isolatedSources=sources.map((source,index)=>{
      const bridgeLiteral=JSON.stringify(BRIDGES[index]);
      return `\\ntry {\\n${source}\\n} catch (__ttdBridgeErr) {\\n  console.error('Online bridge '+${bridgeLiteral}+' failed without blocking later bridges.',__ttdBridgeErr);\\n  try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:${bridgeLiteral},message:String(__ttdBridgeErr?.message||__ttdBridgeErr)}, location.origin); } catch (_) {}\\n}\\n`;
    });
    transformed=transformed.slice(0,markerIndex)
      +'\\n\\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\\n'
      +isolatedSources.join('\\n')
      +'\\n'
      +transformed.slice(markerIndex);"""

new="""    // TTD_BATTLE_HOOK_SCOPE_V20: catalog combat functions must remain callable from the
    // transformed core loop. Generic try-block isolation makes strict-mode function declarations
    // block-scoped, which previously killed the first animation frame with ReferenceError.
    const catalogSource=sources[0];
    const soulAssetSource=sources[1];
    const slitherSource=sources[2];
    const isolatedSources=sources.slice(3).map((source,offset)=>{
      const index=offset+3;
      const bridgeLiteral=JSON.stringify(BRIDGES[index]);
      return `\\ntry {\\n${source}\\n} catch (__ttdBridgeErr) {\\n  console.error('Online bridge '+${bridgeLiteral}+' failed without blocking later bridges.',__ttdBridgeErr);\\n  try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:${bridgeLiteral},message:String(__ttdBridgeErr?.message||__ttdBridgeErr)}, location.origin); } catch (_) {}\\n}\\n`;
    });
    const battleHookSubsystem=`
  const __TTD_BATTLE_HOOKS = {
    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},
    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}
  };
  try {
${catalogSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireSoulScimitar,updateSoulScimitars,drawSoulScimitars});
    try {
${soulAssetSource}
    } catch (__ttdSoulAssetErr) {
      console.error('Soul Saber exact-art extension failed; base combat hooks remain available.',__ttdSoulAssetErr);
      try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/soul-scimitar-svg-v14.js?v=14',message:String(__ttdSoulAssetErr?.message||__ttdSoulAssetErr)}, location.origin); } catch (_) {}
    }
  } catch (__ttdSoulCatalogErr) {
    console.error('Soul Saber catalog combat extension failed; no-op hooks preserve the battle loop.',__ttdSoulCatalogErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/dice-catalog-bridge-v7.js?v=7',message:String(__ttdSoulCatalogErr?.message||__ttdSoulCatalogErr)}, location.origin); } catch (_) {}
  }
  try {
${slitherSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireSlitherVine,updateSlitherVines,drawSlitherVines});
  } catch (__ttdSlitherErr) {
    console.error('Slither Vine combat extension failed; no-op hooks preserve the battle loop.',__ttdSlitherErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/slither-vine-bridge-v8.js?v=8',message:String(__ttdSlitherErr?.message||__ttdSlitherErr)}, location.origin); } catch (_) {}
  }
`;
    transformed=transformed.slice(0,markerIndex)
      +'\\n\\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\\n'
      +battleHookSubsystem
      +'\\n'
      +isolatedSources.join('\\n')
      +'\\n'
      +transformed.slice(markerIndex);"""
if old not in s: raise SystemExit('isolation block marker missing')
s=s.replace(old,new,1)
p.write_text(s)
