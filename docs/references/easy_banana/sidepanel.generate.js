// Extraction of generation-related functions from sidepanel.js
// Keeps function names global so existing calls continue to work.

function parseGeminiCandidates(candidates, textsOut, modelLabel, modelSlotIndex, onImage) {
  const texts = textsOut || [];
  const cands = Array.isArray(candidates) ? candidates : [];
  for (const cand of cands) {
    const parts = cand?.content?.parts || [];
    for (const p of parts) {
      if (p.text) texts.push(p.text);
      if (p.inlineData?.data) {
        const mime = p.inlineData.mimeType || 'image/png';
        if (typeof onImage === 'function') {
          onImage(mime, p.inlineData.data, modelLabel, modelSlotIndex);
        }
      }
    }
  }
  return texts;
}

async function generateViaGemini(apiKey, prompt, opts = {}) {
  let model = opts.model; let timeoutMs = opts.timeoutMs;
  const slotIndex = Number(opts.modelSlotIndex) || 1;
  if (!model || !timeoutMs || !opts.modelLabel) {
    const r = await getSelectedModelAndTimeoutAny();
    model = model || r.model;
    timeoutMs = timeoutMs || r.timeoutMs;
    if (!opts.modelLabel) opts.modelLabel = r.label;
  }
  const url = opts.endpoint || GEMINI_GENERATE_ENDPOINT(model);
  const refs = Array.isArray(opts.refImages) ? opts.refImages : refImages;
  const imageParts = refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.base64 } }));
  const body = {
    contents: [
      {
        role: 'user',
        parts: [...imageParts, { text: prompt }]
      }
    ]
  };
  const controller = opts.controller || new AbortController();
  let res;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      referrerPolicy: 'no-referrer',
      credentials: 'omit'
    }, timeoutMs, controller);
  } catch (e) {
    if (e?.name === 'AbortError' || e === 'timeout') {
      if (opts.isCanceled?.()) throw new Error((navigator.language||'').toLowerCase().startsWith('ja') ? 'キャンセルしました' : 'Canceled');
      throw new Error(buildTimeoutMessage(timeoutMs));
    }
    throw e;
  }
  if (!res.ok) {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const raw = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      if (ct.includes('application/json')) {
        const j = JSON.parse(raw);
        const apiMsg = j?.error?.message || j?.message || '';
        if (apiMsg) msg = apiMsg;
        const reasons = JSON.stringify(j).toLowerCase();
        if (reasons.includes('api_key_invalid') || reasons.includes('api key not valid')) {
          msg = 'APIキーが無効です。設定ボタンから正しいキーを入力してください。';
        }
      } else if (raw) {
        msg = raw.split('\n').find((l) => l.trim())?.trim() || msg;
      }
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  const texts = parseGeminiCandidates(data?.candidates || [], [], opts.modelLabel, slotIndex, opts.onImage);
  return { text: texts.join('\n\n') };
}

