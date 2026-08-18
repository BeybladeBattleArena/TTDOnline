import fs from 'node:fs';
import path from 'node:path';

const read=(file)=>fs.readFileSync(file,'utf8');
const fail=(message)=>{ throw new Error(message); };
const manifest=JSON.parse(read('assets/game-assets.json'));

if(manifest.schemaVersion!==1 || !manifest.assets || typeof manifest.assets!=='object') fail('assets/game-assets.json is invalid.');
const registeredPaths=new Set();

for(const [key,asset] of Object.entries(manifest.assets)){
  if(typeof asset.path!=='string' || !asset.path.startsWith('/assets/')) fail(`${key}: invalid asset path.`);
  registeredPaths.add(asset.path);
  const file=asset.path.slice(1);
  if(!fs.existsSync(file)) fail(`${key}: materialized asset does not exist: ${file}`);

  if(asset.format==='svg'){
    const svg=read(file);
    if(!svg.includes(`viewBox="${asset.viewBox}"`) && !svg.includes(`viewBox='${asset.viewBox}'`)) fail(`${key}: SVG viewBox does not match manifest.`);
    if(!svg.match(new RegExp(`\\bwidth=["']${asset.width}["']`))) fail(`${key}: SVG width does not match manifest.`);
    if(!svg.match(new RegExp(`\\bheight=["']${asset.height}["']`))) fail(`${key}: SVG height does not match manifest.`);
    if(/<script\b|javascript:/i.test(svg)) fail(`${key}: executable SVG content is forbidden.`);
    if(asset.vectorOnly===true){
      for(const forbidden of ['<image','data:image/','<foreignObject']){
        if(svg.includes(forbidden)) fail(`${key}: vectorOnly asset contains forbidden raster/embed content: ${forbidden}`);
      }
      if(!svg.includes('<path')) fail(`${key}: vectorOnly asset contains no vector paths.`);
    }
  }

  if(!asset.usage || typeof asset.usage!=='object' || !Object.keys(asset.usage).length) fail(`${key}: at least one usage contract is required.`);
  for(const [usageName,usage] of Object.entries(asset.usage)){
    if(!Array.isArray(usage.box) || usage.box.length!==2 || usage.box.some((n)=>!Number.isFinite(n)||n<=0)) fail(`${key}.${usageName}: invalid render box.`);
    if(usage.anchor && (!Array.isArray(usage.anchor) || usage.anchor.length!==2 || usage.anchor.some((n)=>!Number.isFinite(n)))) fail(`${key}.${usageName}: invalid anchor.`);
    if(usage.rotationDegrees!=null && !Number.isFinite(usage.rotationDegrees)) fail(`${key}.${usageName}: invalid rotationDegrees.`);
  }
}

const attack=manifest.assets?.soulSaberAttack;
if(!attack?.source || attack.generatedBy!=='scripts/materialize-game-assets.mjs' || attack.vectorOnly!==true) fail('Soul Saber attack must remain generated from its canonical vector source.');
if(!fs.existsSync(attack.source.slice(1))) fail('Canonical Soul Saber vector source is missing.');

const loaderHtml=read('online/game-loader.html');
for(const marker of ['__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS','/assets/game-assets.json',"cache:'no-store'"]){
  if(!loaderHtml.includes(marker)) fail(`Runtime freshness protection is missing ${marker}.`);
}

const firebase=JSON.parse(read('firebase.json'));
const noStoreRule=(firebase.hosting?.headers||[]).find((rule)=>String(rule.source||'').includes('svg') && (rule.headers||[]).some((h)=>String(h.key).toLowerCase()==='cache-control' && String(h.value).includes('no-store')));
if(!noStoreRule) fail('Firebase Hosting must serve active game assets with no-store.');

const deploy=read('.github/workflows/firebase-deploy.yml');
if(!deploy.includes('branches: [main]')) fail('Production deployment must only push-deploy main.');
for(const marker of ['group: firebase-production-deploy','cancel-in-progress: true','Stamp exact production build','Verify exact commit is live','build.json']){
  if(!deploy.includes(marker)) fail(`Production deployment safety is missing ${marker}.`);
}

const verify=read('.github/workflows/verify.yml');
if(!verify.includes('pull_request:')) fail('Verification must run on finished pull-request candidates.');
if(/\bpush\s*:/.test(verify)) fail('Verification must not run on development-branch pushes; that recreates half-updated CI failures.');
for(const marker of ['group: verify-${{ github.event.pull_request.number }}','cancel-in-progress: true']){
  if(!verify.includes(marker)) fail(`PR verification concurrency protection is missing ${marker}.`);
}

const pkg=JSON.parse(read('package.json'));
if(pkg.scripts?.['check:loader']!=='node scripts/check-online-loader.mjs') fail('package.json must use the stable loader checker entrypoint.');
if(pkg.scripts?.['check:release']!=='node scripts/check-release-integrity.mjs') fail('package.json must use the stable release checker entrypoint.');
if(!String(pkg.scripts?.check||'').startsWith('npm run build:assets && ')) fail('Game assets must materialize before any release checks.');

for(const name of fs.readdirSync('online')){
  if(!name.endsWith('.js')) continue;
  const file=path.join('online',name);
  const source=read(file);
  for(const match of source.matchAll(/['"`]((?:\/assets\/)[^'"`?#\s]+)([^'"`\s]*)['"`]/g)){
    if(!registeredPaths.has(match[1])) fail(`${file}: references unregistered asset ${match[1]}.`);
    if((match[2]||'').includes('?v=')) fail(`${file}: fixed asset ?v= cache suffix is forbidden.`);
  }
}

console.log(`Release integrity verified: ${registeredPaths.size} registered assets, vector-only enforcement, PR-only verification, and exact live-commit deployment proof.`);
