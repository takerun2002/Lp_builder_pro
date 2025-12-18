const grid = document.getElementById('grid');
const fileInput = document.getElementById('file');
const importBtn = document.getElementById('importBtn');
const removeSelBtn = document.getElementById('removeSel');
const addSelectedBtn = document.getElementById('addSelected');
const closeBtn = document.getElementById('close');
const dz = document.getElementById('dz');
const srcUserBtn = document.getElementById('srcUser');
const srcOfficialBtn = document.getElementById('srcOfficial');
const officialNote = document.getElementById('officialNote');

let items = []; // [{id, name, mimeType, base64, created}]
let templates = []; // official assets
let selected = new Set();
let mode = 'user'; // 'user' | 'official'

// Storage limits for library
const MAX_IMAGE_BYTES = 500 * 1024; // 500KB per image
const MAX_LIBRARY_BYTES = 9 * 1024 * 1024; // 9MB total for user library (unlimitedStorage allows 10MB, leave 1MB buffer)
const MAX_IMAGE_DIM = 1536; // 1536px max dimension

function uid() { return `img_${Date.now()}_${Math.random().toString(36).slice(2,9)}`; }

// Estimate bytes from base64 string (reverse base64 overhead)
function approximateBytesFromBase64(base64) {
  return Math.floor((base64?.length || 0) * 0.75);
}

// Downscale image to fit size/dimension limits
async function downscaleImageFromBlob(blob, { maxBytes = MAX_IMAGE_BYTES, maxDim = MAX_IMAGE_DIM, mime = 'image/jpeg' } = {}) {
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const targetW = Math.max(1, Math.floor(w * scale));
    const targetH = Math.max(1, Math.floor(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Binary search for optimal quality
    let lo = 0.5, hi = 0.95, best = null;
    for (let i = 0; i < 6; i++) {
      const q = (i === 0) ? Math.min(0.9, hi) : (lo + hi) / 2;
      const b64 = canvas.toDataURL(mime, q);
      const est = Math.floor((b64.length - ('data:;base64,'.length)) * 0.75);
      if (est <= maxBytes) {
        best = b64;
        lo = q;
      } else {
        hi = q;
      }
    }

    const result = best || canvas.toDataURL(mime, 0.85);
    const comma = result.indexOf(',');
    const mimeMatch = /^data:([^;]+)/.exec(result);
    const mimeType = mimeMatch ? mimeMatch[1] : mime;
    const base64 = result.substring(comma + 1);

    return { mimeType, base64, width: targetW, height: targetH };
  } catch (e) {
    console.error('Downscale failed:', e);
    return null;
  }
}

function getActiveItems() { return mode === 'user' ? items : templates; }

function render() {
  grid.innerHTML = '';
  const src = getActiveItems();
  for (const it of src) {
    const card = document.createElement('label');
    card.className = 'card';
    const head = document.createElement('div');
    head.className = 'head';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = it.name || 'image';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = selected.has(it.id);
    chk.addEventListener('change', () => {
      if (chk.checked) selected.add(it.id); else selected.delete(it.id);
    });
    head.appendChild(meta);
    head.appendChild(chk);

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = `data:${it.mimeType};base64,${it.base64}`;
    img.alt = it.name || 'thumb';
    // Click to open viewer popup
    img.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      openImagePopup(img.src);
    });

    const actions = document.createElement('div');
    actions.className = 'img-actions';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'ダウンロード';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'クリップボードにコピー';
    actions.appendChild(saveBtn);
    actions.appendChild(copyBtn);

    card.appendChild(head);
    card.appendChild(img);
    card.appendChild(actions);
    grid.appendChild(card);

    // Prevent label toggling when pressing buttons
    [saveBtn, copyBtn].forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }));
    saveBtn.addEventListener('click', () => {
      try {
        const blob = base64ToBlob(it.mimeType, it.base64);
        const name = it.name || 'image';
        const ts = new Date(it.created || Date.now()).toISOString().replace(/[:.]/g, '-');
        const ext = (it.mimeType.includes('jpeg')||it.mimeType.includes('jpg'))? 'jpg' : (it.mimeType.includes('png')? 'png' : 'img');
        downloadBlob(`${name}-${ts}.${ext}`, blob);
      } catch (e) { console.error(e); alert('ダウンロードに失敗しました'); }
    });
    copyBtn.addEventListener('click', async () => {
      try {
        await copyImageFromData(it.mimeType, it.base64);
        copyBtn.textContent = 'コピーしました';
        setTimeout(()=>copyBtn.textContent='クリップボードにコピー', 1200);
      } catch (e) { console.error(e); alert('クリップボードへのコピーに失敗しました'); }
    });
  }
}

