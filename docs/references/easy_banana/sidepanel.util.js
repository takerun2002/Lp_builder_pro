// Utility helpers and shared constants for Side Panel

// Network timeouts (ms)
const GENERATE_TIMEOUT_MS = 60_000; // 60s for both Gemini and OpenRouter

function fetchWithTimeout(url, options, timeoutMs = GENERATE_TIMEOUT_MS, externalController) {
  const controller = externalController || new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  const opts = { ...(options || {}), signal: controller.signal };
  return fetch(url, opts).finally(() => clearTimeout(timer));
}

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

async function copyImageFromElement(imgEl) {
  // Draw to canvas to ensure compatible PNG copy regardless of input mime
  const canvas = document.createElement('canvas');
  canvas.width = imgEl.naturalWidth;
  canvas.height = imgEl.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0);
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
    // Convert data URL or http URL to blob URL to avoid storage quota issues
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

function approximateBytesFromBase64(b64) {
  return Math.floor((b64?.length || 0) * 0.75);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(file);
  });
}

