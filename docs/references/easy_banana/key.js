const apiKeyGeminiInput = document.querySelector('#apiKeyGemini');
const apiKeyOpenRouterInput = document.querySelector('#apiKeyOpenRouter');
const apiKeyFalInput = document.querySelector('#apiKeyFal');
const apiKeyElevenLabsInput = document.querySelector('#apiKeyElevenLabs');
const useSessionEl = document.querySelector('#useSession');
const uiLangEl = document.querySelector('#uiLang');
const defaultModelEl = document.querySelector('#defaultModel');
const saveBtn = document.querySelector('#save');
const clearBtn = document.querySelector('#clear');
const saveTopBtn = document.querySelector('#saveTop');
const closeTopBtn = document.querySelector('#closeTop');
const closeBtn = document.querySelector('#close');
const statusEl = document.querySelector('#status');
const cpGrid = document.querySelector('#cpGrid');
const officialGrid = document.querySelector('#officialGrid');
const exportPromptsBtn = document.querySelector('#exportPrompts');
const importPromptsBtn = document.querySelector('#importPrompts');
const importPromptsFileInput = document.querySelector('#importPromptsFile');

const CP_COUNT = 30;
let cpRows = [];
let officialRows = [];
let officialTemplates = [];
const OFFICIAL_PROMPTS_KEY = 'officialPrompts';
let toastEl = null;
let toastTimer = null;

function showToast(text) {
  try {
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = text || 'Saved';
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.classList.add('hidden'), 2000);
  } catch {}
}

function setStatus(text, ok = true) {
  try {
    if (statusEl) {
      statusEl.textContent = text || '';
      statusEl.style.color = ok ? 'gray' : 'crimson';
    } else {
      // Fallback: use toast if status area is not present
      showToast(text || '');
    }
  } catch {}
}

function importConfirmMessage() {
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
  return isJa
    ? 'JSON をインポートすると、現在のカスタムプロンプトはすべて置き換えられます。よろしいですか？'
    : 'Importing JSON will replace all current custom prompts. Continue?';
}

function collectPromptsFromUI() {
  return cpRows.map(({ chk, title, body }) => ({
    enabled: !!chk.checked,
    title: (title.value || '').trim(),
    body: (body.value || '').trim()
  }));
}

function collectOfficialPromptsFromUI() {
  return officialRows.map(({ template, chk }) => ({
    id: template.id,
    title: template.title,
    body: template.body,
    enabled: !!chk.checked
  }));
}

function applyPromptsToUI(list) {
  cpRows.forEach((row, idx) => {
    const p = list[idx] || { enabled: false, title: '', body: '' };
    row.chk.checked = !!p.enabled;
    row.title.value = p.title || '';
    row.body.value = p.body || '';
  });
}

function promptsForExport() {
  const prompts = collectPromptsFromUI();
  const hasData = prompts.some((p) => p.enabled || p.title || p.body);
  return hasData ? prompts : [];
}

function downloadJSON(filename, jsonText) {
  try {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('downloadJSON failed', e);
    showToast('ダウンロードに失敗しました');
  }
}

function handleExportPrompts() {
  try {
    const payload = promptsForExport();
    if (!payload.length) {
      showToast('保存済みのプロンプトがありません');
      return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonText = JSON.stringify(payload, null, 2);
    downloadJSON(`easy_banana_prompts_${ts}.json`, jsonText);
    showToast('JSON を書き出しました');
  } catch (e) {
    console.error('handleExportPrompts failed', e);
    showToast('エクスポートに失敗しました');
  }
}

function normalizeImportedPrompts(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.prompts)) return raw.prompts;
  if (raw && Array.isArray(raw.customPrompts)) return raw.customPrompts;
  return null;
}

async function handleImportFileChange(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    if (event?.target) event.target.value = '';
    return;
  }
  try {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error('JSON の解析に失敗しました');
    }
    const list = normalizeImportedPrompts(data);
    if (!list) throw new Error('期待される配列形式ではありません');
    const sanitized = Array.from({ length: CP_COUNT }, (_, idx) => {
      const src = list[idx];
      if (!src || typeof src !== 'object') return { enabled: false, title: '', body: '' };
      return {
        enabled: !!src.enabled,
        title: typeof src.title === 'string' ? src.title.trim() : '',
        body: typeof src.body === 'string' ? src.body.trim() : ''
      };
    });
    applyPromptsToUI(sanitized);
    try { await chrome.storage.local.set({ customPrompts: sanitized }); } catch (storageErr) { console.error(storageErr); }
    showToast('JSON を読み込みました');
  } catch (e) {
    console.error('handleImportFileChange failed', e);
    showToast(e?.message || 'インポートに失敗しました');
  } finally {
    if (event?.target) event.target.value = '';
  }
}