async function load() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(['imageLibrary'], (v) => resolve(v?.imageLibrary || []));
  });
  items = Array.isArray(data) ? data : [];
  selected.clear();
  render();
  updateStorageMeter();
}

async function save() {
  try {
    await chrome.storage.local.set({ imageLibrary: items });
  } catch (e) {
    console.error('Save failed:', e);
    if (e.message && e.message.includes('quota')) {
      showToast('保存に失敗しました。ライブラリの容量がいっぱいです。');
    } else {
      showToast('保存に失敗しました。');
    }
    throw e;
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });
}

async function importFiles(files) {
  const arr = Array.from(files || []);
  let compressed = 0;
  let skipped = 0;

  for (const f of arr) {
    if (!f.type?.startsWith('image/')) continue;

    // Check current library size before adding
    const currentSize = items.reduce((sum, it) => sum + approximateBytesFromBase64(it.base64), 0);
    if (currentSize >= MAX_LIBRARY_BYTES) {
      skipped++;
      continue;
    }

    // Compress image to fit limits
    const downsized = await downscaleImageFromBlob(f);
    if (!downsized) {
      console.warn('Failed to process image:', f.name);
      skipped++;
      continue;
    }

    // Check if adding this image would exceed total limit
    const imageSize = approximateBytesFromBase64(downsized.base64);
    if (currentSize + imageSize > MAX_LIBRARY_BYTES) {
      showToast('ライブラリの容量がいっぱいです。不要な画像を削除してください。');
      break;
    }

    items.push({
      id: uid(),
      name: f.name,
      mimeType: downsized.mimeType,
      base64: downsized.base64,
      created: Date.now()
    });

    // Show feedback if image was significantly compressed
    if (f.size > MAX_IMAGE_BYTES) {
      compressed++;
    }
  }

  await save();
  render();
  updateStorageMeter();

  // User feedback
  if (compressed > 0) {
    showToast(`${compressed}枚の画像を最適化して追加しました`);
  }
  if (skipped > 0) {
    showToast(`${skipped}枚の画像を追加できませんでした（容量超過）`);
  }
}

// Paste from clipboard (image files)
document.addEventListener('paste', (e) => {
  if (mode !== 'user') return;
  const dt = e.clipboardData;
  if (!dt || !dt.items) return;
  const files = [];
  for (const item of dt.items) {
    if (item.kind === 'file' && item.type?.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) {
        const name = f.name && f.name.trim() ? f.name : 'pasted-image.png';
        files.push(new File([f], name, { type: f.type || 'image/png' }));
      }
    }
  }
  if (files.length) importFiles(files);
});

importBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => importFiles(e.target.files));

removeSelBtn.addEventListener('click', async () => {
  if (!selected.size) return;
  items = items.filter((it) => !selected.has(it.id));
  selected.clear();
  await save();
  render();
  updateStorageMeter();
});

addSelectedBtn.addEventListener('click', () => {
  const picked = getActiveItems().filter((it) => selected.has(it.id)).map((it) => ({
    name: it.name,
    inlineData: { mimeType: it.mimeType, data: it.base64 }
  }));
  chrome.runtime.sendMessage({ type: 'library:selected', images: picked }, () => {
    window.close();
  });
});

closeBtn.addEventListener('click', () => window.close());

