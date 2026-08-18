  /* ================= SOUL SABER EXACT ASSET RUNTIME =================
     Collection/shop glyph keeps the existing spectral icon.
     Attack animation uses the separately registered Soul Saber artwork.
     The loader tolerates legacy SVG wrappers by unwrapping embedded raster data directly,
     preventing the browser's broken-image glyph while the canonical vector asset is restored.
  */
  const __ttdSoulIconAsset = window.__TTD_GAME_ASSETS?.soulScimitar;
  const __ttdSoulAttackAsset = window.__TTD_GAME_ASSETS?.soulSaberAttack;
  if(!__ttdSoulIconAsset || __ttdSoulIconAsset.path !== '/assets/soul-scimitar-spectral.svg'){
    throw new Error('Soul Saber icon asset contract is missing or invalid.');
  }
  if(!__ttdSoulAttackAsset || __ttdSoulAttackAsset.path !== '/assets/soul-saber-attack.svg'){
    throw new Error('Soul Saber attack asset contract is missing or invalid.');
  }
  const __ttdSoulIconUsage = __ttdSoulIconAsset.usage?.icon;
  const __ttdSoulBattle = __ttdSoulAttackAsset.usage?.battle;
  if(!__ttdSoulIconUsage || !__ttdSoulBattle) throw new Error('Soul Saber usage contract is incomplete.');

  const __TTD_SOUL_ICON_URL = typeof window.__TTD_ASSET_URL === 'function'
    ? window.__TTD_ASSET_URL(__ttdSoulIconAsset.path)
    : `${__ttdSoulIconAsset.path}?__ttd=${Date.now().toString(36)}`;
  const __TTD_SOUL_ATTACK_URL = typeof window.__TTD_ASSET_URL === 'function'
    ? window.__TTD_ASSET_URL(__ttdSoulAttackAsset.path)
    : `${__ttdSoulAttackAsset.path}?__ttd=${Date.now().toString(36)}`;

  const __ttdSoulBaseRenderGlyph = renderGlyph;
  const __ttdSoulSaberAttackImage = new Image();
  __ttdSoulSaberAttackImage.decoding = 'async';
  let __ttdSoulSaberAttackLoadError = null;
  __ttdSoulSaberAttackImage.onerror = () => {
    __ttdSoulSaberAttackLoadError = new Error('Soul Saber attack artwork failed to decode.');
    console.error(__ttdSoulSaberAttackLoadError);
  };

  async function __ttdLoadSoulSaberAttackArtwork(){
    try{
      const response=await fetch(__TTD_SOUL_ATTACK_URL,{cache:'no-store'});
      if(!response.ok) throw new Error(`Soul Saber asset returned HTTP ${response.status}.`);
      const svgText=await response.text();
      const embedded=svgText.match(/<image\b[^>]*\bhref=["'](data:image\/(?:png|jpeg|webp);base64,[^"']+)["']/i);
      if(embedded){
        // SVGs loaded as image resources are not allowed to fetch nested subresources reliably.
        // Legacy raster-wrapped SVGs therefore display a broken-image glyph. Load the embedded
        // image itself instead of asking the browser to resolve it as an SVG subresource.
        __ttdSoulSaberAttackImage.src=embedded[1];
        return;
      }
      const blob=new Blob([svgText],{type:'image/svg+xml'});
      const objectUrl=URL.createObjectURL(blob);
      __ttdSoulSaberAttackImage.onload=()=>URL.revokeObjectURL(objectUrl);
      __ttdSoulSaberAttackImage.src=objectUrl;
    }catch(err){
      __ttdSoulSaberAttackLoadError=err;
      console.error('Soul Saber artwork load failed.',err);
    }
  }
  __ttdLoadSoulSaberAttackArtwork();

  renderGlyph = function renderGlyphWithExactSoulScimitar(key, color){
    if(key === 'scimitar'){
      return `<svg class="soulScimitarExactGlyph" viewBox="${__ttdSoulIconAsset.viewBox}" aria-hidden="true"><image href="${__TTD_SOUL_ICON_URL}" x="0" y="0" width="${__ttdSoulIconAsset.width}" height="${__ttdSoulIconAsset.height}" preserveAspectRatio="xMidYMid meet"/></svg>`;
    }
    return __ttdSoulBaseRenderGlyph(key, color);
  };

  (function installExactSoulScimitarGlyphStyle(){
    if(document.getElementById('ttdSoulScimitarExactSvgStyle')) return;
    const style = document.createElement('style');
    style.id = 'ttdSoulScimitarExactSvgStyle';
    style.textContent = `
      .soulScimitarExactGlyph{width:100%!important;height:100%!important;display:block;overflow:visible;}
      .soulScimitarExactGlyph image{pointer-events:none;}
    `;
    document.head.appendChild(style);
  })();

  drawGhostScimitar = function drawGhostScimitarExactSvg(x,y,angle,scale=1,alpha=1){
    const [drawW,drawH]=__ttdSoulBattle.box;
    const [anchorX,anchorY]=__ttdSoulBattle.anchor || [0.5,0.5];
    const rotationOffset=(Number(__ttdSoulBattle.rotationDegrees)||0)*Math.PI/180;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle+rotationOffset);
    ctx.scale(scale,scale);
    ctx.globalAlpha *= alpha;

    const wake=ctx.createLinearGradient(-34,0,4,0);
    wake.addColorStop(0,'rgba(250,228,213,0)');
    wake.addColorStop(1,'rgba(250,228,213,.24)');
    ctx.fillStyle=wake;
    ctx.beginPath();
    ctx.moveTo(-36,-5);
    ctx.lineTo(2,-7);
    ctx.lineTo(7,7);
    ctx.lineTo(-36,5);
    ctx.closePath();
    ctx.fill();

    if(__ttdSoulSaberAttackImage.complete && __ttdSoulSaberAttackImage.naturalWidth){
      ctx.drawImage(__ttdSoulSaberAttackImage,-drawW*anchorX,-drawH*anchorY,drawW,drawH);
    }
    ctx.restore();
  };