async function parseOpenRouterResponse(data, modelLabel, modelSlotIndex, onImage) {
  const texts = [];

  // Helper to handle a single content block
  const handleContentItem = async (c) => {
    const t = (c?.type || '').toLowerCase();
    if (t === 'text' && typeof c.text === 'string') {
      texts.push(c.text);
      return;
    }
    if (t === 'image_url' || t === 'image' || t === 'output_image') {
      // Possible shapes:
      // - { type: 'image_url', image_url: { url } }
      // - { type: 'image', image_url: { url } }
      // - { type: 'image_url', image_url: 'data:...' }
      // - { type: 'image', b64_json: '...' } or { data: '...' }
      let url = '';
      if (typeof c.image_url === 'string') url = c.image_url;
      else if (c?.image_url?.url) url = c.image_url.url;
      else if (typeof c?.url === 'string') url = c.url;
      if (url) {
        await appendImageFromUrlMaybeData(url, modelLabel, modelSlotIndex, onImage);
        return;
      }
      const b64 = c?.b64_json || c?.data || '';
      if (b64) {
        if (typeof onImage === 'function') onImage('image/png', b64, modelLabel, modelSlotIndex);
        return;
      }
    }
  };

  // Chat Completions shape
  const choices = Array.isArray(data?.choices) ? data.choices : [];
  for (const ch of choices) {
    const msg = ch?.message || {};
    const content = msg.content;
    if (typeof content === 'string') {
      texts.push(content);
    } else if (Array.isArray(content)) {
      for (const c of content) await handleContentItem(c);
    }
    // Some providers return images under message.images instead of message.content
    if (Array.isArray(msg.images)) {
      for (const c of msg.images) await handleContentItem(c);
    }
  }

  // Responses shape (fallback)
  const output = Array.isArray(data?.output) ? data.output : [];
  for (const item of output) {
    const content = item?.content;
    if (typeof content === 'string') {
      texts.push(content);
    } else if (Array.isArray(content)) {
      for (const c of content) await handleContentItem(c);
    }
  }

  return { text: texts.join('\n\n') };
}