async function loadKey() {
  try {
    // Read preference and keys (session or local)
    const pref = await new Promise((resolve) => {
      chrome.storage.local.get(['useSessionKey'], (v) => resolve(!!v?.useSessionKey));
    });
    useSessionEl.checked = pref;
    // Gemini
    let gKey = '';
    if (pref && chrome?.storage?.session) {
      gKey = await new Promise((resolve) => chrome.storage.session.get(['geminiApiKey'], (v) => resolve(v?.geminiApiKey || '')));
    }
    if (!gKey) {
      gKey = await new Promise((resolve) => chrome.storage.local.get(['geminiApiKey'], (v) => resolve(v?.geminiApiKey || '')));
    }
    if (apiKeyGeminiInput) apiKeyGeminiInput.value = gKey || '';
    // OpenRouter
    let oKey = '';
    if (pref && chrome?.storage?.session) {
      oKey = await new Promise((resolve) => chrome.storage.session.get(['openrouterApiKey'], (v) => resolve(v?.openrouterApiKey || '')));
    }
    if (!oKey) {
      oKey = await new Promise((resolve) => chrome.storage.local.get(['openrouterApiKey'], (v) => resolve(v?.openrouterApiKey || '')));
    }
    if (apiKeyOpenRouterInput) apiKeyOpenRouterInput.value = oKey || '';
    // FAL
    let fKey = '';
    if (pref && chrome?.storage?.session) {
      fKey = await new Promise((resolve) => chrome.storage.session.get(['falApiKey'], (v) => resolve(v?.falApiKey || '')));
    }
    if (!fKey) {
      fKey = await new Promise((resolve) => chrome.storage.local.get(['falApiKey'], (v) => resolve(v?.falApiKey || '')));
    }
    if (apiKeyFalInput) apiKeyFalInput.value = fKey || '';
    // ElevenLabs
    let eKey = '';
    if (pref && chrome?.storage?.session) {
      eKey = await new Promise((resolve) => chrome.storage.session.get(['elevenlabsApiKey'], (v) => resolve(v?.elevenlabsApiKey || '')));
    }
    if (!eKey) {
      eKey = await new Promise((resolve) => chrome.storage.local.get(['elevenlabsApiKey'], (v) => resolve(v?.elevenlabsApiKey || '')));
    }
    if (apiKeyElevenLabsInput) apiKeyElevenLabsInput.value = eKey || '';
    if (gKey || oKey || fKey || eKey) setStatus('保存済みのキーを読み込みました');

    // Load UI language
    try {
      const lang = await new Promise((resolve) => chrome.storage.local.get(['uiLang'], (v)=> resolve(v?.uiLang || 'auto')));
      if (uiLangEl) uiLangEl.value = lang;
    } catch {}

    // Populate Default Model selector
    try { await populateDefaultModelSelect(); } catch (e) { console.warn('populateDefaultModelSelect failed', e); }

    // Read custom prompts from local (always persisted in local)
    const storedPrompts = await new Promise((resolve) => {
      chrome.storage.local.get(['customPrompts'], (v) => resolve(Array.isArray(v?.customPrompts) ? v.customPrompts : []));
    });

    // Render custom prompt rows
    cpGrid.innerHTML = '';
    cpRows = [];
    const arr = Array.from({ length: CP_COUNT }, (_, i) => storedPrompts[i] || { title: '', body: '', enabled: false });
    arr.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'cp-item';
      const head = document.createElement('div');
      head.className = 'cp-head';

      const title = document.createElement('input');
      title.className = 'cp-title';
      title.placeholder = `カスタムプロンプト ${i + 1} のタイトル`;
      title.value = p.title || '';

      const chkWrap = document.createElement('label');
      chkWrap.className = 'cp-enabled';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!p.enabled;
      const chkTxt = document.createElement('span');
      chkTxt.textContent = '有効';
      chkWrap.appendChild(chk);
      chkWrap.appendChild(chkTxt);

      head.appendChild(title);
      head.appendChild(chkWrap);

      const body = document.createElement('textarea');
      body.className = 'cp-body';
      body.placeholder = `カスタムプロンプト ${i + 1} の本文`;
      body.value = p.body || '';

      item.appendChild(head);
      item.appendChild(body);
      cpGrid.appendChild(item);

      cpRows.push({ chk, title, body });
    });

    await loadOfficialTemplates();
  } catch (e) {
    console.error(e);
  }
}

