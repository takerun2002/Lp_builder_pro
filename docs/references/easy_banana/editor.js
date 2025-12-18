const $ = (q) => document.querySelector(q);

const canvas = $('#canvas');
const stage = $('#stage');
const toolSeg = $('#toolSeg');
const colorEl = $('#color');
const colorSwatches = $('#colorSwatches');
const sizeRange = $('#sizeRange');
const sizeNum = $('#sizeNum');
const undoBtn = $('#undo');
const redoBtn = $('#redo');
const zoomInBtn = $('#zoomIn');
const zoomOutBtn = $('#zoomOut');
const saveModeSeg = $('#saveModeSeg');
const saveBtn = $('#save');
const cancelBtn = $('#cancel');
const cursorEl = $('#cursor');
const opacityRange = $('#opacityRange');
const opacityNum = $('#opacityNum');
const sizePresets = $('#sizePresets');
const opacityPresets = $('#opacityPresets');

let tool = 'brush';
let color = '#000000';
let size = 4;
let zoom = 1;
let isPanning = false;
let lastPan = { x: 0, y: 0 };
let spaceDown = false;
let drawing = false;
let ctx;
let undoStack = [];
let redoStack = [];
let saveMode = 'replace'; // 'replace' | 'add'
let idx = -1;
let opacity = 100; // 0-100
let lastPt = null; // {x,y} in canvas coords

function usp() { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } }

function setZoom(z) {
  zoom = Math.min(Math.max(z, 0.1), 8);
  canvas.style.transform = `scale(${zoom})`;
  refreshCursorStyle();
}

function pushUndo() {
  try {
    const data = canvas.toDataURL('image/png');
    undoStack.push(data);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  } catch {}
}

function doUndo() {
  if (!undoStack.length) return;
  const data = undoStack.pop();
  redoStack.push(canvas.toDataURL('image/png'));
  loadDataUrlToCanvas(data);
}

function doRedo() {
  if (!redoStack.length) return;
  const data = redoStack.pop();
  undoStack.push(canvas.toDataURL('image/png'));
  loadDataUrlToCanvas(data);
}

function loadDataUrlToCanvas(dataUrl) {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx = canvas.getContext('2d');
    // White background (no transparency)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

async function init() {
  const params = usp();
  idx = Number(params.get('idx') || '-1');
  const key = params.get('key') || '';
  let src = params.get('src') || '';
  if (!src && key) {
    try {
      const data = await new Promise((resolve) => chrome.storage.session.get([key], (v) => resolve(v || {})));
      src = data[key] || '';
      try { await chrome.storage.session.remove([key]); } catch {}
    } catch {}
  }
  if (!src) { window.close(); return; }
  // Force white background during load
  loadDataUrlToCanvas(src);
  setZoom(1);
}

function beginDraw(x, y) {
  drawing = true;
  pushUndo();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = (tool === 'eraser') ? '#ffffff' : color;
  ctx.globalAlpha = Math.min(Math.max(opacity, 0), 100) / 100;
  lastPt = { x, y };
}

function drawTo(x, y) {
  if (!drawing) return;
  // Draw only the new segment to avoid repeatedly overpainting the whole path
  const lx = lastPt?.x ?? x;
  const ly = lastPt?.y ?? y;
  const dx = x - lx;
  const dy = y - ly;
  const dist = Math.hypot(dx, dy);
  const minDist = Math.max(1, size * 0.35); // spacing to reduce overdraw at low speeds
  if (dist < minDist) return; // skip until moved enough
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastPt = { x, y };
}

function endDraw() { drawing = false; ctx.globalAlpha = 1; lastPt = null; }

function canvasPointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) / zoom;
  const cy = (e.clientY - rect.top) / zoom;
  return { x: cx, y: cy };
}

// Events
toolSeg?.addEventListener('click', (e) => {
  const b = e.target?.closest?.('button');
  if (!b) return;
  toolSeg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  tool = b.dataset.tool || 'brush';
  refreshCursorStyle();
});

function setColor(hex) {
  const v = (hex || '#000000').toLowerCase();
  color = v;
  if (colorEl && colorEl.value?.toLowerCase() !== v) colorEl.value = v;
  // highlight swatch
  try {
    colorSwatches?.querySelectorAll?.('.swatch')?.forEach((b) => {
      if ((b.dataset.color || '').toLowerCase() === v) b.classList.add('selected');
      else b.classList.remove('selected');
    });
  } catch {}
  refreshCursorStyle();
}