async function generateViaOpenRouter(apiKey, prompt, opts = {}) {
  let model = opts.model; let timeoutMs = opts.timeoutMs;
  const slotIndex = Number(opts.modelSlotIndex) || 1;
  if (!model || !timeoutMs || !opts.modelLabel) {
    const r = await getSelectedModelAndTimeoutAny();
    model = model || r.model;
    timeoutMs = timeoutMs || r.timeoutMs;
    if (!opts.modelLabel) opts.modelLabel = r.label;
  }
  const refs = Array.isArray(opts.refImages) ? opts.refImages : refImages;
  const body = {
    model,
    messages: [
      { role: 'user', content: buildOpenRouterUserContent(prompt, refs) }
    ]
  };
  const controller = opts.controller || new AbortController();
  let res;
  try {
    res = await fetchWithTimeout(opts.endpoint || OPENROUTER_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Easy Banana'
      },
      body: JSON.stringify(body),
      referrerPolicy: 'no-referrer',
      credentials: 'omit'
    }, timeoutMs, controller);
  } catch (e) {
    if (e?.name === 'AbortError' || e === 'timeout') {
      if (opts.isCanceled?.()) throw new Error((navigator.language||'').toLowerCase().startsWith('ja') ? 'キャンセルしました' : 'Canceled');
      throw new Error(buildTimeoutMessage(timeoutMs));
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      msg = j?.error?.message || j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return await parseOpenRouterResponse(data, opts.modelLabel, slotIndex, opts.onImage);
}
async function generateViaFal(apiKey, prompt, opts = {}) {
  let model = opts.model; let timeoutMs = opts.timeoutMs;
  const slotIndex = Number(opts.modelSlotIndex) || 1;
  if (!model || !timeoutMs || !opts.modelLabel) {
    const r = await getSelectedModelAndTimeoutAny();
    model = model || r.model;
    timeoutMs = timeoutMs || r.timeoutMs;
    if (!opts.modelLabel) opts.modelLabel = r.label;
  }
  const url = (opts.endpoint || '').trim();
  if (!url) throw new Error('モデル定義に endpoint がありません');

  // FAL has two public HTTP surfaces:
  // - api.fal.ai/v1/run/<app> expects { input: {...} }
  // - queue.fal.run/<app> expects fields at top-level (no input wrapper)
  const isQueue = /queue\.fal\.run/i.test(url);
  const refs = Array.isArray(opts.refImages) ? opts.refImages : refImages;

  // Upload reference images to FAL CDN (with Base64 fallback)
  const imageUrls = [];
  if (Array.isArray(refs) && refs.length) {
    // Show upload status
    const btn = document.getElementById('gen');
    const originalText = btn?.textContent || '';
    const isJa = (navigator.language || '').toLowerCase().startsWith('ja');

    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];

      // Update button status
      if (btn) {
        btn.textContent = isJa ? '準備中...' : 'Preparing...';
      }

      try {
        // Convert Base64 to Blob (mimeType, base64)
        const blob = base64ToBlob(ref.mimeType, ref.base64);

        // Upload to FAL CDN
        const result = await uploadFalImage(blob, ref.mimeType, ref.name, apiKey, timeoutMs);

        if (result?.url) {
          // Success: use CDN URL
          imageUrls.push(result.url);
          console.log(`[SidePanel] Uploaded reference image ${i + 1}/${refs.length} to FAL CDN:`, result.url);
        } else {
          // Fallback: use Base64 data URI
          const dataUri = `data:${ref.mimeType};base64,${ref.base64}`;
          imageUrls.push(dataUri);
          console.warn(`[SidePanel] FAL upload failed for image ${i + 1}, using Base64 fallback:`, result?.error);
        }
      } catch (err) {
        // Fallback: use Base64 data URI
        const dataUri = `data:${ref.mimeType};base64,${ref.base64}`;
        imageUrls.push(dataUri);
        console.error(`[SidePanel] Error uploading image ${i + 1}, using Base64 fallback:`, err);
      }
    }

    // Restore button text (will be updated by updateJobControls)
    if (btn) {
      btn.textContent = originalText;
    }
  }

  const count = Math.min(Math.max(Number(opts?.numImages || 1), 1), 4);
  const core = {
    prompt: prompt,
    num_images: count,
    max_images: count,
    enable_safety_checker: true
  };
  // Aspect ratio: if provided, use it (for nano-banana-pro models)
  const hasAspectRatio = opts?.aspectRatio && typeof opts.aspectRatio === 'string' && opts.aspectRatio.trim();
  if (hasAspectRatio) {
    core.aspect_ratio = opts.aspectRatio.trim();
    // Resolution: default to 1K for nano-banana-pro models
    core.resolution = '1K';
    core.output_format = 'png';
  } else {
    // Image size: prefer explicit UI size (opts.size), then first reference image, else default 1280x1280
    // Note: image_size and aspect_ratio are mutually exclusive in FAL API
    try {
      if (opts?.size && opts.size.width && opts.size.height) {
        core.image_size = { width: Number(opts.size.width), height: Number(opts.size.height) };
      } else {
        const first = (Array.isArray(refs) && refs[0]) ? refs[0] : null;
        if (first && first.width && first.height) {
          core.image_size = { width: Number(first.width), height: Number(first.height) };
        } else {
          core.image_size = { width: 1280, height: 1280 };
        }
      }
    } catch {}
  }
  if (imageUrls.length) core.image_urls = imageUrls;
  const body = isQueue ? core : { input: core };
  const label = opts.modelLabel || (model ? `${model}` : '');

  const controller = opts.controller || new AbortController();
  let res;
  try {
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      referrerPolicy: 'no-referrer',
      credentials: 'omit'
    }, timeoutMs, controller);
  } catch (e) {
    if (e?.name === 'AbortError' || e === 'timeout') {
      if (opts.isCanceled?.()) throw new Error((navigator.language||'').toLowerCase().startsWith('ja') ? 'キャンセルしました' : 'Canceled');
      throw new Error(buildTimeoutMessage(timeoutMs));
    }
    throw e;
  }

  if (!res.ok) {
    const txt = await res.text();
    let msg = `HTTP ${res.status}`;
    try { const j = JSON.parse(txt); msg = j?.error || j?.message || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();

  // If queue API: first response usually returns { request_id }
  let imagesArray = Array.isArray(data?.images) ? data.images
                     : Array.isArray(data?.output?.images) ? data.output.images
                     : [];
  let text = data?.text || data?.output?.text || '';

  // If no images yet and we have a request id, poll for result
  const rid = data?.request_id || data?.requestId || data?.id || '';
  if (!imagesArray.length && rid && isQueue) {
    const started = Date.now();
    const base = url.replace(/\/?$/, '');
    const candidates = [
      (id) => `${base}/${id}`,
      (id) => `${base}/${id}/status`,
      (id) => `${base}/${id}/result`,
      (id) => `${base}/requests/${id}`,
      (id) => `${base}/requests/${id}/status`,
      (id) => `${base}/requests/${id}/result`
    ];
    const extra = [data?.status_url, data?.result_url, data?.response_url, data?.urls?.status, data?.urls?.result].filter(u => typeof u === 'string' && u.startsWith('http'));
    const tryFetch = async () => {
      if (opts.isCanceled?.()) throw new Error((navigator.language||'').toLowerCase().startsWith('ja') ? 'キャンセルしました' : 'Canceled');
      for (const build of candidates) {
        try {
          const res2 = await fetchWithTimeout(build(rid), {
            headers: { 'Authorization': `Key ${apiKey}`, 'Accept': 'application/json' },
            referrerPolicy: 'no-referrer',
            credentials: 'omit'
          }, Math.min(10_000, Math.max(5_000, timeoutMs - (Date.now() - started))), controller);
          if (!res2.ok) continue;
          const j = await res2.json();
          const imgs = Array.isArray(j?.images) ? j.images
                    : Array.isArray(j?.output?.images) ? j.output.images
                    : Array.isArray(j?.data?.images) ? j.data.images
                    : Array.isArray(j?.result?.images) ? j.result.images
                    : [];
          if (imgs && imgs.length) {
            imagesArray = imgs;
            text = j?.text || j?.output?.text || j?.data?.text || j?.result?.text || text || '';
            return true;
          }
          const st = (j?.status || j?.queue_status || '').toString().toUpperCase();
          if (st.includes('FAILED') || st.includes('CANCEL')) {
            throw new Error('FAL job failed');
          }
        } catch (_) { /* ignore and retry */ }
      }
      // Try any absolute extra endpoints, if present
      for (const abs of extra) {
        try {
          const res3 = await fetchWithTimeout(abs, {
            headers: { 'Authorization': `Key ${apiKey}`, 'Accept': 'application/json' },
            referrerPolicy: 'no-referrer',
            credentials: 'omit'
          }, Math.min(10_000, Math.max(5_000, timeoutMs - (Date.now() - started))), controller);
          if (!res3.ok) continue;
          const j2 = await res3.json();
          const imgs2 = Array.isArray(j2?.images) ? j2.images
                      : Array.isArray(j2?.output?.images) ? j2.output.images
                      : Array.isArray(j2?.data?.images) ? j2.data.images
                      : Array.isArray(j2?.result?.images) ? j2.result.images
                      : [];
          if (imgs2 && imgs2.length) {
            imagesArray = imgs2;
            text = j2?.text || j2?.output?.text || j2?.data?.text || j2?.result?.text || text || '';
            return true;
          }
        } catch (_) { /* ignore and retry */ }
      }
      return false;
    };
    while (Date.now() - started < timeoutMs) {
      const ok = await tryFetch();
      if (ok) break;
      if (opts.isCanceled?.()) throw new Error((navigator.language||'').toLowerCase().startsWith('ja') ? 'キャンセルしました' : 'Canceled');
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  for (const it of imagesArray) {
    const urlOrData = typeof it === 'string' ? it : (it?.url || it?.image || '');
    if (urlOrData) await appendImageFromUrlMaybeData(urlOrData, label, slotIndex, opts.onImage);
    const b64 = it?.b64_json || it?.data || '';
    if (b64 && typeof opts.onImage === 'function') opts.onImage('image/png', b64, label, slotIndex);
  }
  if (!imagesArray.length) {
    const hint = rid ? `request_id=${rid}` : 'no_request_id';
    throw new Error(`FALから画像が返りませんでした（${hint}）。サイズやエンドポイント、プロンプトを確認してください。`);
  }
  return { text: text || '' };
}