async function saveKey() {
  try {
    const geminiKey = (apiKeyGeminiInput?.value || '').trim();
    const openrouterKey = (apiKeyOpenRouterInput?.value || '').trim();
    const falKey = (apiKeyFalInput?.value || '').trim();
    const elevenlabsKey = (apiKeyElevenLabsInput?.value || '').trim();
    const useSession = !!useSessionEl.checked;
    // Save preference
    await chrome.storage.local.set({ useSessionKey: useSession });
    // Build prompts array
    const prompts = collectPromptsFromUI();
    const officialSelection = collectOfficialPromptsFromUI();
    // Save API keys according to preference
    try {
      if (useSession && chrome?.storage?.session) {
        const s = {};
        s.geminiApiKey = geminiKey;
        s.openrouterApiKey = openrouterKey;
        s.falApiKey = falKey;
        s.elevenlabsApiKey = elevenlabsKey;
        await chrome.storage.session.set(s);
        await chrome.storage.local.remove(['geminiApiKey', 'openrouterApiKey', 'falApiKey', 'elevenlabsApiKey']);
      } else {
        const l = {};
        l.geminiApiKey = geminiKey;
        l.openrouterApiKey = openrouterKey;
        l.falApiKey = falKey;
        l.elevenlabsApiKey = elevenlabsKey;
        await chrome.storage.local.set(l);
        try { await chrome.storage?.session?.remove?.(['geminiApiKey', 'openrouterApiKey', 'falApiKey', 'elevenlabsApiKey']); } catch {}
      }
    } catch (e) {
      console.error(e);
    }
    await chrome.storage.local.set({ customPrompts: prompts, [OFFICIAL_PROMPTS_KEY]: officialSelection });
    // Save UI language
    try { await chrome.storage.local.set({ uiLang: uiLangEl?.value || 'auto' }); } catch {}
    // Save Default Model (used as initial model in Side Panel)
    try {
      const sel = (defaultModelEl?.value || '').trim();
      if (sel) await chrome.storage.local.set({ selectedModel: sel });
    } catch {}
    setStatus('設定を保存しました');
    showToast('設定を保存しました');
  } catch (e) {
    console.error(e);
    setStatus('保存に失敗しました', false);
  }
}

async function clearKey() {
  try {
    await chrome.storage.local.remove(['geminiApiKey','openrouterApiKey','falApiKey','elevenlabsApiKey']);
    try { await chrome.storage?.session?.remove?.(['geminiApiKey','openrouterApiKey','falApiKey','elevenlabsApiKey']); } catch {}
    if (apiKeyOpenRouterInput) apiKeyOpenRouterInput.value = '';
    if (apiKeyGeminiInput) apiKeyGeminiInput.value = '';
    if (apiKeyFalInput) apiKeyFalInput.value = '';
    if (apiKeyElevenLabsInput) apiKeyElevenLabsInput.value = '';
    setStatus('削除しました');
    try { await populateDefaultModelSelect(); } catch {}
  } catch (e) {
    console.error(e);
    setStatus('削除に失敗しました', false);
  }
}

saveBtn.addEventListener('click', saveKey);
saveTopBtn?.addEventListener('click', saveKey);
clearBtn.addEventListener('click', clearKey);
closeBtn.addEventListener('click', () => window.close());
closeTopBtn?.addEventListener('click', () => window.close());
exportPromptsBtn?.addEventListener('click', handleExportPrompts);
importPromptsBtn?.addEventListener('click', () => {
  if (!importPromptsFileInput) return;
  try {
    if (window.confirm(importConfirmMessage())) {
      importPromptsFileInput.click();
    } else {
      importPromptsFileInput.value = '';
    }
  } catch (e) {
    console.error('import confirm failed', e);
  }
});
importPromptsFileInput?.addEventListener('change', handleImportFileChange);

loadKey();

