(function () {
  const bg = document.querySelector('.chat-background');
  if (!bg) return;

  const colorCanvas = bg.querySelector('.chat-background-item-color-canvas');
  const patternCanvas = bg.querySelector('.chat-background-item-pattern-canvas');
  if (!(colorCanvas instanceof HTMLCanvasElement) || !(patternCanvas instanceof HTMLCanvasElement)) return;

  const getColors = () => {
    const attr = colorCanvas.getAttribute('data-colors') || '';
    const list = attr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : ['#fec496', '#dd6cb9', '#962fbf', '#4f5bd5'];
  };

  const drawColorCanvas = () => {
    const ctx = colorCanvas.getContext('2d');
    if (!ctx) return;

    const colors = getColors();
    const w = colorCanvas.width;
    const h = colorCanvas.height;

    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.4, colors[1] || colors[0]);
    g.addColorStop(0.7, colors[2] || colors[1] || colors[0]);
    g.addColorStop(1, colors[3] || colors[2] || colors[1] || colors[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

  const drawPatternCanvas = () => {
    const ctx = patternCanvas.getContext('2d');
    if (!ctx) return;

    const hexToRgb = (hex) => {
      const h = (hex || '').replace('#', '').trim();
      if (h.length !== 6) return { r: 255, g: 255, b: 255 };
      const n = parseInt(h, 16);
      return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
      };
    };

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = bg.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    patternCanvas.width = w;
    patternCanvas.height = h;
    patternCanvas.style.width = rect.width + 'px';
    patternCanvas.style.height = rect.height + 'px';
    patternCanvas.style.setProperty('--opacity-max', '0.42');

    const seeded = (seed) => {
      let t = seed >>> 0;
      return () => {
        t += 0x6d2b79f5;
        let x = t;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    };

    const drawStar = (c, size) => {
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size * 0.45;
      let rot = -Math.PI / 2;
      let x = 0;
      let y = 0;

      c.beginPath();
      c.moveTo(0, -outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = Math.cos(rot) * outerRadius;
        y = Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += Math.PI / spikes;
        x = Math.cos(rot) * innerRadius;
        y = Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += Math.PI / spikes;
      }
      c.closePath();
    };

    const drawHeart = (c, size) => {
      const s = size;
      c.beginPath();
      c.moveTo(0, s * 0.35);
      c.bezierCurveTo(0, -s * 0.2, -s * 0.75, -s * 0.2, -s * 0.75, s * 0.25);
      c.bezierCurveTo(-s * 0.75, s * 0.75, 0, s * 0.95, 0, s * 1.2);
      c.bezierCurveTo(0, s * 0.95, s * 0.75, s * 0.75, s * 0.75, s * 0.25);
      c.bezierCurveTo(s * 0.75, -s * 0.2, 0, -s * 0.2, 0, s * 0.35);
      c.closePath();
    };

    const drawPaperPlane = (c, size) => {
      const s = size;
      c.beginPath();
      c.moveTo(-s, -s * 0.35);
      c.lineTo(s, 0);
      c.lineTo(-s, s * 0.35);
      c.lineTo(-s * 0.15, 0);
      c.closePath();

      c.moveTo(-s * 0.15, 0);
      c.lineTo(s * 0.15, 0);
    };

    const drawChatBubble = (c, size) => {
      const s = size;
      const r = s * 0.55;
      c.beginPath();
      c.roundRect(-s, -r, s * 2, r * 2, r);
      c.moveTo(-s * 0.2, r);
      c.lineTo(-s * 0.65, r + s * 0.55);
      c.lineTo(-s * 0.3, r);
    };

    const tileSize = Math.round(150 * dpr);
    const tile = document.createElement('canvas');
    tile.width = tileSize;
    tile.height = tileSize;
    const tctx = tile.getContext('2d');
    if (!tctx) return;

    const rand = seeded(1337);

    const colors = getColors();
    const tint = hexToRgb(colors[2] || colors[0]);
    const tint2 = hexToRgb(colors[1] || colors[0]);

    tctx.clearRect(0, 0, tileSize, tileSize);
    tctx.save();
    tctx.globalAlpha = 1;
    tctx.lineCap = 'round';
    tctx.lineJoin = 'round';

    const stroke = `rgba(${tint.r},${tint.g},${tint.b},0.14)`;
    const stroke2 = `rgba(${tint2.r},${tint2.g},${tint2.b},0.10)`;

    for (let i = 0; i < 26; i++) {
      const x = rand() * tileSize;
      const y = rand() * tileSize;
      const rot = (Math.round(rand() * 7) - 3) * (Math.PI / 16);
      const size = (9 + rand() * 14) * dpr;
      const pick = Math.floor(rand() * 5);

      tctx.save();
      tctx.translate(x, y);
      tctx.rotate(rot);
      tctx.lineWidth = Math.max(1, 1.15 * dpr);
      tctx.strokeStyle = i % 3 === 0 ? stroke2 : stroke;

      if (pick === 0) {
        drawStar(tctx, size);
        tctx.stroke();
      } else if (pick === 1) {
        drawHeart(tctx, size * 0.75);
        tctx.stroke();
      } else if (pick === 2) {
        drawPaperPlane(tctx, size);
        tctx.stroke();
      } else if (pick === 3) {
        if (typeof tctx.roundRect === 'function') {
          drawChatBubble(tctx, size * 0.8);
          tctx.stroke();
        } else {
          tctx.beginPath();
          tctx.rect(-size, -size * 0.6, size * 2, size * 1.2);
          tctx.stroke();
        }
      } else {
        tctx.beginPath();
        tctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
        tctx.stroke();
        tctx.beginPath();
        tctx.moveTo(-size * 0.65, 0);
        tctx.lineTo(size * 0.65, 0);
        tctx.stroke();
      }

      tctx.restore();
    }

    tctx.restore();

    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, w, h);

    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  };

  const render = () => {
    drawColorCanvas();
    drawPatternCanvas();
  };

  let raf = 0;
  const onResize = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  };

  window.addEventListener('resize', onResize, { passive: true });
  render();
})();
