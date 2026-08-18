  /* ================= SOUL SCIMITAR TRACED ART V13 =================
     Visual-only replacement for the legacy Soul Scimitar canvas sketch.
     Geometry mirrors /assets/soul-scimitar-spectral.svg.
     The traced master is preserved separately at /assets/soul-scimitar-traced-master.svg.
  */
  GLYPHS.scimitar = {
    fill:false,
    d:'M5 12 C9 8 14 6 21 5 C20 9 17 12 13 13 C16 14 19 15 21 17 C16 18 11 17 7 15 L5 14 Z',
    lines:[[6,12,3,10],[5,14,2,16],[3,10,2,16]]
  };

  const __TTD_SOUL_SCIMITAR_ART = {
    handle:new Path2D('M8 68 L14 61 L22 62 L30 67 L29 73 L20 78 L12 76 Z'),
    pommel:new Path2D('M7 68 L10 63 L14 62 L15 76 L11 76 Z'),
    guard:new Path2D('M27 56 L38 59 L42 54 L47 58 L43 65 L50 69 L44 74 L47 81 L41 84 L36 78 L27 82 L24 76 L30 70 L23 64 Z'),
    guardInset:new Path2D('M31 61 L38 64 L39 72 L33 76 L29 71 Z'),
    blade:new Path2D('M37 61 C55 48 77 39 101 34 C109 32 116 31 121 31 C118 41 113 50 106 57 C99 64 90 69 80 72 C93 73 106 77 118 82 C101 85 84 86 67 84 C56 83 46 80 38 75 L33 69 Z'),
    spine:new Path2D('M39 62 C55 53 72 47 91 43 C83 49 74 56 67 63 C62 68 54 72 45 73 L36 69 Z'),
    plate:new Path2D('M42 61 L57 57 L65 62 L60 71 L47 74 L39 69 Z'),
    plateInset:new Path2D('M45 63 L55 60 L61 63 L57 69 L48 71 L42 68 Z'),
    eye:new Path2D('M44 67 C48 62 55 62 59 66 C55 71 48 72 44 67 Z'),
    cutoutA:new Path2D('M73 50 L88 44 L82 52 L69 58 Z'),
    cutoutB:new Path2D('M88 58 L104 48 L98 58 L84 65 Z'),
    upperEdge:new Path2D('M45 58 C61 48 79 42 98 38'),
    lowerEdge:new Path2D('M41 75 C57 81 77 83 97 81 C105 81 112 82 118 82')
  };

  function __ttdSoulPaint(path, fill, stroke='rgba(5,5,7,.84)', width=4.2){
    ctx.fillStyle=fill;
    ctx.fill(path);
    if(stroke){
      ctx.strokeStyle=stroke;
      ctx.lineWidth=width;
      ctx.stroke(path);
    }
  }

  function drawGhostScimitar(x,y,angle,scale=1,alpha=1){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);

    // The old in-game sketch spanned about 77 px at full size. The traced art is
    // deliberately rendered at ~51 px wide (114 * .45), almost exactly two-thirds.
    const artScale=0.45*scale;
    ctx.scale(artScale,artScale);
    ctx.translate(-64,-64);
    ctx.globalAlpha*=alpha;
    ctx.lineCap='round';
    ctx.lineJoin='round';

    const wake=ctx.createLinearGradient(2,64,72,64);
    wake.addColorStop(0,'rgba(250,228,213,0)');
    wake.addColorStop(1,'rgba(250,228,213,.34)');
    ctx.fillStyle=wake;
    ctx.beginPath();
    ctx.moveTo(1,59);
    ctx.lineTo(70,54);
    ctx.lineTo(78,72);
    ctx.lineTo(1,69);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur=9;
    ctx.shadowColor='rgba(250,228,213,.60)';
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.handle,'rgba(191,168,156,.52)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.pommel,'rgba(205,175,160,.55)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.guard,'rgba(216,187,170,.58)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.guardInset,'rgba(157,137,130,.48)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.blade,'rgba(250,228,213,.64)');

    ctx.shadowBlur=4;
    ctx.shadowColor='rgba(30,24,25,.28)';
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.spine,'rgba(189,168,158,.50)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.plate,'rgba(201,178,167,.50)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.plateInset,'rgba(141,124,120,.48)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.cutoutA,'rgba(149,131,127,.44)');
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.cutoutB,'rgba(143,125,121,.44)');

    ctx.shadowBlur=8;
    ctx.shadowColor='rgba(250,228,213,.48)';
    __ttdSoulPaint(__TTD_SOUL_SCIMITAR_ART.eye,'rgba(235,205,189,.68)', 'rgba(5,5,7,.84)', 3.5);
    ctx.fillStyle='rgba(255,240,228,.82)';
    ctx.strokeStyle='rgba(5,5,7,.82)';
    ctx.lineWidth=3.2;
    ctx.beginPath();
    ctx.ellipse(52,67,2.6,3.1,0,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle='rgba(32,25,26,.84)';
    ctx.beginPath();
    ctx.ellipse(52.2,67,0.9,2.1,0,0,Math.PI*2);
    ctx.fill();

    ctx.shadowBlur=4;
    ctx.strokeStyle='rgba(255,245,237,.78)';
    ctx.lineWidth=4.0;
    ctx.stroke(__TTD_SOUL_SCIMITAR_ART.lowerEdge);
    ctx.strokeStyle='rgba(255,242,232,.72)';
    ctx.lineWidth=2.8;
    ctx.stroke(__TTD_SOUL_SCIMITAR_ART.upperEdge);

    ctx.strokeStyle='rgba(225,200,184,.62)';
    ctx.lineWidth=3.1;
    [[14,62,17,76],[20,63,23,75],[26,65,27,73]].forEach((l)=>{
      ctx.beginPath();
      ctx.moveTo(l[0],l[1]);
      ctx.lineTo(l[2],l[3]);
      ctx.stroke();
    });

    ctx.restore();
  }