// Models list loading for Default Model selector
async function loadModelList() {
  try {
    const url = chrome.runtime.getURL('models.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('models not found');
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

async function populateDefaultModelSelect() {
  if (!defaultModelEl) return;
  const models = await loadModelList();
  defaultModelEl.innerHTML = '';
  let options = models;
  if (!options.length) {
    // Fallback entries if JSON missing
    options = [
      { label: 'Gemini/Gemini 2.5 Flash Image Preview', provider: 'gemini', model: 'gemini-2.5-flash-image-preview', timeoutSec: 60, default: true },
      { label: 'OpenRouter/gemini-2.5-flash-image-preview', provider: 'openrouter', model: 'google/gemini-2.5-flash-image-preview', timeoutSec: 60 }
    ];
  }
  // Filter by providers that currently have an API key entered (unsaved input counts)
  const hasGemini = !!(apiKeyGeminiInput?.value || '').trim();
  const hasOpenRouter = !!(apiKeyOpenRouterInput?.value || '').trim();
  const hasFal = !!(apiKeyFalInput?.value || '').trim();
  const hasElevenLabs = !!(apiKeyElevenLabsInput?.value || '').trim();
  const filtered = options.filter((m) => (m.provider === 'gemini' && hasGemini) || (m.provider === 'openrouter' && hasOpenRouter) || (m.provider === 'fal' && hasFal) || (m.provider === 'elevenlabs' && hasElevenLabs));

  for (const m of filtered) {
    const opt = document.createElement('option');
    opt.value = `${m.provider}:${m.model}`;
    opt.textContent = m.label || `${m.provider}:${m.model}`;
    defaultModelEl.appendChild(opt);
  }
  // No providers available -> disable the select
  if (!defaultModelEl.options.length) { defaultModelEl.disabled = true; return; }
  // Apply saved value or default from list
  try {
    const data = await new Promise((resolve) => chrome.storage.local.get(['selectedModel'], (v) => resolve(v || {})));
    const saved = data.selectedModel || '';
    const hasSaved = saved && Array.from(defaultModelEl.options).some((o) => o.value === saved);
    if (hasSaved) {
      defaultModelEl.value = saved;
    } else {
      // Prefer a default flag among filtered; otherwise pick first
      const def = filtered.find((m) => m.default) || filtered[0];
      if (def) defaultModelEl.value = `${def.provider}:${def.model}`;
    }
  } catch {}
  defaultModelEl.disabled = false;
}

// Re-filter models when API keys are edited in-place
apiKeyGeminiInput?.addEventListener('input', () => { try { populateDefaultModelSelect(); } catch {} });
apiKeyOpenRouterInput?.addEventListener('input', () => { try { populateDefaultModelSelect(); } catch {} });
apiKeyFalInput?.addEventListener('input', () => { try { populateDefaultModelSelect(); } catch {} });
apiKeyElevenLabsInput?.addEventListener('input', () => { try { populateDefaultModelSelect(); } catch {} });

async function loadOfficialTemplates() {
  if (!officialGrid) return;
  try {
    const url = chrome.runtime.getURL('prompt.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('prompt templates not found');
    const data = await res.json();
    const list = Array.isArray(data?.templates) ? data.templates : [];
    officialTemplates = list
      .map((tpl) => ({
        id: typeof tpl?.id === 'string' ? tpl.id : '',
        title: typeof tpl?.title === 'string' ? tpl.title : '',
        body: typeof tpl?.body === 'string' ? tpl.body : ''
      }))
      .filter((tpl) => tpl.id && tpl.title && tpl.body);
  } catch (e) {
    console.error('Failed to load prompt templates', e);
    officialTemplates = [];
  }

  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get([OFFICIAL_PROMPTS_KEY], (v) => {
        const raw = v?.[OFFICIAL_PROMPTS_KEY];
        resolve(Array.isArray(raw) ? raw : []);
      });
    });
    const enabledMap = new Map();
    stored.forEach((entry) => {
      if (entry && typeof entry.id === 'string') {
        enabledMap.set(entry.id, !!entry.enabled);
      }
    });

    officialGrid.innerHTML = '';
    officialRows = [];

    officialTemplates.forEach((template) => {
      const item = document.createElement('div');
      item.className = 'cp-item cp-item--official';

      const head = document.createElement('div');
      head.className = 'cp-head';

      const title = document.createElement('input');
      title.className = 'cp-title';
      title.value = template.title;
      title.readOnly = true;
      title.setAttribute('aria-label', `${template.title} title`);

      const chkWrap = document.createElement('label');
      chkWrap.className = 'cp-enabled';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = enabledMap.get(template.id) || false;
      chk.dataset.templateId = template.id;
      const chkTxt = document.createElement('span');
      chkTxt.textContent = '有効';
      chkWrap.appendChild(chk);
      chkWrap.appendChild(chkTxt);

      head.appendChild(title);
      head.appendChild(chkWrap);

      const body = document.createElement('textarea');
      body.className = 'cp-body';
      body.value = template.body;
      body.readOnly = true;
      body.spellcheck = false;
      body.rows = Math.min(12, Math.max(3, template.body.split('\n').length));
      body.setAttribute('aria-label', `${template.title} body`);

      item.appendChild(head);
      item.appendChild(body);
      officialGrid.appendChild(item);

      officialRows.push({ template, chk, body, title });
    });
  } catch (e) {
    console.error('Failed to render prompt templates', e);
  }
}
