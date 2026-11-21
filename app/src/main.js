// Leonida Cover Studio — editor wiring. Holds the cover state, loads photos (uploads,
// drag-and-drop, built-in samples), lets you click a panel and frame it, and exports the
// PNG at the picked post size by re-rendering the same art on a full-size canvas.
import { drawCover, layoutPanels, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const state = {
  photos: [],          // HTMLImageElement[]
  photoNames: [],
  layout: 'classic',
  grade: 'vice',
  style: 'sunset',
  title: 'LEONIDA',
  subtitle: 'starring the Boulevard Queen',
  titleSize: 1,
  size: 'square',
  panels: {},          // panelIndex -> { photo, zoom, fx, fy }
};
let selected = 0;
let lastPolys = [];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCfg(i) {
  if (!state.panels[i]) state.panels[i] = { photo: i };
  return state.panels[i];
}

function redraw() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  lastPolys = drawCover(canvas, state);
  syncPanelControls();
  renderThumbs();
}

function renderThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb'; b.title = state.photoNames[i] || `Photo ${i + 1}`;
    const t = document.createElement('img'); t.src = img.src; t.alt = b.title;
    b.appendChild(t);
    b.addEventListener('click', () => { panelCfg(selected).photo = i; redraw(); });
    box.appendChild(b);
  });
}

function syncPanelControls() {
  const cfg = panelCfg(selected);
  $('panelName').textContent = `Panel ${selected + 1}`;
  $('pZoom').value = cfg.zoom ?? 1;
  $('pFx').value = cfg.fx ?? 0.5;
  $('pFy').value = cfg.fy ?? 0.42;
}

async function addPhoto(url, name) {
  if (state.photos.length >= 5) { status.textContent = 'Five photos max — that fills every layout.'; return; }
  const img = await loadImage(url);
  state.photos.push(img); state.photoNames.push(name);
  redraw();
}

async function addFiles(files) {
  for (const f of [...files].slice(0, 5)) await addPhoto(URL.createObjectURL(f), f.name);
  if (state.photos.length) status.textContent = `${state.photos.length} photo(s) loaded — pick a layout and export.`;
}

// --- controls ---------------------------------------------------------------
$('photo').addEventListener('change', (e) => addFiles(e.target.files));
const drop = $('drop');
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
$('sample-pier').addEventListener('click', () => addPhoto('samples/pier.jpg', 'The Pier (sample)'));
$('sample-boulevard').addEventListener('click', () => addPhoto('samples/boulevard.jpg', 'Boulevard (sample)'));
$('layout').addEventListener('change', (e) => { state.layout = e.target.value; selected = 0; redraw(); });
$('grade').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('style').addEventListener('change', (e) => { state.style = e.target.value; redraw(); });
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); redraw(); });
$('size').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
$('pZoom').addEventListener('input', (e) => { panelCfg(selected).zoom = Number(e.target.value); redraw(); });
$('pFx').addEventListener('input', (e) => { panelCfg(selected).fx = Number(e.target.value); redraw(); });
$('pFy').addEventListener('input', (e) => { panelCfg(selected).fy = Number(e.target.value); redraw(); });
$('panelPhotoPrev').addEventListener('click', () => cyclePhoto(-1));
$('panelPhotoNext').addEventListener('click', () => cyclePhoto(1));
$('panelSwap').addEventListener('click', () => {
  const n = lastPolys.length; if (n < 2) return;
  const a = panelCfg(selected); const b = panelCfg((selected + 1) % n);
  [a.photo, b.photo] = [b.photo ?? (selected + 1) % n, a.photo ?? selected];
  redraw();
});
function cyclePhoto(d) {
  if (!state.photos.length) return;
  const cfg = panelCfg(selected);
  const cur = cfg.photo ?? selected;
  cfg.photo = ((cur + d) % state.photos.length + state.photos.length) % state.photos.length;
  redraw();
}

canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < lastPolys.length; i++) {
    const p = new Path2D();
    lastPolys[i].forEach(([px, py], j) => (j ? p.lineTo(px, py) : p.moveTo(px, py)));
    p.closePath();
    if (ctx.isPointInPath(p, x, y)) { selected = i; syncPanelControls(); break; }
  }
});

$('export').addEventListener('click', () => {
  const { w, h } = SIZES[state.size];
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  drawCover(out, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const slug = (state.title || 'leonida').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leonida';
    a.download = `${slug}-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved ${a.download}`;
  }, 'image/png');
});

// --- screenshot scenes --------------------------------------------------------
async function applyScene(q) {
  state.layout = q.get('layout') || 'classic';
  state.grade = q.get('grade') || 'vice';
  state.style = q.get('style') || 'sunset';
  state.size = q.get('size') || 'square';
  state.title = q.get('caption') || q.get('title') || 'LEONIDA';
  state.subtitle = q.get('subtitle') ?? 'starring the Boulevard Queen';
  const names = (q.get('photos') || 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  for (const n of names) await addPhoto(`samples/${n}.jpg`, `${n} (sample)`);
  $('layout').value = state.layout; $('grade').value = state.grade; $('style').value = state.style;
  $('size').value = state.size; $('title').value = state.title; $('subtitle').value = state.subtitle;
  redraw();
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyScene);
} else {
  (async () => {
    await addPhoto('samples/boulevard.jpg', 'Boulevard (sample)');
    await addPhoto('samples/pier.jpg', 'The Pier (sample)');
    status.textContent = 'Samples loaded — drop your own photos to make it yours.';
  })();
}
export { layoutPanels };
