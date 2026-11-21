// Leonida Cover Studio — the cover renderer. Pure canvas, no libraries, no network.
// A cover is a collage of angled panels (the classic multi-panel poster look), each panel
// filled with one photo (cover-cropped, zoomable, repositionable), washed with a colour
// grade, and lettered with a big condensed title. The same draw routine renders the live
// preview and every export size, so what you see is exactly the PNG you get.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
  story: { w: 1080, h: 1920, label: 'Story · 1080 × 1920' },
};

export const LAYOUTS = ['classic', 'trio', 'duo', 'poster'];
export const GRADES = ['vice', 'neon', 'noir'];
export const STYLES = ['sunset', 'chrome', 'outline'];

/** Default per-panel framing variety, so a collage built from few photos still reads as a collage. */
const FRAMING = [
  { zoom: 1.0, fx: 0.5, fy: 0.3 },
  { zoom: 1.25, fx: 0.38, fy: 0.35 },
  { zoom: 1.45, fx: 0.35, fy: 0.45 },
  { zoom: 1.45, fx: 0.3, fy: 0.55 },
  { zoom: 1.9, fx: 0.55, fy: 0.3 },
];

/** Panel polygons for a layout at w×h, as arrays of [x, y] points (fractions of w/h). */
export function layoutPanels(layout, w, h) {
  const wide = w > h * 1.15;
  const P = (pts) => pts.map(([x, y]) => [x * w, y * h]);
  if (layout === 'poster') return [P([[0, 0], [1, 0], [1, 1], [0, 1]])];
  if (layout === 'duo') return [
    P([[0, 0], [0.58, 0], [0.44, 1], [0, 1]]),
    P([[0.58, 0], [1, 0], [1, 1], [0.44, 1]]),
  ];
  if (layout === 'trio') return [
    P([[0, 0], [0.36, 0], [0.32, 1], [0, 1]]),
    P([[0.36, 0], [0.69, 0], [0.66, 1], [0.32, 1]]),
    P([[0.69, 0], [1, 0], [1, 1], [0.66, 1]]),
  ];
  // classic: one wide hero panel on top, three angled strips below (side stack when wide)
  if (wide) return [
    P([[0, 0], [0.6, 0], [0.57, 1], [0, 1]]),
    P([[0.6, 0], [1, 0], [1, 0.52], [0.585, 0.52], [0.575, 1], [0.57, 1]]),
    P([[0.585, 0.52], [1, 0.52], [1, 1], [0.575, 1]]),
  ];
  return [
    P([[0, 0], [1, 0], [1, 0.52], [0, 0.52]]),
    P([[0, 0.52], [0.37, 0.52], [0.335, 1], [0, 1]]),
    P([[0.37, 0.52], [0.685, 0.52], [0.665, 1], [0.335, 1]]),
    P([[0.685, 0.52], [1, 0.52], [1, 1], [0.665, 1]]),
  ];
}

