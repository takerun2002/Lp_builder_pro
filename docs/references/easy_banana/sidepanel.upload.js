/**
 * sidepanel.upload.js
 * FAL CDN upload utilities for Easy Banana sidepanel
 *
 * Note: base64ToBlob() is defined in sidepanel.util.js
 */

/**
 * Guess file extension from MIME type
 * @param {string} mime - MIME type
 * @param {string} fallback - Fallback extension
 * @returns {string}
 */
function guessImageExtension(mime, fallback) {
  if (!mime || typeof mime !== 'string') return fallback;
  const lower = mime.toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('gif')) return 'gif';
  return fallback;
}

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload image to FAL CDN
 * @param {Blob} blob - Image blob
 * @param {string} mimeType - MIME type (e.g., "image/jpeg")
 * @param {string} filename - Filename (optional)
 * @param {string} apiKey - FAL API key
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Promise<{url: string, error: Error|null}>}
 */
async function uploadFalImage(blob, mimeType, filename, apiKey, timeoutMs = 30000) {
  if (!blob) {
    return { url: '', error: new Error('画像が見つかりません。') };
  }

  const defaultExt = 'jpg';
  const fname = filename || `image.${guessImageExtension(mimeType, defaultExt)}`;
  const mime = mimeType || 'image/jpeg';

  const maxUploadSizeMb = 10;
  const sizeMb = blob.size / (1024 * 1024);
  if (sizeMb > maxUploadSizeMb) {
    return { url: '', error: new Error(`画像が大きすぎます（約${sizeMb.toFixed(2)}MB）。${maxUploadSizeMb}MB以下にしてください。`) };
  }

  const restBase = 'https://rest.alpha.fal.ai/storage/upload';
  const initiateEndpoints = [
    `${restBase}/initiate?storage_type=fal-cdn-v3`,
    `${restBase}/initiate?storage_type=fal-cdn`,
    `${restBase}/initiate`
  ];
  const legacyFormEndpoints = [
    'https://api.fal.ai/v1/storage/upload',
    'https://api.fal.run/v1/storage/upload',
    'https://fal.run/api/v1/storage/upload',
    'https://fal.ai/api/v1/storage/upload'
  ];

  const tryInitiateUpload = async (endpoint) => {
    let response;
    try {
      response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          content_type: mime,
          file_name: fname
        }),
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, Math.max(timeoutMs, 30000));
    } catch (err) {
      console.error('[SidePanel] FAL image upload initiate failed', endpoint, err);
      throw new Error('画像のアップロード初期化に失敗しました。');
    }

    if (!response.ok) {
      let message = `画像のアップロード初期化に失敗しました (HTTP ${response.status})`;
      try {
        const data = await response.json();
        message = data?.error || data?.message || message;
      } catch {}
      throw new Error(message);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      console.error('[SidePanel] FAL image upload initiate parse error', endpoint, err);
      throw new Error('画像のアップロードURLを取得できませんでした。');
    }

    const uploadUrl = data?.upload_url || data?.uploadUrl;
    const fileUrl = data?.file_url || data?.fileUrl || data?.url;
    if (!uploadUrl || !fileUrl) {
      console.warn('[SidePanel] FAL image upload initiate missing fields', data);
      throw new Error('画像のアップロードURLを取得できませんでした。');
    }

    let uploadResponse;
    try {
      uploadResponse = await fetchWithTimeout(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mime
        },
        body: blob,
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, Math.max(timeoutMs, 60000));
    } catch (err) {
      console.error('[SidePanel] FAL image upload PUT failed', uploadUrl, err);
      throw new Error('画像のアップロード中にエラーが発生しました。');
    }

    if (!uploadResponse.ok) {
      let message = `画像のアップロードに失敗しました (HTTP ${uploadResponse.status})`;
      try {
        const text = await uploadResponse.text();
        if (text) message = text;
      } catch {}
      throw new Error(message);
    }

    return { url: fileUrl, error: null };
  };

  let lastError = null;
  for (const endpoint of initiateEndpoints) {
    try {
      return await tryInitiateUpload(endpoint);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err || ''));
      console.warn('[SidePanel] FAL image upload initiate fallback', endpoint, lastError?.message);
    }
  }

  for (const endpoint of legacyFormEndpoints) {
    const form = new FormData();
    form.append('file', blob, fname);
    if (mime) form.append('content_type', mime);
    form.append('filename', fname);

    let response;
    try {
      response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`
        },
        body: form,
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, Math.max(timeoutMs, 45000));
    } catch (err) {
      console.error('[SidePanel] FAL image upload request failed', endpoint, err);
      lastError = new Error('画像のアップロードリクエストに失敗しました。');
      continue;
    }

    let text = '';
    try { text = await response.text(); } catch {}

    if (!response.ok) {
      let message = `画像のアップロードに失敗しました (HTTP ${response.status})`;
      if (text) {
        try {
          const data = JSON.parse(text);
          message = data?.error || data?.message || message;
        } catch {}
      }
      console.warn('[SidePanel] FAL image upload non-OK', endpoint, message);
      lastError = new Error(message);
      continue;
    }

    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch {}
    }
    const url = data?.url || data?.file_url || data?.fileUrl;
    if (url) {
      return { url, error: null };
    }

    console.warn('[SidePanel] FAL image upload missing URL', endpoint, data);
    lastError = new Error('画像のアップロードURLを取得できませんでした。');
  }

  return { url: '', error: lastError || new Error('画像のアップロードに失敗しました。') };
}
