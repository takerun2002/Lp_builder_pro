// Reference images: intake (DnD/paste/URL), rendering, and helpers

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function renderRefImages() {
  refList.innerHTML = '';
  for (const [idx, r] of refImages.entries()) {
    const card = document.createElement('div');
    card.className = 'ref-card';
    card.setAttribute('draggable', 'true');
    card.dataset.index = String(idx);
    const img = document.createElement('img');
    img.src = `data:${r.mimeType};base64,${r.base64}`;
    img.alt = r.name || '参考画像';
    const ed = document.createElement('button');
    ed.className = 'ed';
    ed.title = '編集';
    ed.textContent = '✎';
    ed.addEventListener('click', (e) => { e.stopPropagation(); openEditorWindow(idx).catch(console.error); });
    // Click to open full-window popup viewer like output images
    img.addEventListener('click', () => { openImagePopup(img.src); });
    const rm = document.createElement('button');
    rm.className = 'rm';
    rm.title = '削除';
    rm.textContent = '×';
    rm.addEventListener('click', () => { refImages.splice(idx, 1); renderRefImages(); savePanelStateDebounced(); });
    card.appendChild(img); card.appendChild(ed); card.appendChild(rm); refList.appendChild(card);

    // DnD reorder handlers
    card.addEventListener('dragstart', (e) => { card.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); } catch {} });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); });
    card.addEventListener('dragover', (e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch {} });
    card.addEventListener('drop', (e) => { e.preventDefault(); let from = idx; try { const d = e.dataTransfer.getData('text/plain'); if (d) from = Number(d); } catch {} const to = Number(card.dataset.index || idx); if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) { const [m] = refImages.splice(from, 1); refImages.splice(to, 0, m); renderRefImages(); savePanelStateDebounced(); } });
  }
}

async function downscaleImageFromBlob(blob, { maxBytes = MAX_IMAGE_BYTES, maxDim = 2048, mime = 'image/jpeg' } = {}) {
  try {
    const dataUrl = await new Promise((resolve, reject) => { const fr = new FileReader(); fr.onerror = () => reject(fr.error); fr.onload = () => resolve(String(fr.result || '')); fr.readAsDataURL(blob); });
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
    let w = img.naturalWidth; let h = img.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.floor(w * scale)); h = Math.max(1, Math.floor(h * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
    let lo = 0.5, hi = 0.95, best = null;
    for (let i = 0; i < 6; i++) { const q = i === 0 ? Math.min(0.9, hi) : (lo + hi) / 2; const b64 = canvas.toDataURL(mime, q); const est = Math.floor((b64.length - ('data:;base64,'.length)) * 0.75); if (est <= maxBytes) { best = b64; lo = q; } else { hi = q; } }
    const out = best || canvas.toDataURL(mime, 0.85);
    const comma = out.indexOf(',');
    return { mimeType: out.substring(5, out.indexOf(';')), base64: out.substring(comma + 1), width: w, height: h };
  } catch (e) { console.warn('downscaleImageFromBlob failed', e); return null; }
}

async function addRefFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (refImages.length >= MAX_REF_IMAGES) break;
    if (file.size > MAX_IMAGE_BYTES) {
      const downsized = await downscaleImageFromBlob(file);
      if (downsized) {
        refImages.push({ mimeType: downsized.mimeType, base64: downsized.base64, name: file.name, width: downsized.width, height: downsized.height });
        showToast((navigator.language||'').toLowerCase().startsWith('ja') ? '大きい画像を縮小して読み込みました' : 'Loaded by downscaling large image');
        continue;
      } else { console.warn('Skip large image > 8MB:', file.name); continue; }
    }
    try {
      const url = await readFileAsDataURL(file);
      const comma = url.indexOf(','); const meta = url.substring(0, comma); const base64 = url.substring(comma + 1);
      const mimeMatch = /data:(.*?);base64/.exec(meta); const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/png';
      const dim = await new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 0, h: 0 }); im.src = url; });
      if (dim.w === 0 || dim.h === 0 || dim.w < 64 || dim.h < 64 || file.size < 2048) { console.debug('Skip tiny/placeholder image from drop:', file.name, dim, file.size); continue; }
      if (refImages.some((r) => r.base64 === base64)) { console.log('Skip duplicate image (same content)'); continue; }
      refImages.push({ mimeType, base64, name: file.name, width: dim.w, height: dim.h });
    } catch (e) { console.error('Failed to read file', file.name, e); }
  }
  renderRefImages();
  savePanelStateDebounced();
}

function setupRefDropzone() {
  if (!refDrop) return;
  ['dragenter', 'dragover'].forEach((t) => refDrop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); refDrop.classList.add('drag'); }));
  ;['dragleave', 'dragend', 'drop'].forEach((t) => refDrop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); if (t !== 'drop') refDrop.classList.remove('drag'); }));
  refDrop.addEventListener('drop', (e) => {
    refDrop.classList.remove('drag');
    const dt = e.dataTransfer; const files = dt?.files;
    const imgFiles = files ? Array.from(files).filter((f) => (f.type || '').startsWith('image/')) : [];
    if (imgFiles.length) { addRefFiles(imgFiles); }
    else { extractUrlsFromDataTransfer(dt).then((urls) => { if (urls.length) addRefUrls(urls); }); }
  });
  refDrop.addEventListener('click', () => refFile?.click());
  refFile?.addEventListener('change', (e) => addRefFiles(e.target.files));

  document.addEventListener('paste', (e) => {
    const dt = e.clipboardData; if (!dt || !dt.items) return;
    const files = [];
    for (const item of dt.items) {
      if (item.kind === 'file' && item.type?.startsWith('image/')) {
        const f = item.getAsFile(); if (f) { const name = f.name && f.name.trim() ? f.name : 'pasted-image.png'; const typed = new File([f], name, { type: f.type || 'image/png' }); files.push(typed); }
      }
    }
    if (files.length) { addRefFiles(files); }
    if (!files.length) { extractUrlsFromDataTransfer(dt).then((urls) => { if (urls.length) addRefUrls(urls); }); }
  });
}