// Dropzone
;['dragenter','dragover'].forEach((t) => dz.addEventListener(t, (e)=>{ e.preventDefault(); e.stopPropagation(); dz.classList.add('drag'); }));
;['dragleave','dragend','drop'].forEach((t) => dz.addEventListener(t, (e)=>{ e.preventDefault(); e.stopPropagation(); if(t!=='drop') dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => { dz.classList.remove('drag'); const f = e.dataTransfer?.files; if (f?.length) importFiles(f); });
dz.addEventListener('click', () => fileInput.click());

// Source switching
function setMode(m) {
  mode = m;
  selected.clear();
  if (mode === 'official') {
    importBtn.disabled = true; removeSelBtn.disabled = true; dz.classList.add('hidden'); fileInput.classList.add('hidden');
    srcUserBtn.classList.remove('active'); srcOfficialBtn.classList.add('active');
    loadTemplates();
  } else {
    importBtn.disabled = false; removeSelBtn.disabled = false; dz.classList.remove('hidden'); fileInput.classList.add('hidden');
    srcOfficialBtn.classList.remove('active'); srcUserBtn.classList.add('active');
    officialNote?.classList.add('hidden');
    render();
  }
}

srcUserBtn?.addEventListener('click', () => setMode('user'));
srcOfficialBtn?.addEventListener('click', () => setMode('official'));

async function loadTemplates() {
  try {
    officialNote?.classList.add('hidden');
    const idxUrl = chrome.runtime.getURL('template/index.json');
    const idxRes = await fetch(idxUrl);
    if (!idxRes.ok) throw new Error('index not found');
    const list = await idxRes.json(); // ["a.png", {name, path}]
    const arr = Array.isArray(list) ? list : [];
    const out = [];
    for (const entry of arr) {
      const path = typeof entry === 'string' ? entry : (entry.path || entry.url || '');
      if (!path) continue;
      const name = typeof entry === 'string' ? entry.split('/').pop() : (entry.name || path.split('/').pop());
      const url = chrome.runtime.getURL(`template/${path}`);
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const mimeType = blob.type || 'image/png';
        const base64 = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = () => reject(fr.error);
          fr.onload = () => {
            const s = String(fr.result || '');
            resolve(s.substring(s.indexOf(',') + 1));
          };
          fr.readAsDataURL(blob);
        });
        out.push({ id: uid(), name, mimeType, base64, created: Date.now() });
      } catch {}
    }
    templates = out;
    render();
  } catch (e) {
    templates = [];
    render();
    officialNote?.classList.remove('hidden');
  }
}

load();
setMode('user');

// Helpers for actions / viewer
function base64ToBlob(mimeType, base64) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  URL.revokeObjectURL(url);
}
async function copyImageFromData(mimeType, base64) {
  // Draw to canvas to ensure compatibility and avoid huge data URLs on clipboard
  const img = document.createElement('img');
  img.src = `data:${mimeType};base64,${base64}`;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('画像の準備に失敗しました'));
      try { await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); resolve(); }
      catch (e) { reject(e); }
    }, 'image/png');
  });
}

async function openImagePopup(src) {
  const url = new URL(chrome.runtime.getURL('viewer.html'));
  try {
    // Convert data URL to blob URL to avoid storage quota issues
    const res = await fetch(src, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    url.searchParams.set('src', blobUrl);
  } catch (e) {
    // Fallback to direct src if blob creation fails
    console.warn('Failed to create blob URL. Fallback to src param', e);
    url.searchParams.set('src', src);
  }
  try {
    await chrome.windows.create({ url: url.toString(), type: 'popup', focused: true, width: Math.min(screen.availWidth, 1600), height: Math.min(screen.availHeight, 1000), left: 0, top: 0 });
  } catch (e) {
    window.open(url.toString(), '_blank');
  }
}

// Toast notification
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// Update storage meter UI
function updateStorageMeter() {
  const meterEl = document.getElementById('storageMeter');
  if (!meterEl) return;

  const totalBytes = items.reduce((sum, it) => sum + approximateBytesFromBase64(it.base64), 0);
  const usedMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const maxMB = (MAX_LIBRARY_BYTES / (1024 * 1024)).toFixed(1);
  const percentage = Math.min(100, Math.floor((totalBytes / MAX_LIBRARY_BYTES) * 100));

  meterEl.textContent = `ライブラリ: ${usedMB}MB / ${maxMB}MB 使用中 (${percentage}%)`;

  // Add color coding
  if (percentage >= 90) {
    meterEl.style.color = '#d32f2f';
  } else if (percentage >= 70) {
    meterEl.style.color = '#f57c00';
  } else {
    meterEl.style.color = '';
  }
}