function bounds(poly) {
  const xs = poly.map((p) => p[0]); const ys = poly.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function tracePath(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

const GRADE_WASH = {
  vice: ['rgba(255,45,150,0.55)', 'rgba(255,120,40,0.10)', 'rgba(255,170,30,0.60)'],
  neon: ['rgba(0,220,255,0.50)', 'rgba(30,0,80,0.12)', 'rgba(255,40,180,0.55)'],
  noir: ['rgba(20,20,30,0.45)', 'rgba(0,0,0,0.05)', 'rgba(200,20,30,0.50)'],
};
const PANEL_FILTERS = {
  vice: ['saturate(1.35) contrast(1.06)', 'saturate(1.55) hue-rotate(-10deg) contrast(1.05)', 'saturate(1.25) brightness(1.05)', 'saturate(1.5) hue-rotate(8deg)'],
  neon: ['saturate(1.4) hue-rotate(6deg) contrast(1.08)', 'saturate(1.6) hue-rotate(-14deg)', 'saturate(1.3) brightness(1.06) hue-rotate(10deg)', 'saturate(1.55) contrast(1.1)'],
  noir: ['grayscale(1) contrast(1.3) brightness(1.02)', 'grayscale(1) contrast(1.45)', 'grayscale(1) contrast(1.22) brightness(1.1)', 'grayscale(1) contrast(1.38)'],
};

let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas'); c.width = c.height = 140;
  const g = c.getContext('2d'); const img = g.createImageData(140, 140);
  let seed = 42;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 110 + (seed % 145);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

/** Draw one photo into one panel polygon with cover-crop framing. */
function drawPanelPhoto(ctx, img, poly, frame, filter) {
  const b = bounds(poly);
  ctx.save();
  tracePath(ctx, poly);
  ctx.clip();
  const scale = Math.max(b.w / img.naturalWidth, b.h / img.naturalHeight) * frame.zoom;
  const pw = img.naturalWidth * scale; const ph = img.naturalHeight * scale;
  const ox = b.x + (b.w - pw) * frame.fx;
  const oy = b.y + (b.h - ph) * frame.fy;
  try { ctx.filter = filter; } catch { /* older canvas: no filter */ }
  ctx.drawImage(img, ox, oy, pw, ph);
  try { ctx.filter = 'none'; } catch { /* ignore */ }
  ctx.restore();
}

function wash(ctx, w, h, grade, alphaScale = 1) {
  const [top, mid, bot] = GRADE_WASH[grade];
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top); grad.addColorStop(0.45, mid); grad.addColorStop(1, bot);
  ctx.save();
  ctx.globalCompositeOperation = grade === 'noir' ? 'soft-light' : 'overlay';
  ctx.globalAlpha = 0.85 * alphaScale;
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // vignette
  const rad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  rad.addColorStop(0, 'rgba(10,0,20,0)'); rad.addColorStop(1, 'rgba(10,0,25,0.42)');
  ctx.fillStyle = rad; ctx.fillRect(0, 0, w, h);
  // grain
  ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = getGrain(ctx); ctx.fillRect(0, 0, w, h); ctx.restore();
}

const FONT_STACK = '"Arial Black","Helvetica Neue",Impact,"Franklin Gothic Heavy",sans-serif';

function lettering(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  if (!title && !sub) return;
  const cx = w / 2;
  let size = h * 0.135 * (state.titleSize || 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `900 ${s}px ${FONT_STACK}`; };
  if (title) {
    setFont(size);
    while (ctx.measureText(title).width > w * 0.92 && size > 14) { size -= 3; setFont(size); }
    const y = h * 0.155;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.16; ctx.shadowOffsetY = size * 0.05;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#160a24'; ctx.lineWidth = size * 0.22;
    ctx.strokeText(title, cx, y);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (state.style === 'outline') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = size * 0.075; ctx.strokeText(title, cx, y);
    } else {
      const grad = ctx.createLinearGradient(0, y - size, 0, y);
      if (state.style === 'chrome') {
        grad.addColorStop(0, '#fdfdff'); grad.addColorStop(0.48, '#9fb4cc'); grad.addColorStop(0.52, '#e8f2ff'); grad.addColorStop(1, '#5f7899');
      } else {
        grad.addColorStop(0, '#ffe95a'); grad.addColorStop(0.45, '#ff9a2e'); grad.addColorStop(0.8, '#ff2e88'); grad.addColorStop(1, '#c81cff');
      }
      ctx.fillStyle = grad; ctx.fillText(title, cx, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = size * 0.028; ctx.strokeText(title, cx, y);
    }
    ctx.restore();
  }
  if (sub) {
    let s2 = size * 0.34;
    ctx.save();
    ctx.font = `italic 600 ${s2}px Georgia,"Times New Roman",serif`;
    while (ctx.measureText(sub).width > w * 0.8 && s2 > 9) { s2 -= 1; ctx.font = `italic 600 ${s2}px Georgia,"Times New Roman",serif`; }
    const y2 = h * 0.155 + s2 * 1.55;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = s2 * 0.35;
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, cx, y2);
    ctx.restore();
  }
  // foot credit bar
  ctx.save();
  ctx.font = `700 ${Math.max(11, h * 0.02)}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
  ctx.fillText('A  L E O N I D A  O R I G I N A L', cx, h - h * 0.028);
  ctx.restore();
}

/**
 * Render the full cover.
 * state: { photos: [img], layout, grade, style, title, subtitle, titleSize,
 *          panels: [{ photo, zoom, fx, fy }] (per panel index, sparse ok) }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#1b0b2e'; ctx.fillRect(0, 0, w, h);
  const polys = layoutPanels(state.layout, w, h);
  const photos = state.photos.length ? state.photos : [];
  polys.forEach((poly, i) => {
    const cfg = { ...FRAMING[i % FRAMING.length], ...(state.panels?.[i] || {}) };
    const img = photos.length ? photos[(cfg.photo ?? i) % photos.length] : null;
    if (img) {
      drawPanelPhoto(ctx, img, poly, cfg, PANEL_FILTERS[state.grade][i % 4]);
      // per-panel wash so neighbours differ like a real collage
      ctx.save(); tracePath(ctx, poly); ctx.clip();
      wash(ctx, w, h, state.grade, 0.55);
      ctx.restore();
    } else {
      ctx.save(); tracePath(ctx, poly); ctx.fillStyle = i % 2 ? '#3a1454' : '#2b0f42'; ctx.fill(); ctx.restore();
    }
    // panel borders: light keyline + dark inner line
    ctx.save();
    tracePath(ctx, poly);
    ctx.strokeStyle = 'rgba(255,246,235,0.95)'; ctx.lineWidth = Math.max(3, w * 0.007); ctx.stroke();
    tracePath(ctx, poly);
    ctx.strokeStyle = 'rgba(15,5,25,0.55)'; ctx.lineWidth = Math.max(1, w * 0.0022); ctx.stroke();
    ctx.restore();
  });
  wash(ctx, w, h, state.grade, 1);
  // outer frame
  ctx.strokeStyle = 'rgba(255,246,235,0.9)'; ctx.lineWidth = Math.max(4, w * 0.008);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  lettering(ctx, w, h, state);
  return polys;
}
