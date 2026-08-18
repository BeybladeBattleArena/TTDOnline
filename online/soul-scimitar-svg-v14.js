  /* ================= SOUL SCIMITAR EXACT SVG V14 =================
     Uses the registered game asset exactly. File, viewBox, size, anchor, and rotation come from
     assets/game-assets.json rather than being guessed independently in rendering code.
  */
  const __ttdSoulAsset = window.__TTD_GAME_ASSETS?.soulScimitar;
  if(!__ttdSoulAsset || __ttdSoulAsset.path !== '/assets/soul-scimitar-spectral.svg'){
    throw new Error('Soul Scimitar asset contract is missing or invalid.');
  }
  const __ttdSoulIcon = __ttdSoulAsset.usage?.icon;
  const __ttdSoulBattle = __ttdSoulAsset.usage?.battle;
  if(!__ttdSoulIcon || !__ttdSoulBattle) throw new Error('Soul Scimitar usage contract is incomplete.');

  const __TTD_SOUL_SCIMITAR_SVG_URL = typeof window.__TTD_ASSET_URL === 'function'
    ? window.__TTD_ASSET_URL(__ttdSoulAsset.path)
    : `${__ttdSoulAsset.path}?__ttd=${Date.now().toString(36)}`;
  const __ttdSoulBaseRenderGlyph = renderGlyph;
  const __ttdSoulScimitarImage = new Image();
  __ttdSoulScimitarImage.decoding = 'async';
  __ttdSoulScimitarImage.src = __TTD_SOUL_SCIMITAR_SVG_URL;

  renderGlyph = function renderGlyphWithExactSoulScimitar(key, color){
    if(key === 'scimitar'){
      const [iconW,iconH]=__ttdSoulIcon.box;
      return `<svg class="soulScimitarExactGlyph" viewBox="${__ttdSoulAsset.viewBox}" aria-hidden="true"><image href="${__TTD_SOUL_SCIMITAR_SVG_URL}" x="0" y="0" width="${iconW}" height="${iconH}" preserveAspectRatio="xMidYMid meet"/></svg>`;
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

    if(__ttdSoulScimitarImage.complete && __ttdSoulScimitarImage.naturalWidth){
      ctx.drawImage(__ttdSoulScimitarImage,-drawW*anchorX,-drawH*anchorY,drawW,drawH);
    }
    ctx.restore();
  };