colorEl?.addEventListener('input', () => { setColor(colorEl.value || '#000000'); });
colorSwatches?.addEventListener('click', (e) => {
  const b = e.target?.closest?.('.swatch'); if (!b) return;
  const hex = b.dataset.color || '#000000';
  setColor(hex);
});
function setSize(v){ size = Math.max(1, Math.min(200, Math.floor(Number(v)||4))); if(sizeRange) sizeRange.value=String(size); if(sizeNum) sizeNum.value=String(size); refreshCursorStyle(); }
sizeRange?.addEventListener('input', ()=> setSize(sizeRange.value));
sizeNum?.addEventListener('input', ()=> setSize(sizeNum.value));
sizePresets?.addEventListener('click', (e) => {
  const b = e.target?.closest?.('button'); if (!b) return;
  const v = parseInt(b.dataset.size || '0', 10);
  if (!v) return; setSize(v);
});
opacityRange?.addEventListener('input', () => {
  const v = Math.min(100, Math.max(0, parseInt(opacityRange.value || '100', 10)));
  opacity = v; if (opacityNum) opacityNum.value = String(v);
});
opacityNum?.addEventListener('input', () => {
  let v = parseInt(opacityNum.value || '100', 10);
  if (Number.isNaN(v)) v = 100;
  v = Math.min(100, Math.max(0, v));
  opacity = v; if (opacityRange) opacityRange.value = String(v);
});
opacityPresets?.addEventListener('click', (e) => {
  const b = e.target?.closest?.('button'); if (!b) return;
  const v = parseInt(b.dataset.opacity || '0', 10);
  if (Number.isNaN(v)) return;
  opacity = Math.min(100, Math.max(0, v));
  if (opacityRange) opacityRange.value = String(opacity);
  if (opacityNum) opacityNum.value = String(opacity);
});
undoBtn?.addEventListener('click', doUndo);
redoBtn?.addEventListener('click', doRedo);
zoomInBtn?.addEventListener('click', () => setZoom(zoom * 1.2));
zoomOutBtn?.addEventListener('click', () => setZoom(zoom / 1.2));

saveModeSeg?.addEventListener('click', (e) => {
  const b = e.target?.closest?.('button'); if (!b) return;
  saveModeSeg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  saveMode = b.dataset.mode || 'replace';
});

saveBtn?.addEventListener('click', async () => {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.substring(0, comma);
    const base64 = dataUrl.substring(comma + 1);
    const mimeMatch = /data:(.*?);base64/i.exec(meta);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    await chrome.runtime.sendMessage({ type: 'editor:saved', idx, mode: saveMode, inlineData: { mimeType, data: base64 } });
    window.close();
  } catch (e) {
    console.error(e);
    alert('保存に失敗しました');
  }
});

cancelBtn?.addEventListener('click', () => window.close());

// Pan & draw
document.addEventListener('keydown', (e) => { if (e.code === 'Space') { spaceDown = true; e.preventDefault(); } });
document.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; } });

// Wheel zoom sensitivity (Ctrl/Cmd + wheel): smaller step for smoother feel
const WHEEL_ZOOM_STEP = 0.03; // 3% per tick (was ~10%)
stage.addEventListener('wheel', (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? (1 + WHEEL_ZOOM_STEP) : (1 - WHEEL_ZOOM_STEP);
    setZoom(zoom * factor);
  }
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  if (spaceDown) { isPanning = true; lastPan = { x: e.clientX, y: e.clientY }; return; }
  const p = canvasPointFromEvent(e); beginDraw(p.x, p.y);
});
canvas.addEventListener('mousemove', (e) => {
  if (isPanning) {
    const dx = e.clientX - lastPan.x; const dy = e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    const sc = stage.scrollLeft; const st = stage.scrollTop;
    stage.scrollTo({ left: sc - dx, top: st - dy });
    return;
    }
  const p = canvasPointFromEvent(e); drawTo(p.x, p.y);
});
document.addEventListener('mouseup', () => { isPanning = false; endDraw(); });

function refreshCursorStyle() {
  if (!cursorEl) return;
  const d = Math.max(2, size * zoom);
  cursorEl.style.width = `${d}px`;
  cursorEl.style.height = `${d}px`;
  const borderColor = (tool === 'eraser') ? '#cccccc' : (color || '#ffd54f');
  cursorEl.style.borderColor = borderColor;
}

function updateCursorPositionFromEvent(e) {
  if (!cursorEl) return;
  // Hide cursor while panning or outside canvas
  if (spaceDown || isPanning) { cursorEl.style.left = '-9999px'; return; }
  const rectStage = stage.getBoundingClientRect();
  const rectCanvas = canvas.getBoundingClientRect();
  const inside = e.clientX >= rectCanvas.left && e.clientX <= rectCanvas.right && e.clientY >= rectCanvas.top && e.clientY <= rectCanvas.bottom;
  if (!inside) { cursorEl.style.left = '-9999px'; return; }
  const x = stage.scrollLeft + (e.clientX - rectStage.left);
  const y = stage.scrollTop + (e.clientY - rectStage.top);
  cursorEl.style.left = `${x}px`;
  cursorEl.style.top = `${y}px`;
}

stage.addEventListener('mousemove', updateCursorPositionFromEvent);
stage.addEventListener('mouseenter', (e) => { refreshCursorStyle(); updateCursorPositionFromEvent(e); });
stage.addEventListener('mouseleave', () => { if (cursorEl) cursorEl.style.left = '-9999px'; });

init();
