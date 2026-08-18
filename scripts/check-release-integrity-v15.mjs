import fs from 'node:fs';
import path from 'node:path';

const fail=(message)=>{ throw new Error(message); };
const read=(file)=>fs.readFileSync(file,'utf8');

const manifest=JSON.parse(read('assets/game-assets.json'));
if(manifest.schemaVersion!==1 || !manifest.assets || typeof manifest.assets!=='object') fail('assets/game-assets.json is invalid.');

const registeredPaths=new Set();
for(const [key,asset] of Object.entries(manifest.assets)){
  if(typeof asset.path!=='string' || !asset.path.startsWith('/assets/')) fail(`${key}: invalid asset path.`);
  registeredPaths.add(asset.path);
  const file=asset.path.slice(1);
  if(!fs.existsSync(file)) fail(`${key}: registered asset file does not exist: ${file}`);
  if(asset.format==='svg'){
    const svg=read(file);
    const viewBox=String(asset.viewBox||'');
    if(!svg.includes(`viewBox="${viewBox}"`) && !svg.includes(`viewBox='${viewBox}'`)) fail(`${key}: SVG viewBox does not match asset contract.`);
    if(!svg.match(new RegExp(`\\bwidth=["']${asset.width}["']`))) fail(`${key}: SVG width does not match asset contract.`);
    if(!svg.match(new RegExp(`\\bheight=["']${asset.height}["']`))) fail(`${key}: SVG height does not match asset contract.`);
    if(/<script\b|javascript:/i.test(svg)) fail(`${key}: executable content is forbidden in game SVG assets.`);
    if(/<image\b|data:image/i.test(svg)) fail(`${key}: embedded raster/image content is forbidden in registered SVG game assets; SVG art must remain pure vector.`);
  }
  if(!asset.usage || typeof asset.usage!=='object' || !Object.keys(asset.usage).length) fail(`${key}: at least one usage contract is required.`);
  for(const [usageName,usage] of Object.entries(asset.usage)){
    if(!Array.isArray(usage.box) || usage.box.length!==2 || usage.box.some((n)=>!Number.isFinite(n)||n<=0)) fail(`${key}.${usageName}: usage box must contain two positive numbers.`);
    if(usage.anchor && (!Array.isArray(usage.anchor) || usage.anchor.length!==2 || usage.anchor.some((n)=>!Number.isFinite(n)))) fail(`${key}.${usageName}: invalid anchor.`);
    if(usage.rotationDegrees!=null && !Number.isFinite(usage.rotationDegrees)) fail(`${key}.${usageName}: invalid rotationDegrees.`);
  }
}

const loaderHtml=read('online/game-loader.html');
for(const marker of ['release-integrity-v15','__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS','/assets/game-assets.json','cache:\'no-store\'']){
  if(!loaderHtml.includes(marker)) fail(`Runtime loader freshness/asset protection is missing: ${marker}`);
}

const firebase=JSON.parse(read('firebase.json'));
const headerRules=firebase.hosting?.headers||[];
const noStoreRule=headerRules.find((rule)=>String(rule.source||'').includes('svg') && (rule.headers||[]).some((h)=>String(h.key).toLowerCase()==='cache-control' && String(h.value).includes('no-store')));
if(!noStoreRule) fail('Firebase Hosting must serve SVG/game assets with no-store during active development.');

const workflow=read('.github/workflows/firebase-deploy.yml');
if(!workflow.includes('branches: [main]')) fail('Production deployment must have main as its only push source.');
if(workflow.includes('branches: [main, agent/firebase-foundation]')) fail('Legacy multi-branch production deployment is forbidden.');
if(!workflow.includes("startsWith(github.event.head_commit.message, '[release]')")) fail('Automatic production deployment must require one deliberate [release] commit.');
for(const marker of ['group: firebase-production-deploy','Stamp exact production build','Verify exact commit is live','build.json']){
  if(!workflow.includes(marker)) fail(`Production deployment verification is missing: ${marker}`);
}

const onlineDir='online';
for(const name of fs.readdirSync(onlineDir)){
  if(!name.endsWith('.js')) continue;
  const file=path.join(onlineDir,name);
  const source=read(file);
  const refs=[...source.matchAll(/['"`]((?:\/assets\/)[^'"`?#\s]+)([^'"`\s]*)['"`]/g)];
  for(const match of refs){
    const assetPath=match[1];
    const suffix=match[2]||'';
    if(!registeredPaths.has(assetPath)) fail(`${file}: references unregistered game asset ${assetPath}.`);
    if(suffix.includes('?v=')) fail(`${file}: fixed ?v= cache version is forbidden for game assets; use __TTD_ASSET_URL().`);
  }
}

const soulBridge=read('online/soul-scimitar-svg-v14.js');
for(const marker of [
  'window.__TTD_GAME_ASSETS?.soulScimitar',
  'window.__TTD_GAME_ASSETS?.soulSaberAttack',
  'window.__TTD_ASSET_URL(__ttdSoulIconAsset.path)',
  'window.__TTD_ASSET_URL(__ttdSoulAttackAsset.path)',
  '__ttdSoulSaberAttackImage.src = __TTD_SOUL_ATTACK_URL',
  'const [drawW,drawH]=__ttdSoulBattle.box',
  'const [anchorX,anchorY]=__ttdSoulBattle.anchor || [0.5,0.5]',
  'rotationDegrees',
  'ctx.drawImage(__ttdSoulSaberAttackImage'
]) if(!soulBridge.includes(marker)) fail(`Soul Saber runtime is not manifest-authoritative: ${marker}`);
if(soulBridge.includes('Path2D(')) fail('Registered Soul Saber art may not be redrawn as Path2D.');
if(/data:image|embedded raster|svgText\.match|URL\.createObjectURL/i.test(soulBridge)) fail('Soul Saber runtime may not tolerate or unwrap raster-wrapped SVGs; invalid registered art must fail checks instead.');
if(/drawImage\([^\n]*,\s*-27\s*,\s*-27\s*,\s*54\s*,\s*54\s*\)/.test(soulBridge)) fail('Soul Saber render dimensions must come from the asset manifest, not hardcoded values.');

const attack=manifest.assets?.soulSaberAttack;
if(!attack || attack.path!=='/assets/soul-saber-attack.svg') fail('Soul Saber attack asset must be separately registered.');
if(JSON.stringify(attack.usage?.battle?.box)!=='[49,49]') fail('Soul Saber attack box must remain at the approved two-thirds visual scale.');
const attackSvg=read(attack.path.slice(1));
if((attackSvg.match(/<path\b/g)||[]).length<20) fail('Soul Saber attack SVG lost expected vector detail.');

console.log(`Release integrity verified: ${registeredPaths.size} registered assets, pure-vector manifest-authoritative art geometry, cache-safe runtime loading, deliberate release-only production deployment, and live-commit verification.`);