async function extractUrlsFromDataTransfer(dt) {
  const urls = [];
  if (!dt) return urls;
  try { const uriList = dt.getData ? dt.getData('text/uri-list') : ''; if (uriList) { const lines = uriList.split(/\r?\n/).filter((l) => l && !l.startsWith('#')); for (const l of lines) if (/^https?:/i.test(l)) urls.push(l); } } catch {}
  try { const plain = dt.getData ? dt.getData('text/plain') : ''; if (plain && /^https?:/i.test(plain.trim())) urls.push(plain.trim()); } catch {}
  try { const html = dt.getData ? dt.getData('text/html') : ''; if (html) { const doc = new DOMParser().parseFromString(html, 'text/html'); const img = doc.querySelector('img[src]'); const a = doc.querySelector('a[href]'); const cands = [img?.getAttribute('src'), a?.getAttribute('href')].filter(Boolean); for (const u of cands) if (/^https?:/i.test(u)) urls.push(u); } } catch {}
  return Array.from(new Set(urls));
}

async function addRefUrls(urls) {
  for (const url of urls) {
    if (refImages.length >= MAX_REF_IMAGES) break;
    try { const item = await fetchImageAsRef(url); if (item) { refImages.push(item); } }
    catch (e) { console.warn('Failed to fetch dropped URL', url, e); }
  }
  renderRefImages();
  savePanelStateDebounced();
}

async function fetchImageAsRef(url, depth = 0) {
  if (!/^https?:/i.test(url) && !/^data:/i.test(url)) return null;
  if (depth > 2) return null;
  try {
    if (url.startsWith('data:')) {
      const comma = url.indexOf(','); const meta = url.substring(0, comma); const base64 = url.substring(comma + 1);
      const mimeMatch = /data:(.*?);base64/.exec(meta); const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      return { mimeType, base64, name: 'dropped-data-url' };
    }

    const head = await fetch(url, { method: 'HEAD', referrerPolicy: 'no-referrer', credentials: 'omit' }).catch(() => null);
    const len = head ? Number(head.headers.get('content-length') || '0') : 0;
    const headType = head ? (head.headers.get('content-type') || '') : '';
    if (len && len > 24 * 1024 * 1024) { console.info('Skip very large remote image > 24MB', url); return null; }

    const res = await fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();

    if (!ct.startsWith('image/')) {
      if (ct.includes('text/html')) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let pick = doc.querySelector('meta[property="og:image"][content]')?.getAttribute('content') ||
                   doc.querySelector('meta[name="twitter:image"][content]')?.getAttribute('content') ||
                   doc.querySelector('link[rel="image_src"][href]')?.getAttribute('href');
        if (!pick) { const imgSet = doc.querySelector('img[srcset]')?.getAttribute('srcset'); if (imgSet) { const last = imgSet.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean).pop(); if (last) pick = last; } }
        if (!pick) pick = doc.querySelector('img[src]')?.getAttribute('src') || '';
        if (!pick) { const mCdn = html.match(/https:\/\/pbs\.twimg\.com\/[A-Za-z0-9_\-./%?=&]+/); if (mCdn) pick = mCdn[0]; }
        if (!pick) { const mImg = html.match(/https:\/\/[A-Za-z0-9_.\-/%?=&]+\.(?:png|jpe?g|gif|webp)(?:[?#][^"'<>\s]*)?/i); if (mImg) pick = mImg[0]; }
        if (pick) { const resolved = new URL(pick, res.url).toString(); return await fetchImageAsRef(resolved, depth + 1); }
      }
      console.info(`Dropped URL is not an image and no image could be extracted: ${String(url)} ${ct || headType}`);
      return null;
    }

    const blob = await res.blob();
    if (blob.size > MAX_IMAGE_BYTES) {
      const downsized = await downscaleImageFromBlob(blob);
      if (downsized) {
        const name = (() => { try { return new URL(url).pathname.split('/').pop() || 'remote-image'; } catch { return 'remote-image'; } })();
        return { mimeType: downsized.mimeType, base64: downsized.base64, name, width: downsized.width, height: downsized.height };
      }
      return null;
    }
    const mimeType = ct || 'image/png';
    const base64 = await new Promise((resolve, reject) => {
      const fr = new FileReader(); fr.onerror = () => reject(fr.error); fr.onload = () => { const s = String(fr.result || ''); const comma = s.indexOf(','); resolve(s.substring(comma + 1)); }; fr.readAsDataURL(blob);
    });
    const dim = await new Promise((res2) => { const im = new Image(); im.onload = () => res2({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res2({ w: 0, h: 0 }); im.src = `data:${mimeType};base64,${base64}`; });
    if (dim.w === 0 || dim.h === 0 || dim.w < 64 || dim.h < 64 || blob.size < 2048) { console.info(`Skip tiny/placeholder image from URL: ${String(url)} {w:${dim.w},h:${dim.h}} ${blob.size}`); return null; }
    const name = (() => { try { return new URL(url).pathname.split('/').pop() || 'remote-image'; } catch { return 'remote-image'; } })();
    return { mimeType, base64, name, width: dim.w, height: dim.h };
  } catch (e) { console.error('fetchImageAsRef failed', e); return null; }
}

// Initialize dropzone after refs module is loaded
try { setupRefDropzone(); } catch {}
