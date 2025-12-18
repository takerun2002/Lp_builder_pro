const $ = (q) => document.querySelector(q);

const promptEl = $('#prompt');
const btn = $('#gen');
let defaultGenerateLabel = btn?.textContent || 'Generate';
const result = $('#result');
const images = $('#images');
const imagesLabel = $('#imagesLabel');
const copyResultBtn = document.querySelector('#copyResult');
const refDrop = document.querySelector('#refDrop');
const refFile = document.querySelector('#refFile');
const refList = document.querySelector('#refList');
const openLibraryBtn = document.querySelector('#openLibrary');
const openStoryboardBtn = document.querySelector('#openStoryboard');
const detachPanelBtn = document.querySelector('#detachPanel');
const addCanvasBtn = document.querySelector('#addCanvas');
// Canvas modal elements
const canvasModal = document.querySelector('#canvasModal');
const canvasPanel = document.querySelector('#canvasModal .panel');
const canvasWInput = document.querySelector('#canvasW');
const canvasHInput = document.querySelector('#canvasH');
const canvasCreateBtn = document.querySelector('#canvasCreate');
const canvasCancelBtn = document.querySelector('#canvasCancel');
const ratioRow = document.querySelector('#ratioRow');
let canvasPrevFocus = null;
const lightbox = document.querySelector('#lightbox');
const lightboxImg = document.querySelector('#lightboxImg');
const lightboxClose = document.querySelector('#lightboxClose');
const openKeyBtn = document.querySelector('#openKey');
const showEnvBtn = document.querySelector('#showEnv');
const ENABLE_ENV_DEBUG_BUTTON = false; // リリース時は false にする
const verEl = document.querySelector('#ver');
const imgCountEl = document.querySelector('#imgCount');
const modelSlotsEl = document.querySelector('#modelSlots');
const persistToggle = document.querySelector('#persist'); // No longer in HTML (persistence always enabled)
let selectedImgCount = 1;
const MAX_MODEL_SLOTS = 4;
let selectedModels = Array.from({ length: MAX_MODEL_SLOTS }, () => null);
let availableModels = [];
const modelDetails = Array.from({ length: MAX_MODEL_SLOTS }, () => emptyModelDetail());
const modelDetailOpen = Array.from({ length: MAX_MODEL_SLOTS }, () => false);
let isRenderingModelSlots = false;
let officialTemplatesCache = null;

function emptyModelDetail() {
  return {
    size: { width: '', height: '' },
    aspectRatio: ''
  };
}
const cpWrap = document.querySelector('#cpWrap');
const cpRow = document.querySelector('#cpRow');
const tabbar = document.querySelector('#tabbar');
const cancelBtn = document.querySelector('#cancelGen');
let defaultCancelLabel = cancelBtn?.textContent || 'Cancel';

// Provider defaults and endpoints
const PROVIDER_CONFIG = {
  gemini: {
    keyField: 'geminiApiKey'
  },
  openrouter: {
    keyField: 'openrouterApiKey'
  },
  fal: {
    keyField: 'falApiKey'
  }
};
const FALLBACK_MODELS = [
  {
    label: 'Gemini/Gemini 2.5 Flash Image Preview',
    provider: 'gemini',
    model: 'gemini-2.5-flash-image-preview',
    timeoutSec: 60,
    default: true,
    text_to_image: true,
    image_to_image: true
  },
  {
    label: 'OpenRouter/gemini-2.5-flash-image-preview',
    provider: 'openrouter',
    model: 'google/gemini-2.5-flash-image-preview',
    timeoutSec: 60,
    text_to_image: true,
    image_to_image: true
  }
];
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash-image-preview';
const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.5-flash-image-preview';
// Gemini HTTP endpoint (v1beta)
const GEMINI_GENERATE_ENDPOINT = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
// OpenRouter uses provider-qualified model slugs
const OPENROUTER_CHAT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// System prompt (reserved for future use, currently empty)
const SYSTEM_PROMPT = '';

// GENERATE_TIMEOUT_MS and fetchWithTimeout are defined in sidepanel.util.js

async function getSelectedModelAndTimeout(provider) {
  // Deprecated path (kept for backward calls). Resolve via new list schema.
  const any = await getSelectedModelAndTimeoutAny();
  return { model: any.model, timeoutMs: any.timeoutMs };
}

async function getSelectedModelAndTimeoutAny(slotIndex = 0) {
  const list = await loadModelList();
  const value = selectedModels[slotIndex] || '';
  let provider = 'gemini';
  let model = '';
  if (value && value.includes(':')) {
    const [p, ...rest] = value.split(':');
    provider = p;
    model = rest.join(':');
  }
  let entry = null;
  if (model) {
    entry = list.find((m) => m.provider === provider && m.model === model) || null;
  }
  if (!entry) {
    const fallback = (function() {
      const candidate = availableModels.find((m) => list.some((x) => x.provider === m.provider && x.model === m.model));
      if (candidate) return list.find((x) => x.provider === candidate.provider && x.model === candidate.model);
      return list.find((m) => m.default) || list[0] || null;
    })();
    if (fallback) {
      provider = fallback.provider;
      model = fallback.model;
      entry = fallback;
      selectedModels[slotIndex] = `${provider}:${model}`;
    }
  }
  const timeoutMs = Math.max(1, Number(entry?.timeoutSec || 60)) * 1000;
  const label = entry?.label || (provider && model ? `${provider}:${model}` : '') || '';
  return { provider, model, timeoutMs, entry, label };
}

function buildTimeoutMessage(ms) {
  const sec = Math.round((ms || GENERATE_TIMEOUT_MS) / 1000);
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
  return isJa ? `タイムアウトしました（${sec}秒）` : `Timed out (${sec}s)`;
}

async function collectEnvironmentInfo() {
  const lines = [];
  try { lines.push(`[timestamp] ${new Date().toISOString()}`); } catch {}
  try { lines.push(`location.href: ${location.href}`); } catch {}
  try { lines.push(`userAgent: ${navigator.userAgent}`); } catch { lines.push('userAgent: <error>'); }
  try {
    const uaData = navigator.userAgentData;
    if (uaData) {
      const brands = uaData.brands || [];
      lines.push(`uaData.platform: ${uaData.platform || ''}`);
      lines.push(`uaData.mobile: ${uaData.mobile}`);
      lines.push(`uaData.brands: ${brands.map((b) => `${b.brand}/${b.version}`).join(', ')}`);
    }
  } catch {}
  try {
    const platformInfo = await new Promise((resolve) => {
      if (!chrome?.runtime?.getPlatformInfo) { resolve(null); return; }
      chrome.runtime.getPlatformInfo(resolve);
    });
    if (platformInfo) lines.push(`platformInfo: ${JSON.stringify(platformInfo)}`);
  } catch {}
  try {
    const browserInfo = await new Promise((resolve) => {
      if (!chrome?.runtime?.getBrowserInfo) { resolve(null); return; }
      chrome.runtime.getBrowserInfo(resolve);
    });
    if (browserInfo) lines.push(`browserInfo: ${JSON.stringify(browserInfo)}`);
  } catch {}
  try {
    lines.push(`sidePanelAPI: ${typeof chrome?.sidePanel?.open === 'function'}`);
  } catch {}
  try {
    lines.push(`language: ${navigator.language}`);
  } catch {}
  return lines.join('\n');
}

// Reference images storage
const MAX_REF_IMAGES = 6;
let refImages = []; // { mimeType, base64, name, width, height }
// Track output images for de-duplication and counting
let seenOutImages = new Set();
const SESSION_KEY = 'panelState';
const PERSIST_PREF_KEY = 'persistPanel';
let persistEnabled = true; // Always enabled (session persistence)
let outImages = []; // Active tab output images (reference to tab state array)
let isRestoringState = false;
// Tabs (workspace) scaffolding — phase 1: internal schema + persistence only
const TABS_KEY = 'panelTabs';
const ACTIVE_TAB_KEY = 'panelActiveTab';
const MAX_TABS_DEFAULT = 5; // fixed for now (no add/remove)
let tabs = []; // [{ id, title, state }]
let activeTabId = null;

const runtimeTabData = new Map(); // tabId -> { seenKeys: Set<string>, jobs: Set<string> }
const jobStore = new Map(); // jobId -> job metadata
let jobSeq = 0;

function emptyTabState() {
  return {
    prompt: '',
    imgCount: 1,
    models: [],
    modelDetails: [],
    refImages: [],
    resultText: '',
    outputImages: [],
    imageSize: null
  };
}

function getTabEntry(tabId) {
  return tabs.find((t) => t.id === tabId) || null;
}

function getTabStateById(tabId) {
  const entry = getTabEntry(tabId);
  if (entry) return entry.state;
  const state = emptyTabState();
  const fallbackId = tabId || `t${tabs.length + 1}`;
  tabs.push({ id: fallbackId, title: fallbackId, state });
  ensureRuntimeData(fallbackId);
  return state;
}

function ensureRuntimeData(tabId) {
  if (!tabId) return { seenKeys: new Set(), jobs: new Set() };
  let data = runtimeTabData.get(tabId);
  if (!data) {
    data = { seenKeys: new Set(), jobs: new Set() };
    runtimeTabData.set(tabId, data);
  }
  return data;
}

function hydrateRuntimeFromState(tabId) {
  const state = getTabStateById(tabId);
  const runtime = ensureRuntimeData(tabId);
  runtime.seenKeys = new Set();
  const arr = Array.isArray(state.outputImages) ? state.outputImages : [];
  for (const o of arr) {
    runtime.seenKeys.add(buildOutputKey(o.mimeType, o.modelLabel, o.modelSlot, o.base64));
  }
}

function buildOutputKey(mimeType, modelLabel, modelSlot, base64) {
  return `${mimeType || ''};${modelLabel || ''};${modelSlot || ''};${base64?.slice(0, 64) || ''}:${base64?.length || 0}`;
}

function getTabTitle(tabId) {
  return getTabEntry(tabId)?.title || tabId || 'Tab';
}

function hasActiveJobs(tabId) {
  if (!tabId) return false;
  const runtime = ensureRuntimeData(tabId);
  return runtime.jobs?.size > 0;
}

function updateJobControls(tabId = activeTabId) {
  if (!btn) return;
  const runtime = ensureRuntimeData(tabId);
  const hasJobs = runtime.jobs?.size > 0;
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
  if (tabId === activeTabId) {
    btn.disabled = !!hasJobs;
    const baseLabel = btn.dataset.defaultLabel || defaultGenerateLabel;
    btn.textContent = hasJobs ? (isJa ? '生成中...' : 'Generating...') : baseLabel;
    if (cancelBtn) {
      if (hasJobs) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.disabled = false;
        const cancelBase = cancelBtn.dataset.defaultLabel || defaultCancelLabel;
        cancelBtn.textContent = isJa ? 'キャンセル' : cancelBase;
      } else {
        cancelBtn.classList.add('hidden');
        cancelBtn.disabled = false;
        const cancelBase = cancelBtn.dataset.defaultLabel || defaultCancelLabel;
        cancelBtn.textContent = isJa ? 'キャンセル' : cancelBase;
      }
    }
  }
}

function cleanupJob(jobId) {
  const job = jobStore.get(jobId);
  if (!job) return;
  const runtime = ensureRuntimeData(job.tabId);
  runtime.jobs.delete(jobId);
  jobStore.delete(jobId);
  renderTabs();
  if (job.tabId === activeTabId) updateJobControls(activeTabId);
}

function showJobToast(tabId, type, extraMessage = '') {
  const title = getTabTitle(tabId);
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
  let message = '';
  if (type === 'success') {
    message = isJa ? `${title} の画像生成が完了しました` : `Image generation finished in ${title}`;
  } else if (type === 'canceled') {
    message = isJa ? `${title} の画像生成をキャンセルしました` : `Canceled image generation in ${title}`;
  } else if (type === 'error') {
    message = isJa ? `${title} でエラーが発生しました` : `Image generation failed in ${title}`;
  }
  if (extraMessage) message += isJa ? `: ${extraMessage}` : `: ${extraMessage}`;
  if (message) showToast(message);
}

function cancelJobsForTab(tabId) {
  const runtime = ensureRuntimeData(tabId);
  if (!runtime.jobs?.size) return;
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
  for (const jobId of Array.from(runtime.jobs)) {
    const job = jobStore.get(jobId);
    if (!job) continue;
    job.isCanceled = true;
    if (tabId === activeTabId && cancelBtn) {
      cancelBtn.disabled = true;
      cancelBtn.textContent = isJa ? 'キャンセル中...' : 'Canceling...';
    }
    for (const ctrl of job.controllers || []) {
      try { ctrl.abort('user'); } catch {}
    }
    job.controllers = [];
  }
}

function captureDefaultLabels() {
  if (btn) {
    const label = (btn.textContent || '').trim();
    if (label) {
      defaultGenerateLabel = label;
      btn.dataset.defaultLabel = label;
    }
  }
  if (cancelBtn) {
    const label = (cancelBtn.textContent || '').trim();
    if (label) {
      defaultCancelLabel = label;
      cancelBtn.dataset.defaultLabel = label;
    }
  }
}

function snapshotCurrentStateFromUI() {
  try {
    // Build a lightweight snapshot from current UI/vars
    const count = Number(selectedImgCount || 1);
    const text = (result?.textContent || '').trim();
    return {
      prompt: String(promptEl?.value || ''),
      imgCount: Math.min(Math.max(count, 1), 4),
      models: selectedModels.slice(0, MAX_MODEL_SLOTS),
      modelDetails: modelDetails.map((detail) => ({
        size: {
          width: detail?.size?.width || '',
          height: detail?.size?.height || ''
        },
        aspectRatio: detail?.aspectRatio || ''
      })),
      refImages: (refImages || []).map(r => ({ mimeType: r.mimeType, base64: r.base64, name: r.name, width: r.width, height: r.height })),
      resultText: text,
      outputImages: (outImages || []).map(o => {
        const slotRaw = Number(o.modelSlot);
        const slot = Number.isFinite(slotRaw) && slotRaw > 0 ? slotRaw : null;
        return {
          mimeType: o.mimeType,
          base64: o.base64,
          modelLabel: o.modelLabel || '',
          modelSlot: slot
        };
      }),
      imageSize: null
    };
  } catch {
    return emptyTabState();
  }
}

function syncActiveTabStateFromUI() {
  if (!activeTabId) return;
  try {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const snap = snapshotCurrentStateFromUI();
    if (idx >= 0) tabs[idx].state = snap;
    hydrateRuntimeFromState(activeTabId);
  } catch (e) {
    console.error('syncActiveTabStateFromUI failed', e);
  }
}

function applyStateToUI(state) {
  // Minimal, safe application: prompt, imgCount, refs, result, outputs
  try { promptEl.value = state.prompt || ''; } catch {}
  try {
    const cnt = Number(state.imgCount || 1);
    if (imgCountEl) {
      imgCountEl.querySelectorAll('button.seg-btn').forEach((b) => b.classList.remove('active'));
      const btn = imgCountEl.querySelector(`button.seg-btn[data-v="${Math.min(Math.max(cnt,1),4)}"]`);
      if (btn) btn.classList.add('active');
    }
    selectedImgCount = Math.min(Math.max(cnt,1),4);
  } catch {}
  try {
    if (Array.isArray(state.models)) {
      selectedModels = Array.from({ length: MAX_MODEL_SLOTS }, (_, idx) => {
        const val = state.models[idx];
        return typeof val === 'string' && val ? val : selectedModels[idx] || null;
      });
    }
  } catch {}
  try {
   if (Array.isArray(state.modelDetails)) {
     state.modelDetails.forEach((detail, idx) => {
       const slot = modelDetails[idx] || (modelDetails[idx] = emptyModelDetail());
       if (detail?.size) {
         slot.size = {
           width: detail.size.width || '',
           height: detail.size.height || ''
         };
       }
       if (detail?.aspectRatio !== undefined) {
         slot.aspectRatio = detail.aspectRatio || '';
       }
     });
    }
  } catch {}
  try {
    // Rehydrate ref images
    refImages = Array.isArray(state.refImages) ? state.refImages.map((r) => ({ ...r })) : [];
    renderRefImages();
  } catch {}
  try {
    // Result
    if (!state.resultText) { result.textContent = '結果がここに表示されます。'; result.classList.add('empty'); }
    else { result.textContent = state.resultText; result.classList.remove('empty'); }
  } catch {}
  try {
    // Outputs
    const runtime = ensureRuntimeData(activeTabId);
    runtime.seenKeys = new Set();
    const arr = Array.isArray(state.outputImages) ? state.outputImages : [];
    outImages = arr;
    seenOutImages = runtime.seenKeys;
    images.innerHTML = '';
    if (arr.length) imagesLabel.classList.remove('hidden'); else imagesLabel.classList.add('hidden');
    for (const o of arr) {
      const mime = o.mimeType || 'image/png';
      const b64 = o.base64 || '';
      const slotRaw = Number(o.modelSlot);
      const slot = Number.isFinite(slotRaw) && slotRaw > 0 ? slotRaw : null;
      runtime.seenKeys.add(buildOutputKey(mime, o.modelLabel || '', slot, b64));
      renderImageCard(mime, b64, o.modelLabel || '', slot);
    }
    updateImagesCounter();
  } catch {}
  try { renderModelSlots(); } catch {}
  updateRefSectionVisibility().catch(() => {});
  updateSizeRowVisibility().catch(() => {});
  updateJobControls(activeTabId);
}

async function saveTabs() {
  try {
    const payload = { [TABS_KEY]: tabs, [ACTIVE_TAB_KEY]: activeTabId };
    await chrome?.storage?.local?.set?.(payload);
  } catch {}
}
// saveTabsDebounced moved to sidepanel.state.js

async function initTabsFromCurrentUIIfMissing() {
  try {
    const data = await new Promise((resolve) => {
      try { chrome.storage.local.get([TABS_KEY, ACTIVE_TAB_KEY], (v) => resolve(v || {})); }
      catch { resolve({}); }
    });
    const storedTabs = Array.isArray(data[TABS_KEY]) ? data[TABS_KEY] : [];
    if (storedTabs.length) {
      // Normalize to exactly 5 tabs
      tabs = storedTabs.slice(0, MAX_TABS_DEFAULT);
      for (let i = tabs.length; i < MAX_TABS_DEFAULT; i++) tabs.push({ id: `t${i+1}`, title: `Tab ${i+1}`, state: emptyTabState() });
      activeTabId = data[ACTIVE_TAB_KEY] && tabs.find(t=>t.id===data[ACTIVE_TAB_KEY]) ? data[ACTIVE_TAB_KEY] : tabs[0].id;
      for (const t of tabs) hydrateRuntimeFromState(t.id);
      saveTabsDebounced();
      return;
    }
    // No stored tabs: create 5 fixed tabs, Tab 1 from current UI snapshot
    const st = snapshotCurrentStateFromUI();
    tabs = [
      { id: 't1', title: 'Tab 1', state: st },
      { id: 't2', title: 'Tab 2', state: emptyTabState() },
      { id: 't3', title: 'Tab 3', state: emptyTabState() },
      { id: 't4', title: 'Tab 4', state: emptyTabState() },
      { id: 't5', title: 'Tab 5', state: emptyTabState() }
    ];
    activeTabId = 't1';
    for (const t of tabs) hydrateRuntimeFromState(t.id);
    saveTabsDebounced();
  } catch {}
}

function getActiveState() {
  const t = tabs.find((x) => x.id === activeTabId);
  return t ? t.state : emptyTabState();
}

function renderTabs() {
  if (!tabbar) return;
  tabbar.innerHTML = '';
  // segmented look
  tabbar.classList.add('segmented');
  for (const t of tabs.slice(0, MAX_TABS_DEFAULT)) {
    const btn = document.createElement('button');
    btn.className = 'tab' + (t.id === activeTabId ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', t.id === activeTabId ? 'true' : 'false');
    btn.dataset.id = t.id;
    btn.textContent = t.title || 'Tab';
    const runtime = ensureRuntimeData(t.id);
    const generating = runtime.jobs?.size > 0;
    if (generating) {
      btn.classList.add('generating');
      const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
      btn.title = isJa ? '生成中' : 'Generating';
    } else {
      btn.classList.remove('generating');
      btn.removeAttribute('title');
    }
    btn.addEventListener('click', () => setActiveTab(t.id));
    tabbar.appendChild(btn);
  }
}

function createTab() {
  // Disabled: fixed 5 tabs
  return;
}

function closeTab(id) {
  // Disabled: fixed tabs cannot be closed
  return;
}

function setActiveTab(id) {
  if (id === activeTabId) return;
  syncActiveTabStateFromUI();
  activeTabId = id;
  applyStateToUI(getActiveState());
  renderTabs();
  updateJobControls(activeTabId);
  saveTabsDebounced();
}
let toastEl = document.getElementById('toast');
let toastTimer = null;

function showToast(msg) {
  try {
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    const def = (navigator.language || '').toLowerCase().startsWith('ja') ? 'コピーしました' : 'Copied';
    let text = msg || (window.I18N?.t?.('common.copied', def) || def);
    // In case i18n isn't ready and returns the key, fall back to default
    if (text === 'common.copied') text = def;
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.add('hidden'); }, 2000);
  } catch {}
}

// Persist UI state within the same browser session so closing/opening the side panel keeps context.
// approximateBytesFromBase64 moved to sidepanel.util.js

async function savePanelState() {
  if (isRestoringState) return;
  try {
    const MAX_REF_BYTES = 8 * 1024 * 1024;
    const MAX_OUT_BYTES = 8 * 1024 * 1024;
    let usedRef = 0;
    const keptRefs = [];
    for (const r of refImages) {
      const add = approximateBytesFromBase64(r.base64);
      if (usedRef + add > MAX_REF_BYTES) break;
      keptRefs.push({ mimeType: r.mimeType, base64: r.base64, name: r.name, width: r.width, height: r.height });
      usedRef += add;
    }
    let usedOut = 0;
    const keptOut = [];
    for (const o of outImages) {
      const add = approximateBytesFromBase64(o.base64);
      if (usedOut + add > MAX_OUT_BYTES) break;
      const slot = Number.isFinite(o.modelSlot) ? o.modelSlot : (typeof o.modelSlot === 'number' ? o.modelSlot : null);
      keptOut.push({ mimeType: o.mimeType, base64: o.base64, modelLabel: o.modelLabel || '', modelSlot: slot });
      usedOut += add;
    }
    const state = {
      prompt: promptEl.value || '',
      imgCount: selectedImgCount || 1,
      refImages: keptRefs,
      resultText: result?.textContent || '',
      outputImages: keptOut,
      models: selectedModels.slice(0, MAX_MODEL_SLOTS),
      modelDetails: modelDetails.map((detail) => ({
        size: {
          width: detail?.size?.width || '',
          height: detail?.size?.height || ''
        },
        aspectRatio: detail?.aspectRatio || ''
      }))
    };
    if (persistEnabled) {
      await chrome?.storage?.session?.set?.({ [SESSION_KEY]: state });
    }
    // Also keep tab state in sync (phase 1 scaffolding) — always persist tabs
    try {
      if (!tabs || !tabs.length) {
        tabs = [{ id: 't1', title: 'Tab 1', state: snapshotCurrentStateFromUI() }];
        activeTabId = 't1';
      } else {
        const idx = tabs.findIndex(t => t.id === activeTabId);
        if (idx >= 0) tabs[idx].state = snapshotCurrentStateFromUI();
        else tabs[0].state = snapshotCurrentStateFromUI();
      }
      saveTabsDebounced();
    } catch {}
  } catch {}
}

async function restorePanelState() {
  if (!persistEnabled) return;
  try {
    const data = await new Promise((resolve) => {
      try { chrome.storage.session.get([SESSION_KEY], (v) => resolve(v?.[SESSION_KEY] || null)); }
      catch { resolve(null); }
    });
    if (!data) return;
    const targetTabId = activeTabId || 't1';
    if (!activeTabId) activeTabId = targetTabId;
    const state = getTabStateById(targetTabId);
    state.prompt = typeof data.prompt === 'string' ? data.prompt : '';
    state.imgCount = Math.min(Math.max(Number(data.imgCount || 1), 1), 4);
    state.models = Array.isArray(data.models)
      ? Array.from({ length: MAX_MODEL_SLOTS }, (_, idx) => {
          const val = data.models[idx];
          return typeof val === 'string' && val ? val : null;
        })
      : [];
    state.modelDetails = Array.isArray(data.modelDetails)
      ? data.modelDetails.map((detail) => ({
          size: {
            width: detail?.size?.width || '',
            height: detail?.size?.height || ''
          },
          aspectRatio: detail?.aspectRatio || ''
        }))
      : [];
    state.refImages = Array.isArray(data.refImages) ? data.refImages.slice(0, MAX_REF_IMAGES) : [];
    state.resultText = typeof data.resultText === 'string' ? data.resultText : '';
    state.outputImages = Array.isArray(data.outputImages) ? data.outputImages.slice(0) : [];

    hydrateRuntimeFromState(targetTabId);
    isRestoringState = true;
    try {
      applyStateToUI(state);
    } finally {
      isRestoringState = false;
    }
    saveTabsDebounced();
  } catch {}
}

// debounce and savePanelStateDebounced moved to sidepanel.state.js

// Persistence is now always enabled (no user toggle needed)
// async function loadPersistPref() - removed
// async function setPersistPref() - removed

// Simple debounce utility and debounced savers
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const saveTabsDebounced = debounce(saveTabs, 300);
const savePanelStateDebounced = debounce(savePanelState, 300);

function updateImagesCounter() {
  const count = images.querySelectorAll('img').length;
  imagesLabel.textContent = count > 0 ? `生成された画像（${count}枚・クリックで拡大）` : '生成された画像（クリックで拡大）';
}

// renderRefImages moved to sidepanel.refs.js

// readFileAsDataURL moved to sidepanel.util.js

// MAX_IMAGE_BYTES constant is defined in sidepanel.refs.js

// downscaleImageFromBlob moved to sidepanel.refs.js

/* moved to sidepanel.refs.js
async function addRefFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    if (refImages.length >= MAX_REF_IMAGES) break;
    // Optional size cap ~8MB
    if (file.size > MAX_IMAGE_BYTES) {
      // Try to downscale instead of skipping
      const downsized = await downscaleImageFromBlob(file);
      if (downsized) {
        refImages.push({ mimeType: downsized.mimeType, base64: downsized.base64, name: file.name, width: downsized.width, height: downsized.height });
        showToast((navigator.language||'').toLowerCase().startsWith('ja') ? '大きい画像を縮小して読み込みました' : 'Loaded by downscaling large image');
        continue;
      } else {
        console.warn('Skip large image > 8MB:', file.name);
        continue;
      }
    }
    try {
      const url = await readFileAsDataURL(file);
      const comma = url.indexOf(',');
      const meta = url.substring(0, comma); // data:image/png;base64
      const base64 = url.substring(comma + 1);
      const mimeMatch = /data:(.*?);base64/.exec(meta);
      const mimeType = mimeMatch ? mimeMatch[1] : file.type || 'image/png';

      // Try to probe intrinsic size (async image load)
      const dim = await new Promise((res) => {
        const im = new Image();
        im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
        im.onerror = () => res({ w: 0, h: 0 });
        im.src = url;
      });

      // Heuristic: invalid or tiny placeholder
      if (dim.w === 0 || dim.h === 0 || dim.w < 64 || dim.h < 64 || file.size < 2048) {
        console.debug('Skip tiny/placeholder image from drop:', file.name, dim, file.size);
        continue;
      }

      // Deduplicate by content (base64)
      if (refImages.some((r) => r.base64 === base64)) {
        console.log('Skip duplicate image (same content)');
        continue;
      }

      refImages.push({ mimeType, base64, name: file.name, width: dim.w, height: dim.h });
    } catch (e) {
      console.error('Failed to read file', file.name, e);
    }
  }
  renderRefImages();
  savePanelStateDebounced();
}
*/

/* moved to sidepanel.refs.js
function setupRefDropzone() {
  if (!refDrop) return;
  ['dragenter', 'dragover'].forEach((t) => refDrop.addEventListener(t, (e) => {
    e.preventDefault();
    e.stopPropagation();
    refDrop.classList.add('drag');
  }));
  ;['dragleave', 'dragend', 'drop'].forEach((t) => refDrop.addEventListener(t, (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (t !== 'drop') refDrop.classList.remove('drag');
  }));
  refDrop.addEventListener('drop', (e) => {
    refDrop.classList.remove('drag');
    const dt = e.dataTransfer;
    const files = dt?.files;
    // Prefer file payloads; many sites provide both a File and a URL -> avoid duplicates
    const imgFiles = files ? Array.from(files).filter((f) => (f.type || '').startsWith('image/')) : [];
    if (imgFiles.length) {
      addRefFiles(imgFiles);
    } else {
      // Only if no image files, try URL-based import
      extractUrlsFromDataTransfer(dt).then((urls) => {
        if (urls.length) addRefUrls(urls);
      });
    }
  });
  refDrop.addEventListener('click', () => refFile?.click());
  refFile?.addEventListener('change', (e) => addRefFiles(e.target.files));

  // Paste image from clipboard anywhere on the page
  document.addEventListener('paste', (e) => {
    const dt = e.clipboardData;
    if (!dt || !dt.items) return;
    const files = [];
    for (const item of dt.items) {
      if (item.kind === 'file' && item.type?.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) {
          // Some pasted files have empty name; provide a default
          const name = f.name && f.name.trim() ? f.name : 'pasted-image.png';
          const typed = new File([f], name, { type: f.type || 'image/png' });
          files.push(typed);
        }
      }
    }
    if (files.length) {
      addRefFiles(files);
      // Do not preventDefault to allow text paste into textarea simultaneously
    }
    // If no file images, try URL from text/uri-list or plain text
    if (!files.length) {
      extractUrlsFromDataTransfer(dt).then((urls) => {
        if (urls.length) addRefUrls(urls);
      });
    }
  });
}
*/

// extractUrlsFromDataTransfer moved to sidepanel.refs.js

/* moved to sidepanel.refs.js
async function addRefUrls(urls) {
  for (const url of urls) {
    if (refImages.length >= MAX_REF_IMAGES) break;
    try {
      const item = await fetchImageAsRef(url);
      if (item) { refImages.push(item); }
    } catch (e) {
      console.warn('Failed to fetch dropped URL', url, e);
    }
  }
  renderRefImages();
  savePanelStateDebounced();
}
*/

/* moved to sidepanel.refs.js
async function fetchImageAsRef(url, depth = 0) {
  // Skip unsupported schemes
  if (!/^https?:/i.test(url) && !/^data:/i.test(url)) return null;
  if (depth > 2) return null; // avoid loops
  try {
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',');
      const meta = url.substring(0, comma);
      const base64 = url.substring(comma + 1);
      const mimeMatch = /data:(.*?);base64/.exec(meta);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      return { mimeType, base64, name: 'dropped-data-url' };
    }

    // Try HEAD for size guard
    const head = await fetch(url, { method: 'HEAD', referrerPolicy: 'no-referrer', credentials: 'omit' }).catch(() => null);
    const len = head ? Number(head.headers.get('content-length') || '0') : 0;
    const headType = head ? (head.headers.get('content-type') || '') : '';
    // If HEAD suggests very large (e.g., > 24MB), skip before fetching to avoid memory pressure
    if (len && len > 24 * 1024 * 1024) {
      console.info('Skip very large remote image > 24MB', url);
      return null;
    }

    const res = await fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();

    // If this is an HTML page (e.g., x.com/status/.../photo/1), try to extract an image URL
    if (!ct.startsWith('image/')) {
      if (ct.includes('text/html')) {
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // 1) common meta/link
        let pick =
          doc.querySelector('meta[property="og:image"][content]')?.getAttribute('content') ||
          doc.querySelector('meta[name="twitter:image"][content]')?.getAttribute('content') ||
          doc.querySelector('link[rel="image_src"][href]')?.getAttribute('href');
        // 2) <img srcset> (pick the last/most dense candidate)
        if (!pick) {
          const imgSet = doc.querySelector('img[srcset]')?.getAttribute('srcset');
          if (imgSet) {
            const last = imgSet.split(',').map(s => s.trim().split(' ')[0]).filter(Boolean).pop();
            if (last) pick = last;
          }
        }
        // 3) first <img src>
        if (!pick) pick = doc.querySelector('img[src]')?.getAttribute('src') || '';
        // 4) heuristic: look for well-known image CDNs in raw HTML (e.g., pbs.twimg.com)
        if (!pick) {
          const mCdn = html.match(/https:\/\/pbs\.twimg\.com\/[A-Za-z0-9_\-./%?=&]+/);
          if (mCdn) pick = mCdn[0];
        }
        // 5) generic image URL regex fallback
        if (!pick) {
          const mImg = html.match(/https:\/\/[A-Za-z0-9_.\-/%?=&]+\.(?:png|jpe?g|gif|webp)(?:[?#][^"'<>\s]*)?/i);
          if (mImg) pick = mImg[0];
        }
        if (pick) {
          const resolved = new URL(pick, res.url).toString();
          return await fetchImageAsRef(resolved, depth + 1);
        }
      }
      console.info(`Dropped URL is not an image and no image could be extracted: ${String(url)} ${ct || headType}`);
      return null;
    }

    // Image body
    const blob = await res.blob();
    if (blob.size > MAX_IMAGE_BYTES) {
      // Try to downscale remote image
      const downsized = await downscaleImageFromBlob(blob);
      if (downsized) {
        const name = (() => { try { return new URL(url).pathname.split('/').pop() || 'remote-image'; } catch { return 'remote-image'; } })();
        return { mimeType: downsized.mimeType, base64: downsized.base64, name, width: downsized.width, height: downsized.height };
      }
      return null; // give up if cannot downscale
    }
    const mimeType = ct || 'image/png';
    const base64 = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const s = String(fr.result || '');
        const comma = s.indexOf(',');
        resolve(s.substring(comma + 1));
      };
      fr.readAsDataURL(blob);
    });

    // Probe dimensions and drop very small placeholders often produced by some sites
    const dim = await new Promise((res2) => {
      const im = new Image();
      im.onload = () => res2({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res2({ w: 0, h: 0 });
      im.src = `data:${mimeType};base64,${base64}`;
    });
    if (dim.w === 0 || dim.h === 0 || dim.w < 64 || dim.h < 64 || blob.size < 2048) {
      console.info(`Skip tiny/placeholder image from URL: ${String(url)} {w:${dim.w},h:${dim.h}} ${blob.size}`);
      return null;
    }
    const name = (() => {
      try { return new URL(url).pathname.split('/').pop() || 'remote-image'; } catch { return 'remote-image'; }
    })();
    return { mimeType, base64, name, width: dim.w, height: dim.h };
  } catch (e) {
    console.error('fetchImageAsRef failed', e);
    return null;
  }
}
*/

function setResultForTab(tabId, text) {
  if (!tabId) return;
  const state = getTabStateById(tabId);
  state.resultText = text || '';
  if (tabId === activeTabId) {
    if (!text) {
      result.textContent = '結果がここに表示されます。';
      result.classList.add('empty');
    } else {
      result.textContent = text;
      result.classList.remove('empty');
    }
    savePanelStateDebounced();
  } else {
    saveTabsDebounced();
  }
}

function setResult(text) {
  if (!activeTabId) return;
  setResultForTab(activeTabId, text);
}

function clearImagesForTab(tabId) {
  if (!tabId) return;
  const state = getTabStateById(tabId);
  state.outputImages = [];
  const runtime = ensureRuntimeData(tabId);
  runtime.seenKeys.clear();
  if (tabId === activeTabId) {
    images.innerHTML = '';
    imagesLabel?.classList.add('hidden');
    outImages = state.outputImages;
    seenOutImages = runtime.seenKeys;
    updateImagesCounter();
    savePanelStateDebounced();
  } else {
    saveTabsDebounced();
  }
}

function clearImages() {
  if (!activeTabId) return;
  clearImagesForTab(activeTabId);
}

// base64ToBlob moved to sidepanel.util.js

// downloadBlob moved to sidepanel.util.js

// copyImageFromElement moved to sidepanel.util.js

function renderImageCard(mimeType, base64, modelLabel, modelSlotIndex) {
  if (imagesLabel) imagesLabel.classList.remove('hidden');
  const card = document.createElement('div');
  card.className = 'img-card';

  const img = document.createElement('img');
  img.alt = '生成画像';
  img.src = `data:${mimeType};base64,${base64}`;
  img.setAttribute('draggable', 'true');
  img.addEventListener('dragstart', (e) => {
    try {
      const dt = e.dataTransfer;
      if (!dt) return;
      dt.setData('text/uri-list', img.src);
      dt.setData('text/plain', img.src);
      dt.setData('text/html', `<img src="${img.src}">`);
      dt.effectAllowed = 'copy';
    } catch {}
  });
  img.addEventListener('click', () => { openImagePopup(img.src); });

  let metaEl = null;
  if (modelLabel) {
    metaEl = document.createElement('span');
    metaEl.className = 'img-meta';
    const slotPrefix = window.I18N?.t?.('panel.modelSlotPrefix', 'Model') || 'Model';
    const baseLabel = window.I18N?.t?.('panel.model', 'Model') || 'Model';
    const slotText = (modelSlotIndex && modelSlotIndex > 0) ? `${slotPrefix}${modelSlotIndex}` : baseLabel;
    metaEl.textContent = `${slotText}: ${modelLabel}`;
  }

  const actions = document.createElement('div');
  actions.className = 'img-actions';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'ダウンロード';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'クリップボードにコピー';
  const toRefBtn = document.createElement('button');
  toRefBtn.textContent = '参照画像に追加';

  actions.appendChild(toRefBtn);
  actions.appendChild(saveBtn);
  actions.appendChild(copyBtn);
  card.appendChild(img);
  if (metaEl) card.appendChild(metaEl);
  card.appendChild(actions);
  images.appendChild(card);

  saveBtn.addEventListener('click', () => {
    try {
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : (mimeType.includes('png') ? 'png' : 'img');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `easy-banana-${ts}.${ext}`;
      const blob = base64ToBlob(mimeType, base64);
      downloadBlob(filename, blob);
    } catch (e) {
      console.error(e);
      alert('ダウンロードに失敗しました');
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await copyImageFromElement(img);
      copyBtn.textContent = 'コピーしました';
      setTimeout(() => (copyBtn.textContent = 'クリップボードにコピー'), 1200);
    } catch (e) {
      console.error(e);
      alert('クリップボードへのコピーに失敗しました');
    }
  });

  toRefBtn.addEventListener('click', async () => {
    try {
      await addGeneratedToRefs(mimeType, base64);
      toRefBtn.textContent = '追加しました';
      setTimeout(() => (toRefBtn.textContent = '参照画像に追加'), 1200);
    } catch (e) {
      console.error(e);
      alert('参照画像への追加に失敗しました');
    }
  });
}

function appendImageForTab(tabId, mimeType, base64, modelLabel, modelSlotIndex) {
  if (!tabId) return;
  const state = getTabStateById(tabId);
  if (!Array.isArray(state.outputImages)) state.outputImages = [];
  const runtime = ensureRuntimeData(tabId);
  const key = buildOutputKey(mimeType, modelLabel, modelSlotIndex, base64);
  if (runtime.seenKeys.has(key)) return;
  runtime.seenKeys.add(key);
  state.outputImages.push({ mimeType, base64, modelLabel: modelLabel || '', modelSlot: modelSlotIndex || null });
  if (tabId === activeTabId) {
    outImages = state.outputImages;
    seenOutImages = runtime.seenKeys;
    renderImageCard(mimeType, base64, modelLabel, modelSlotIndex);
    updateImagesCounter();
    savePanelStateDebounced();
  } else {
    saveTabsDebounced();
  }
}

function appendImage(mimeType, base64, modelLabel, modelSlotIndex) {
  appendImageForTab(activeTabId, mimeType, base64, modelLabel, modelSlotIndex);
}

function appendUniqueImageForTab(tabId, mimeType, base64, modelLabel, modelSlotIndex) {
  appendImageForTab(tabId, mimeType, base64, modelLabel, modelSlotIndex);
}

function appendUniqueImage(mimeType, base64, modelLabel, modelSlotIndex) {
  appendUniqueImageForTab(activeTabId, mimeType, base64, modelLabel, modelSlotIndex);
}

function makeBlankCanvasDataUrl(width, height, fill = '#ffffff') {
  const w = Math.max(1, Math.floor(Number(width) || 0));
  const h = Math.max(1, Math.floor(Number(height) || 0));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  return canvas.toDataURL('image/png');
}

const CANVAS_MIN = 64;
const CANVAS_MAX = 4096;
const clamp = (v) => Math.min(Math.max(Math.floor(Number(v) || 0), CANVAS_MIN), CANVAS_MAX);

function openCanvasModal() {
  if (!canvasModal) return;
  try { canvasPrevFocus = document.activeElement; } catch { canvasPrevFocus = null; }
  canvasModal.classList.remove('hidden');
  canvasModal.setAttribute('aria-hidden', 'false');
  // Initialize with square 1024 if empty
  if (canvasWInput && !canvasWInput.value) canvasWInput.value = '1024';
  if (canvasHInput && !canvasHInput.value) canvasHInput.value = canvasWInput.value;
  try { (canvasPanel || canvasWInput)?.focus?.(); canvasWInput?.select?.(); } catch {}
}

function closeCanvasModal() {
  if (!canvasModal) return;
  // Move focus out before hiding to avoid aria-hidden focus warning
  try {
    if (canvasModal.contains(document.activeElement)) {
      if (addCanvasBtn && typeof addCanvasBtn.focus === 'function') addCanvasBtn.focus();
      else if (canvasPrevFocus && typeof canvasPrevFocus.focus === 'function') canvasPrevFocus.focus();
      else document.body?.focus?.();
    }
  } catch {}
  canvasModal.classList.add('hidden');
  canvasModal.setAttribute('aria-hidden', 'true');
}

function applyRatioToInputs(numer, denom) {
  const w = clamp(canvasWInput?.value || 0);
  const h = clamp(canvasHInput?.value || 0);
  if (w) {
    const hh = clamp(Math.round(w * denom / numer));
    if (canvasHInput) canvasHInput.value = String(hh);
    return;
  }
  if (h) {
    const ww = clamp(Math.round(h * numer / denom));
    if (canvasWInput) canvasWInput.value = String(ww);
    return;
  }
  // Default to 1024 on the long edge
  const ww = 1024;
  const hh = clamp(Math.round(ww * denom / numer));
  if (canvasWInput) canvasWInput.value = String(ww);
  if (canvasHInput) canvasHInput.value = String(hh);
}

async function onAddCanvas() { openCanvasModal(); }

async function appendImageFromUrlMaybeData(url, modelLabel, modelSlotIndex, onImage) {
  try {
    if (url.startsWith('data:')) {
      const comma = url.indexOf(',');
      const meta = url.substring(0, comma);
      const base64 = url.substring(comma + 1);
      const m = /data:(.*?);base64/i.exec(meta);
      const mime = m ? m[1] : 'image/png';
      if (typeof onImage === 'function') onImage(mime, base64, modelLabel, modelSlotIndex);
      return;
    }
    const res = await fetch(url, { referrerPolicy: 'no-referrer', credentials: 'omit' });
    if (!res.ok) return;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const blob = await res.blob();
    const base64 = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => {
        const s = String(fr.result || '');
        resolve(s.substring(s.indexOf(',') + 1));
      };
      fr.readAsDataURL(blob);
    });
    if (typeof onImage === 'function') onImage(ct || 'image/png', base64, modelLabel, modelSlotIndex);
  } catch {}
}

function buildOpenRouterUserContent(prompt, refs = refImages) {
  const blocks = [];
  // Reference images first
  for (const r of refs || []) {
    try {
      blocks.push({ type: 'image_url', image_url: { url: `data:${r.mimeType};base64,${r.base64}` } });
    } catch {}
  }
  // User prompt
  blocks.push({ type: 'text', text: prompt });
  return blocks;
}



async function addGeneratedToRefs(mimeType, base64) {
  try {
    if (refImages.length >= MAX_REF_IMAGES) { alert('参考画像の上限に達しています'); return; }
    if (refImages.some((r) => r.base64 === base64)) { return; }
    // Probe dimensions from data URL
    const dim = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => res({ w: 0, h: 0 });
      im.src = `data:${mimeType};base64,${base64}`;
    });
    refImages.push({ mimeType, base64, name: 'output-image', width: dim.w, height: dim.h });
    renderRefImages();
    savePanelStateDebounced();
    // Optionally scroll to the ref list to show the addition
    try { document.getElementById('refList')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
  } catch (e) { throw e; }
}

function openLightbox(src) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.add('hidden');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.src = '';
}

// openImagePopup moved to sidepanel.util.js

async function getUseSessionPref() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) { resolve(false); return; }
    chrome.storage.local.get(['useSessionKey'], (v) => resolve(!!v?.useSessionKey));
  });
}

async function getApiProvider() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) { resolve('gemini'); return; }
    chrome.storage.local.get(['apiProvider'], (v) => resolve(v?.apiProvider || 'gemini'));
  });
}

async function getProviderModel(provider) {
  const defaults = { gemini: GEMINI_DEFAULT_MODEL, openrouter: OPENROUTER_DEFAULT_MODEL };
  try {
    const data = await new Promise((resolve) => {
      chrome.storage?.local?.get?.(['providerModels'], (v) => resolve(v || {}));
    });
    const model = data?.providerModels?.[provider];
    if (typeof model === 'string' && model.trim()) return model.trim();
  } catch {}
  // Fallback to models.json default when not set in storage
  try {
    const list = await loadModelList();
    const item = list.find((m) => m?.default && m?.codes?.[provider]);
    if (item) return item.codes[provider];
    const first = list.find((m) => m?.codes?.[provider]);
    if (first) return first.codes[provider];
  } catch {}
  return defaults[provider] || GEMINI_DEFAULT_MODEL;
}

async function loadModelList() {
  try {
    const url = chrome.runtime.getURL('models.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('models not found');
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}

async function getSelectedModelEntry(slotIndex = 0) {
  const models = await loadModelList();
  try {
    const v = (selectedModels[slotIndex] || '').trim();
    if (!v) return null;
    const [provider, ...rest] = v.split(':');
    const model = rest.join(':');
    return models.find((m) => m.provider === provider && m.model === model) || null;
  } catch { return null; }
}

async function updateRefSectionVisibility() {
  try {
    const count = Math.min(Math.max(Number(selectedImgCount || 1), 1), MAX_MODEL_SLOTS);
    const list = await Promise.all(selectedModels.slice(0, count).map((_, idx) => getSelectedModelEntry(idx)));
    const canI2I = list.some((entry) => entry && entry.image_to_image);
    const sec = refDrop?.closest?.('section');
    if (sec) {
      if (canI2I) sec.classList.remove('hidden');
      else sec.classList.add('hidden');
    }
  } catch {}
}

async function updateSizeRowVisibility() {
  try {
    const count = Math.min(Math.max(Number(selectedImgCount || 1), 1), MAX_MODEL_SLOTS);
    const entries = await Promise.all(selectedModels.slice(0, count).map((_, idx) => getSelectedModelEntry(idx)));
    let needsRender = false;
    entries.forEach((entry, idx) => {
      const hasSize = !!entry && entry.size !== false;
      if (!hasSize) {
        if (modelDetailOpen[idx]) { modelDetailOpen[idx] = false; needsRender = true; }
        modelDetails[idx].size = { width: '', height: '' };
        return;
      }
      if (!modelDetailOpen[idx]) { modelDetailOpen[idx] = true; needsRender = true; }
      applySizeDefaultsForEntry(entry, modelDetails[idx]);
    });
    if (needsRender) {
      renderModelSlots();
      savePanelStateDebounced();
    }
  } catch {}
}

async function getKeyPresence() {
  try {
    const useSession = await getUseSessionPref();
    let g = '';
    let o = '';
    let f = '';
    if (useSession && chrome?.storage?.session) {
      const sess = await new Promise((resolve) => chrome.storage.session.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      g = sess.geminiApiKey || '';
      o = sess.openrouterApiKey || '';
      f = sess.falApiKey || '';
    }
    if (!g || !o || !f) {
      const loc = await new Promise((resolve) => chrome.storage.local.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      g = g || loc.geminiApiKey || '';
      o = o || loc.openrouterApiKey || '';
      f = f || loc.falApiKey || '';
    }
    return { gemini: !!g, openrouter: !!o, fal: !!f };
  } catch {
    return { gemini: false, openrouter: false, fal: false };
  }
}

async function getDefaultModelFromSettings() {
  try {
    const data = await new Promise((resolve) => chrome.storage.local.get(['selectedModel'], (v) => resolve(v || {})));
    const val = (data.selectedModel || '').trim();
    return val;
  } catch { return ''; }
}

async function getSessionModelState() {
  try {
    const data = await new Promise((resolve) => chrome.storage?.session?.get?.(['lastSelectedModel','modelInitDone'], (v)=> resolve(v||{})));
    return { last: (data.lastSelectedModel || '').trim(), init: !!data.modelInitDone };
  } catch { return { last: '', init: false }; }
}

async function setSessionModelState(partial) {
  try {
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(partial, 'last')) payload.lastSelectedModel = partial.last;
    if (Object.prototype.hasOwnProperty.call(partial, 'init')) payload.modelInitDone = !!partial.init;
    await chrome.storage?.session?.set?.(payload);
  } catch {}
}

function modelValueFromEntry(entry) {
  return entry ? `${entry.provider}:${entry.model}` : '';
}

function applySizeDefaultsForEntry(entry, detail) {
  if (!detail.size) detail.size = { width: '', height: '' };
  if (!entry || entry.size === false) {
    detail.size = { width: '', height: '' };
    return;
  }
  const defaults = entry.image_size || entry.default_size || null;
  const dw = entry.default_width || defaults?.width || defaults?.w || '';
  const dh = entry.default_height || defaults?.height || defaults?.h || '';
  if (!detail.size.width && dw) detail.size.width = String(dw);
  if (!detail.size.height && dh) detail.size.height = String(dh);
}

function normalizeSelectedModels(count) {
  if (!Array.isArray(selectedModels) || selectedModels.length !== MAX_MODEL_SLOTS) {
    selectedModels = Array.from({ length: MAX_MODEL_SLOTS }, () => null);
  }
  if (!Array.isArray(modelDetails) || modelDetails.length !== MAX_MODEL_SLOTS) {
    modelDetails.length = MAX_MODEL_SLOTS;
    for (let i = 0; i < MAX_MODEL_SLOTS; i++) {
      if (!modelDetails[i]) modelDetails[i] = emptyModelDetail();
    }
  }
  if (!Array.isArray(modelDetailOpen) || modelDetailOpen.length !== MAX_MODEL_SLOTS) {
    modelDetailOpen.length = MAX_MODEL_SLOTS;
    for (let i = 0; i < MAX_MODEL_SLOTS; i++) {
      if (typeof modelDetailOpen[i] !== 'boolean') modelDetailOpen[i] = false;
    }
  }
  if (!availableModels.length) {
    selectedModels = Array.from({ length: MAX_MODEL_SLOTS }, () => null);
    return;
  }
  const fallback = modelValueFromEntry(availableModels[0]);
  if (!selectedModels[0] || !availableModels.some((m) => modelValueFromEntry(m) === selectedModels[0])) {
    selectedModels[0] = fallback;
  }
  const target = Math.min(Math.max(count, 1), MAX_MODEL_SLOTS);
  for (let i = 1; i < target; i++) {
    const val = selectedModels[i];
    if (!val || !availableModels.some((m) => modelValueFromEntry(m) === val)) {
      selectedModels[i] = selectedModels[0] || fallback;
    }
  }
  for (let i = target; i < MAX_MODEL_SLOTS; i++) {
    modelDetailOpen[i] = false;
  }
}

function renderModelSlots() {
  if (!modelSlotsEl || isRenderingModelSlots) return;
  isRenderingModelSlots = true;
  const count = Math.min(Math.max(Number(selectedImgCount || 1), 1), MAX_MODEL_SLOTS);
  normalizeSelectedModels(count);
  modelSlotsEl.innerHTML = '';
  if (!availableModels.length) {
    const msg = document.createElement('div');
    msg.className = 'model-slot-empty';
    msg.setAttribute('data-i18n', 'panel.model.none');
    msg.textContent = '利用可能なモデルがありません。APIキーを設定してください。';
    modelSlotsEl.appendChild(msg);
    try { window.I18N?.initAndApply?.(modelSlotsEl); } catch {}
    isRenderingModelSlots = false;
    return;
  }

  for (let i = 0; i < count; i++) {
    let entry = availableModels.find((m) => modelValueFromEntry(m) === selectedModels[i]);
    const detail = modelDetails[i] || (modelDetails[i] = emptyModelDetail());
    const row = document.createElement('div');
    row.className = 'model-slot-row';

    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = '<span data-i18n="panel.model">Model</span> <span class="slot-index"></span>';
    const idxSpan = label.querySelector('.slot-index');
    if (idxSpan) idxSpan.textContent = ` ${i + 1}`;
    row.appendChild(label);

    const select = document.createElement('select');
    select.dataset.slotIndex = String(i);
    for (const m of availableModels) {
      const opt = document.createElement('option');
      opt.value = modelValueFromEntry(m);
      opt.textContent = m.label || `${m.provider}:${m.model}`;
      select.appendChild(opt);
    }
    const chosen = selectedModels[i];
    if (chosen && Array.from(select.options).some((opt) => opt.value === chosen)) {
      select.value = chosen;
    } else {
      select.value = modelValueFromEntry(availableModels[0]);
      selectedModels[i] = select.value;
    }
    entry = availableModels.find((m) => modelValueFromEntry(m) === select.value) || entry;

    select.addEventListener('change', async () => {
      const val = (select.value || '').trim();
      selectedModels[i] = val || null;
      modelDetails[i] = emptyModelDetail();
      modelDetailOpen[i] = false;
      if (i === 0 && val) {
        await setSessionModelState({ init: true, last: val });
      }
      renderModelSlots();
      savePanelStateDebounced();
      try {
        await updateRefSectionVisibility();
        await updateSizeRowVisibility();
      } catch {}
    });
    row.appendChild(select);

    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'model-more-btn';
    const moreLabel = window.I18N?.t?.('panel.model.more', 'Details') || 'Details';
    moreBtn.textContent = moreLabel;
    const canConfigure = !!entry && (entry.size !== false || (entry.aspectRatios && Array.isArray(entry.aspectRatios)));
    if (!canConfigure) {
      moreBtn.disabled = true;
      moreBtn.classList.add('disabled');
      modelDetailOpen[i] = false;
    }
    row.appendChild(moreBtn);
    modelSlotsEl.appendChild(row);

    const details = document.createElement('div');
    details.className = 'model-slot-details';
    if (!modelDetailOpen[i] || !canConfigure) details.classList.add('hidden');

    if (canConfigure) {
      // Size inputs
      if (entry.size !== false) {
        applySizeDefaultsForEntry(entry, detail);
        const sizeWrap = document.createElement('div');
        sizeWrap.className = 'model-size-inline';

        const widthLabel = window.I18N?.t?.('panel.size.width', 'Width (px)') || 'Width (px)';
        const heightLabel = window.I18N?.t?.('panel.size.height', 'Height (px)') || 'Height (px)';

        const widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.min = String(entry?.min_width || 64);
        widthInput.max = String(entry?.max_width || 4096);
        widthInput.value = detail.size.width || '';
        widthInput.placeholder = entry?.default_width ? String(entry.default_width) : '1024';
        widthInput.addEventListener('input', () => {
          detail.size.width = widthInput.value.trim();
          savePanelStateDebounced();
        });

        const heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.min = String(entry?.min_height || 64);
        heightInput.max = String(entry?.max_height || 4096);
        heightInput.value = detail.size.height || '';
        heightInput.placeholder = entry?.default_height ? String(entry.default_height) : '1024';
        heightInput.addEventListener('input', () => {
          detail.size.height = heightInput.value.trim();
          savePanelStateDebounced();
        });

        sizeWrap.appendChild(document.createTextNode(`${widthLabel}: `));
        sizeWrap.appendChild(widthInput);
        sizeWrap.appendChild(document.createTextNode(`  ${heightLabel}: `));
        sizeWrap.appendChild(heightInput);
        details.appendChild(sizeWrap);
      }

      // Aspect ratio selector
      if (entry.aspectRatios && Array.isArray(entry.aspectRatios) && entry.aspectRatios.length > 0) {
        const aspectWrap = document.createElement('div');
        aspectWrap.className = 'model-aspect-inline';
        aspectWrap.style.marginTop = entry.size !== false ? '8px' : '0';

        const aspectLabel = document.createElement('label');
        aspectLabel.textContent = 'Aspect Ratio: ';
        aspectWrap.appendChild(aspectLabel);

        const aspectSelect = document.createElement('select');
        for (const ratio of entry.aspectRatios) {
          const opt = document.createElement('option');
          opt.value = ratio;
          opt.textContent = ratio;
          aspectSelect.appendChild(opt);
        }
        const defaultAspect = entry.defaultAspectRatio || entry.aspectRatios[0];
        aspectSelect.value = detail.aspectRatio || defaultAspect;
        if (!detail.aspectRatio) {
          detail.aspectRatio = defaultAspect;
        }
        aspectSelect.addEventListener('change', () => {
          detail.aspectRatio = aspectSelect.value;
          savePanelStateDebounced();
        });
        aspectWrap.appendChild(aspectSelect);
        details.appendChild(aspectWrap);
      }

      if (!entry.size && !entry.aspectRatios) {
        const none = document.createElement('div');
        none.className = 'model-slot-empty';
        none.setAttribute('data-i18n', 'panel.model.options.none');
        none.textContent = window.I18N?.t?.('panel.model.options.none', 'No additional options.') || 'No additional options.';
        details.appendChild(none);
      }
    } else {
      const none = document.createElement('div');
      none.className = 'model-slot-empty';
      none.setAttribute('data-i18n', 'panel.model.options.none');
      none.textContent = window.I18N?.t?.('panel.model.options.none', 'No additional options.') || 'No additional options.';
      details.appendChild(none);
    }

    moreBtn.addEventListener('click', () => {
      if (!canConfigure) return;
      modelDetailOpen[i] = !modelDetailOpen[i];
      details.classList.toggle('hidden', !modelDetailOpen[i]);
    });

    modelSlotsEl.appendChild(details);
  }

  try { window.I18N?.initAndApply?.(modelSlotsEl); } catch {}
  isRenderingModelSlots = false;
}

async function refreshModelOptions() {
  let models = await loadModelList();
  if (!Array.isArray(models) || !models.length) models = FALLBACK_MODELS.slice();
  const pres = await getKeyPresence();
  const filtered = models.filter((m) =>
    (m.provider === 'gemini' && pres.gemini) ||
    (m.provider === 'openrouter' && pres.openrouter) ||
    (m.provider === 'fal' && pres.fal)
  );
  availableModels = filtered;
  if (!availableModels.length) {
    selectedModels = Array.from({ length: MAX_MODEL_SLOTS }, () => null);
    renderModelSlots();
    try { await updateRefSectionVisibility(); } catch {}
    try { await updateSizeRowVisibility(); } catch {}
    return;
  }
  const sess = await getSessionModelState();
  const defFromSettings = await getDefaultModelFromSettings();
  const hasLast = sess.last && availableModels.some((m) => modelValueFromEntry(m) === sess.last);
  const hasSetting = defFromSettings && availableModels.some((m) => modelValueFromEntry(m) === defFromSettings);
  if (!sess.init) {
    let pick = hasSetting ? defFromSettings : modelValueFromEntry(availableModels.find((m) => m.default) || availableModels[0]);
    selectedModels[0] = pick;
    await setSessionModelState({ init: true, last: pick });
  } else {
    let pick = hasLast ? sess.last : (hasSetting ? defFromSettings : modelValueFromEntry(availableModels.find((m) => m.default) || availableModels[0]));
    selectedModels[0] = pick;
    await setSessionModelState({ last: pick });
  }
  // Normalize remaining slots against new availability
  normalizeSelectedModels(MAX_MODEL_SLOTS);
  renderModelSlots();
  try { await updateRefSectionVisibility(); } catch {}
  try { await updateSizeRowVisibility(); } catch {}
}

// Removed legacy getApiKey(); use getProviderApiKey(provider)

async function getProviderApiKey(provider) {
  const useSession = await getUseSessionPref();
  const keyField = PROVIDER_CONFIG[provider]?.keyField || 'geminiApiKey';
  if (useSession && chrome?.storage?.session) {
    const key = await new Promise((resolve) => chrome.storage.session.get([keyField], (v) => resolve(v?.[keyField] || '')));
    if (key) return key;
  }
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) { resolve(''); return; }
    chrome.storage.local.get([keyField], (v) => resolve(v?.[keyField] || ''));
  });
}

// Check if either Gemini or OpenRouter key exists (for UI warnings)
async function hasAnyApiKey() {
  try {
    const useSession = await getUseSessionPref();
    let g = '';
    let o = '';
    let f = '';
    if (useSession && chrome?.storage?.session) {
      const sess = await new Promise((resolve) => chrome.storage.session.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      g = sess.geminiApiKey || '';
      o = sess.openrouterApiKey || '';
      f = sess.falApiKey || '';
    }
    if (!g || !o || !f) {
      const loc = await new Promise((resolve) => chrome.storage.local.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      g = g || loc.geminiApiKey || '';
      o = o || loc.openrouterApiKey || '';
      f = f || loc.falApiKey || '';
    }
    return !!(g || o || f);
  } catch {
    return false;
  }
}

async function getCustomPrompts() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) { resolve([]); return; }
    chrome.storage.local.get(['customPrompts'], (v) => {
      const arr = Array.isArray(v?.customPrompts) ? v.customPrompts.slice(0, 30) : [];
      resolve(arr);
    });
  });
}

async function getOfficialPromptPrefs() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) { resolve([]); return; }
    chrome.storage.local.get(['officialPrompts'], (v) => {
      const arr = Array.isArray(v?.officialPrompts) ? v.officialPrompts : [];
      resolve(arr);
    });
  });
}

async function getOfficialPromptTemplates() {
  if (Array.isArray(officialTemplatesCache)) return officialTemplatesCache;
  try {
    const url = chrome.runtime.getURL('prompt.json');
    const res = await fetch(url);
    if (!res.ok) throw new Error('templates not found');
    const data = await res.json();
    const list = Array.isArray(data?.templates) ? data.templates : [];
    officialTemplatesCache = list
      .map((tpl) => ({
        id: typeof tpl?.id === 'string' ? tpl.id : '',
        title: typeof tpl?.title === 'string' ? tpl.title : '',
        body: typeof tpl?.body === 'string' ? tpl.body : ''
      }))
      .filter((tpl) => tpl.id && tpl.title && tpl.body);
  } catch (e) {
    console.error('Failed to load official prompt templates', e);
    officialTemplatesCache = [];
  }
  return officialTemplatesCache;
}

function renderCustomPromptButtons(prompts) {
  if (!cpRow) return;
  cpRow.dataset.custom = JSON.stringify((prompts || []).filter((p) => p?.enabled && p?.title && p?.body));
  refreshPromptButtons();
}

async function refreshOfficialPromptButtons() {
  if (!cpRow) return;
  try {
    const [templates, prefs] = await Promise.all([
      getOfficialPromptTemplates(),
      getOfficialPromptPrefs()
    ]);
    const enabledIds = new Set();
    (prefs || []).forEach((entry) => {
      if (entry && typeof entry.id === 'string' && entry.enabled) enabledIds.add(entry.id);
    });
    const enabledTemplates = templates.filter((tpl) => enabledIds.has(tpl.id));
    cpRow.dataset.official = JSON.stringify(enabledTemplates);
    refreshPromptButtons();
  } catch (e) {
    console.error('Failed to render official prompt buttons', e);
    cpRow.dataset.official = JSON.stringify([]);
    refreshPromptButtons();
  }
}

function refreshPromptButtons() {
  if (!cpRow || !cpWrap) return;
  cpRow.innerHTML = '';
  let custom = [];
  let official = [];
  try { custom = JSON.parse(cpRow.dataset.custom || '[]') || []; } catch {}
  try { official = JSON.parse(cpRow.dataset.official || '[]') || []; } catch {}
  const combined = [...official, ...custom].filter((p) => p?.title && p?.body);
  if (!combined.length) {
    cpWrap.classList.add('hidden');
    return;
  }
  combined.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'cp-btn';
    if (p.id && official.some((tpl) => tpl.id === p.id)) btn.classList.add('cp-btn--official');
    const label = p.title || p.id;
    btn.textContent = label;
    btn.title = label;
    btn.addEventListener('click', () => {
      promptEl.value = p.body || '';
      promptEl.focus();
      promptEl.setSelectionRange(promptEl.value.length, promptEl.value.length);
    });
    cpRow.appendChild(btn);
  });
  cpWrap.classList.remove('hidden');
}

async function openKeyWindow() {
  const url = chrome.runtime.getURL('key.html');
  try {
    const width = Math.min(Math.floor(screen.availWidth * 0.85), 1100);
    const height = Math.min(Math.floor(screen.availHeight * 0.85), 900);
    await chrome.windows.create({ url, type: 'popup', width, height, left: Math.max(0, Math.floor((screen.availWidth - width) / 2)), top: Math.max(0, Math.floor((screen.availHeight - height) / 2)) });
  } catch (e) {
    console.error('Failed to open key window', e);
    // Fallback: open in a tab
    window.open(url, '_blank');
  }
}

async function detachPanel() {
  const NARROW_WIDTH = 600;

  try {
    // Get current tab (side panel tab)
    const currentTab = await chrome.tabs.getCurrent();
    if (!currentTab || currentTab.id === undefined) {
      return;
    }

    // Get current window information
    const currentWindow = await chrome.windows.getCurrent();
    if (!currentWindow || currentWindow.id === undefined) {
      return;
    }

    const baseLeft = currentWindow.left ?? 0;
    const baseTop = currentWindow.top ?? 0;
    const baseWidth = currentWindow.width ?? 1200;
    const height = currentWindow.height ?? 800;

    // If the original window only has this tab, create a new tab to keep it alive
    const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
    if (tabs.length === 1) {
      await chrome.tabs.create({
        windowId: currentWindow.id,
        url: 'chrome://newtab/'
      });
    }

    // Get screen information to check if window is at right edge
    const screens = await chrome.system.display.getInfo();
    let screenWidth = 1920; // Default fallback
    if (screens && screens.length > 0) {
      // Find the screen containing the current window
      const primaryScreen = screens.find(s => s.isPrimary) || screens[0];
      screenWidth = primaryScreen.bounds.width;
    }

    // Calculate new window position
    // If window is near the right edge of screen, align new window to right edge
    const windowRightEdge = baseLeft + baseWidth;
    const isNearRightEdge = windowRightEdge > screenWidth - 100; // Within 100px of right edge

    let newLeft;
    if (isNearRightEdge) {
      // Align to right edge of screen
      newLeft = screenWidth - NARROW_WIDTH;
    } else {
      // Position to the right of current window
      newLeft = baseLeft + baseWidth;
    }

    // Move tab to a new window
    await chrome.windows.create({
      tabId: currentTab.id,
      left: newLeft,
      top: baseTop,
      width: NARROW_WIDTH,
      height,
      focused: true,
      type: 'normal'
    });
  } catch (e) {
    // Silently handle error - try alternative approach without logging
    try {
      const currentTab = await chrome.tabs.getCurrent();
      if (currentTab && currentTab.id !== undefined) {
        const currentWindow = await chrome.windows.getCurrent();
        const tabs = await chrome.tabs.query({ windowId: currentWindow.id });

        // Ensure original window has at least one tab
        if (tabs.length === 1) {
          await chrome.tabs.create({
            windowId: currentWindow.id,
            url: 'chrome://newtab/'
          });
        }

        const height = currentWindow?.height ?? 800;

        // Try without specifying left position - let Chrome decide
        await chrome.windows.create({
          tabId: currentTab.id,
          width: NARROW_WIDTH,
          height,
          focused: true,
          type: 'normal'
        });
      }
    } catch (retryError) {
      // Silent failure
    }
  }
}

async function onGenerate() {
  const tabId = activeTabId || (tabs[0]?.id) || 't1';
  const prompt = promptEl.value.trim();
  if (!prompt) { setResultForTab(tabId, '（プロンプトが空です）'); return; }
  const isJa = (navigator.language || '').toLowerCase().startsWith('ja');

  if (!availableModels.length) {
    try { await refreshModelOptions(); } catch {}
  }

  const total = Math.min(Math.max(Number(selectedImgCount || 1), 1), MAX_MODEL_SLOTS);
  const selections = [];
  for (let i = 0; i < total; i++) {
    const info = await getSelectedModelAndTimeoutAny(i);
    selections.push({ ...info, slotIndex: i + 1 });
  }
  if (!selections.length || selections.some((sel) => !sel?.provider || !sel?.model)) {
    const msg = isJa ? '利用可能なモデルがありません。APIキーを設定してください。' : 'No models available. Please add an API key.';
    setResultForTab(tabId, msg);
    return;
  }

  const currentRefs = Array.isArray(refImages) ? refImages.slice(0, MAX_REF_IMAGES) : [];
  const needsRefs = selections.some((sel) => sel?.entry && sel.entry.image_to_image && !sel.entry.text_to_image);
  if (needsRefs && currentRefs.length === 0) {
    const msg = isJa ? 'このモデルは参照画像が必須です。参照画像を追加してください。' : 'This model requires reference images. Please add at least one reference image.';
    setResultForTab(tabId, msg);
    try { showToast(isJa ? '参照画像を追加してください' : 'Add a reference image'); } catch {}
    return;
  }

  const providerKeys = new Map();
  for (const sel of selections) {
    if (!providerKeys.has(sel.provider)) {
      const key = await getProviderApiKey(sel.provider);
      if (!key) {
        const label = sel.entry?.label || sel.label || sel.provider;
        const msg = isJa ? `${label} のAPIキーを設定してください。設定ウィンドウを開きます。` : `API key missing for ${label}. Opening settings.`;
        setResultForTab(tabId, msg);
        openKeyWindow();
        return;
      }
      providerKeys.set(sel.provider, key);
    }
  }

  syncActiveTabStateFromUI();

  const state = getTabStateById(tabId);
  const refsSnapshot = Array.isArray(state.refImages) ? state.refImages.map((r) => ({ ...r })) : [];
  const modelDetailsSnapshot = Array.isArray(state.modelDetails)
    ? state.modelDetails.map((detail) => ({
        size: {
          width: detail?.size?.width || '',
          height: detail?.size?.height || ''
        },
        aspectRatio: detail?.aspectRatio || ''
      }))
    : [];

  const runtime = ensureRuntimeData(tabId);
  const jobId = `job_${++jobSeq}`;
  const job = {
    id: jobId,
    tabId,
    controllers: [],
    selections,
    total,
    completed: 0,
    textResults: new Array(total).fill(''),
    errorMessages: new Array(total).fill(''),
    isCanceled: false
  };
  jobStore.set(jobId, job);
  runtime.jobs.add(jobId);

  clearImagesForTab(tabId);
  const initialMsg = isJa ? `生成中... (0/${total})` : `Generating... (0/${total})`;
  setResultForTab(tabId, initialMsg);
  renderTabs();
  updateJobControls(activeTabId);

  const resolveSizeFor = (sel, slotIndex) => {
    try {
      const entry = sel?.entry || null;
      const detail = modelDetailsSnapshot[slotIndex - 1] || emptyModelDetail();
      const width = Number(detail?.size?.width || 0);
      const height = Number(detail?.size?.height || 0);
      if (width && height) {
        const minW = entry?.min_width || 1;
        const maxW = entry?.max_width || 4096;
        const minH = entry?.min_height || 1;
        const maxH = entry?.max_height || 4096;
        return {
          width: Math.max(minW, Math.min(maxW, Math.floor(width))),
          height: Math.max(minH, Math.min(maxH, Math.floor(height)))
        };
      }
      if (entry && entry.size === false) return null;
      const sz = entry?.image_size || entry?.default_size || null;
      const dw = entry?.default_width || sz?.width || sz?.w || null;
      const dh = entry?.default_height || sz?.height || sz?.h || null;
      if (dw && dh) {
        return { width: Number(dw), height: Number(dh) };
      }
    } catch {}
    return null;
  };

  const handleImage = (mimeType, base64, modelLabel, modelSlotIndex) => {
    appendImageForTab(tabId, mimeType, base64, modelLabel, modelSlotIndex);
  };

  try {
    const tasks = selections.map((sel, index) => {
      const controller = new AbortController();
      job.controllers.push(controller);
      const size = resolveSizeFor(sel, sel.slotIndex);
      const detail = modelDetailsSnapshot[sel.slotIndex - 1] || emptyModelDetail();
      const aspectRatio = detail.aspectRatio || '';
      return (async () => {
        try {
          const key = providerKeys.get(sel.provider) || '';
          const endpoint = sel.entry?.endpoint;
          const opts = {
            model: sel.model,
            timeoutMs: sel.timeoutMs,
            endpoint,
            numImages: 1,
            size,
            aspectRatio,
            controller,
            modelLabel: sel.label,
            modelSlotIndex: sel.slotIndex,
            refImages: refsSnapshot,
            onImage: handleImage,
            isCanceled: () => job.isCanceled
          };
          let out;
          if (sel.provider === 'openrouter') {
            out = await generateViaOpenRouter(key, prompt, opts);
          } else if (sel.provider === 'fal') {
            out = await generateViaFal(key, prompt, opts);
          } else {
            out = await generateViaGemini(key, prompt, opts);
          }
          if (out?.text) job.textResults[index] = out.text;
        } catch (err) {
          job.errorMessages[index] = err?.message || String(err);
        } finally {
          job.controllers = job.controllers.filter((ctrl) => ctrl !== controller);
          job.completed += 1;
          if (!job.isCanceled) {
            const msg = isJa ? `生成中... (${job.completed}/${total})` : `Generating... (${job.completed}/${total})`;
            setResultForTab(tabId, msg);
          }
        }
      })();
    });

    await Promise.allSettled(tasks);
  } catch (e) {
    console.error(e);
    job.errorMessages[0] = e?.message || String(e);
  }

  cleanupJob(jobId);

  const finalText = job.textResults.filter(Boolean).join('\n\n');
  const firstError = job.errorMessages.find((msg) => msg);

  if (job.isCanceled) {
    setResultForTab(tabId, isJa ? 'キャンセルしました' : 'Canceled');
    showJobToast(tabId, 'canceled');
  } else if (firstError && !finalText) {
    const errMsg = isJa ? `エラー: ${firstError}` : `Error: ${firstError}`;
    setResultForTab(tabId, errMsg);
    showJobToast(tabId, 'error', firstError);
  } else if (finalText) {
    setResultForTab(tabId, finalText);
    showJobToast(tabId, 'success');
  } else {
    setResultForTab(tabId, '');
    showJobToast(tabId, 'success');
  }

  updateJobControls(activeTabId);
}

btn.addEventListener('click', onGenerate);
promptEl.addEventListener('keydown', (e) => {
  // Use modifier detection directly to avoid deprecated navigator.platform
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    onGenerate();
  }
});
// Save prompt as user types
promptEl?.addEventListener('input', savePanelStateDebounced);

openKeyBtn?.addEventListener('click', openKeyWindow);
openLibraryBtn?.addEventListener('click', openLibraryWindow);
openStoryboardBtn?.addEventListener('click', openStoryboardTab);
detachPanelBtn?.addEventListener('click', detachPanel);
addCanvasBtn?.addEventListener('click', onAddCanvas);
copyResultBtn?.addEventListener('click', async () => {
  try {
    const text = (result?.textContent || '').trim();
    await navigator.clipboard.writeText(text);
    const def = (navigator.language || '').toLowerCase().startsWith('ja') ? '文章をコピーしました。' : 'Text copied';
    showToast(window.I18N?.t?.('common.copiedText', def) || def);
  } catch (e) { console.error(e); }
});
cancelBtn?.addEventListener('click', () => {
  if (!activeTabId) return;
  cancelJobsForTab(activeTabId);
});
// Track current model selection for this browser session (do not overwrite default from settings)
canvasCancelBtn?.addEventListener('click', (e) => { e?.preventDefault?.(); closeCanvasModal(); });
canvasCreateBtn?.addEventListener('click', (e) => {
  e?.preventDefault?.();
  try {
    if (refImages.length >= MAX_REF_IMAGES) { alert('参考画像の上限に達しています'); return; }
    const w = clamp(canvasWInput?.value || 0);
    const h = clamp(canvasHInput?.value || 0);
    if (!w || !h) { alert('幅と高さを入力してください'); return; }
    const dataUrl = makeBlankCanvasDataUrl(w, h, '#ffffff');
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.substring(0, comma);
    const base64 = dataUrl.substring(comma + 1);
    const mimeMatch = /data:(.*?);base64/i.exec(meta);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    refImages.push({ mimeType, base64, name: `canvas-${w}x${h}.png`, width: w, height: h });
    renderRefImages();
    savePanelStateDebounced();
    closeCanvasModal();
  } catch (err) {
    console.error(err);
    alert('キャンバスの追加に失敗しました');
  }
});
ratioRow?.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button.seg-btn');
  if (!btn) return;
  const r = String(btn.dataset.ratio || '').trim();
  const m = r.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return;
  const numer = parseFloat(m[1]);
  const denom = parseFloat(m[2]);
  if (!numer || !denom) return;
  applyRatioToInputs(numer, denom);
});

if (showEnvBtn) {
  const defaultEnvLabel = (showEnvBtn.textContent || '').trim() || 'Env';
  if (ENABLE_ENV_DEBUG_BUTTON) {
    showEnvBtn.classList.remove('hidden');
    showEnvBtn.addEventListener('click', async () => {
      const isJa = (navigator.language || '').toLowerCase().startsWith('ja');
      try {
        showEnvBtn.disabled = true;
        showEnvBtn.textContent = isJa ? '取得中...' : 'Collecting...';
        const info = await collectEnvironmentInfo();
        let copied = false;
        try {
          await navigator.clipboard.writeText(info);
          copied = true;
          showToast(isJa ? '環境情報をコピーしました' : 'Copied environment info');
        } catch {}
        const header = copied
          ? (isJa ? 'クリップボードにコピーしました。\n\n' : 'Copied to clipboard.\n\n')
          : (isJa ? 'コピーに失敗しました。以下を手動でコピーしてください。\n\n' : 'Copy failed. Please copy manually.\n\n');
        alert(header + info);
      } catch (err) {
        alert((err?.message || String(err || 'error')));
      } finally {
        showEnvBtn.disabled = false;
        showEnvBtn.textContent = defaultEnvLabel;
      }
    });
  } else {
    showEnvBtn.classList.add('hidden');
  }
}

// Init
try { window.I18N?.initAndApply?.(document); } catch {}
captureDefaultLabels();
// setupRefDropzone is initialized in sidepanel.refs.js after it loads
getCustomPrompts().then(renderCustomPromptButtons);
refreshOfficialPromptButtons();
// Show version next to title
try {
  const mf = chrome?.runtime?.getManifest?.();
  const v = mf?.version;
  if (verEl && v) verEl.textContent = `v${v}`;
} catch {}
// Detect full mode (?full=1) and toggle layout
let isFullMode = false;
try {
  const usp = new URLSearchParams(location.search);
  isFullMode = usp.get('full') === '1';
  if (isFullMode) document.body.classList.add('full');
} catch {}

// Detect narrow window (detached panel) and remove max-width constraint
try {
  if (window.innerWidth <= 400) {
    document.body.classList.add('narrow');
  }
} catch {}
// Persistence is always enabled - restore last session state
restorePanelState().then(initTabsFromCurrentUIIfMissing).then(() => {
  try { renderTabs(); } catch {}
  updateJobControls(activeTabId);
});
// Initialize model select from stored provider model (Gemini only for now)
try { refreshModelOptions(); } catch {}
// Show API key warnings
async function refreshKeyWarnings() {
  try {
    const needKeyEl = document.getElementById('needKeyWarn');
    const needFalKeyEl = document.getElementById('needFalKeyWarn');

    // Get API keys from storage (same logic as hasAnyApiKey)
    const useSession = await getUseSessionPref();
    let geminiKey = '';
    let openrouterKey = '';
    let falKey = '';

    if (useSession && chrome?.storage?.session) {
      const sess = await new Promise((resolve) => chrome.storage.session.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      geminiKey = sess.geminiApiKey || '';
      openrouterKey = sess.openrouterApiKey || '';
      falKey = sess.falApiKey || '';
    }

    if (!geminiKey || !openrouterKey || !falKey) {
      const loc = await new Promise((resolve) => chrome.storage.local.get(['geminiApiKey', 'openrouterApiKey', 'falApiKey'], (v) => resolve(v || {})));
      geminiKey = geminiKey || loc.geminiApiKey || '';
      openrouterKey = openrouterKey || loc.openrouterApiKey || '';
      falKey = falKey || loc.falApiKey || '';
    }

    console.log('[refreshKeyWarnings]', { geminiKey, openrouterKey, falKey });

    // Show "any key missing" warning only if ALL keys are missing
    if (needKeyEl) {
      if (!geminiKey && !openrouterKey && !falKey) {
        console.log('[refreshKeyWarnings] Showing needKeyWarn');
        needKeyEl.classList.remove('hidden');
      } else {
        console.log('[refreshKeyWarnings] Hiding needKeyWarn');
        needKeyEl.classList.add('hidden');
      }
    }

    // Show FAL-specific warning if FAL key is missing
    if (needFalKeyEl) {
      if (!falKey) {
        console.log('[refreshKeyWarnings] Showing needFalKeyWarn');
        needFalKeyEl.classList.remove('hidden');
      } else {
        console.log('[refreshKeyWarnings] Hiding needFalKeyWarn');
        needFalKeyEl.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('[refreshKeyWarnings] Error:', err);
  }
}
refreshKeyWarnings();
// Image count segmented control
imgCountEl?.addEventListener('click', (e) => {
  const btnEl = e.target?.closest?.('button.seg-btn');
  if (!btnEl) return;
  imgCountEl.querySelectorAll('button.seg-btn').forEach((b) => b.classList.remove('active'));
  btnEl.classList.add('active');
  const v = Number(btnEl.dataset.v || '1');
  selectedImgCount = Math.min(Math.max(v, 1), 4);
  renderModelSlots();
  updateRefSectionVisibility();
  updateSizeRowVisibility();
  savePanelStateDebounced();
});
// Persistence toggle removed (always enabled)
// Update buttons live when settings change
chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.customPrompts) {
      renderCustomPromptButtons(changes.customPrompts.newValue || []);
    }
    if (changes.officialPrompts) {
      refreshOfficialPromptButtons();
    }
    let needRepop = false;
    if (Object.prototype.hasOwnProperty.call(changes, 'geminiApiKey')) { refreshKeyWarning(); needRepop = true; }
    if (Object.prototype.hasOwnProperty.call(changes, 'openrouterApiKey')) { refreshKeyWarning(); needRepop = true; }
    if (Object.prototype.hasOwnProperty.call(changes, 'apiProvider')) { refreshKeyWarning(); needRepop = true; }
    if (needRepop) { try { refreshModelOptions(); } catch {} }
  }
  if (area === 'session') {
    let needRepop = false;
    if (Object.prototype.hasOwnProperty.call(changes, 'geminiApiKey')) { refreshKeyWarning(); needRepop = true; }
    if (Object.prototype.hasOwnProperty.call(changes, 'openrouterApiKey')) { refreshKeyWarning(); needRepop = true; }
    if (needRepop) { try { refreshModelOptions(); } catch {} }
  }
});

// Receive selections from the library window
chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'library:selected' && Array.isArray(msg.images)) {
    for (const it of msg.images) {
      if (refImages.length >= MAX_REF_IMAGES) break;
      if (it?.inlineData?.data && it?.inlineData?.mimeType) {
        refImages.push({
          mimeType: it.inlineData.mimeType,
          base64: it.inlineData.data,
          name: it.name || 'library-image'
        });
      }
    }
    renderRefImages();
    sendResponse?.({ ok: true });
    return true;
  }
  if (msg?.type === 'editor:saved') {
    try {
      const i = Number(msg.idx);
      const mode = msg.mode === 'add' ? 'add' : 'replace';
      const mime = msg?.inlineData?.mimeType || 'image/png';
      const base64 = msg?.inlineData?.data || '';
      if (!base64) { sendResponse?.({ ok: false, error: 'no_data' }); return true; }
      (async () => {
        const dim = await new Promise((res) => {
          const im = new Image();
          im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
          im.onerror = () => res({ w: 0, h: 0 });
          im.src = `data:${mime};base64,${base64}`;
        });
        const entry = { mimeType: mime, base64, name: 'edited-image', width: dim.w, height: dim.h };
        if (mode === 'replace' && i >= 0 && i < refImages.length) {
          refImages[i] = entry;
        } else if (mode === 'add') {
          if (refImages.length >= MAX_REF_IMAGES) { alert('参考画像の上限に達しています'); sendResponse?.({ ok: false, error: 'limit' }); return; }
          refImages.push(entry);
        }
        renderRefImages();
        savePanelStateDebounced();
        sendResponse?.({ ok: true });
      })();
    } catch (e) {
      console.error(e);
      sendResponse?.({ ok: false, error: 'exception' });
    }
    return true;
  }
});

async function openLibraryWindow() {
  const url = chrome.runtime.getURL('library.html');
  try {
    const width = Math.min(Math.floor(screen.availWidth * 0.85), 1100);
    const height = Math.min(Math.floor(screen.availHeight * 0.85), 900);
    await chrome.windows.create({ url, type: 'popup', width, height, left: Math.max(0, Math.floor((screen.availWidth - width) / 2)), top: Math.max(0, Math.floor((screen.availHeight - height) / 2)) });
  } catch (e) {
    window.open(url, '_blank');
  }
}

async function openStoryboardTab() {
  const url = chrome.runtime.getURL('storyboard.html');
  try {
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'storyboard:open-tab' }, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(res);
        });
      } catch (err) {
        reject(err);
      }
    });
    if (!response?.ok) throw new Error(response?.error || 'failed to open storyboard tab');
  } catch (e) {
    console.error('Failed to open storyboard tab', e);
    try {
      window.open(url, '_blank');
    } catch (fallbackErr) {
      console.error('Fallback storyboard window open failed', fallbackErr);
    }
  }
}

async function openEditorWindow(index) {
  try {
    const it = refImages[index];
    if (!it) return;
    const dataUrl = `data:${it.mimeType};base64,${it.base64}`;
    const key = `edit-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    try { await chrome.storage.session.set({ [key]: dataUrl }); } catch {}
    const url = new URL(chrome.runtime.getURL('editor.html'));
    url.searchParams.set('key', key);
    url.searchParams.set('idx', String(index));
    const width = Math.min(Math.floor(screen.availWidth * 0.9), 1300);
    const height = Math.min(Math.floor(screen.availHeight * 0.9), 950);
    await chrome.windows.create({ url: url.toString(), type: 'popup', width, height, left: Math.max(0, Math.floor((screen.availWidth - width) / 2)), top: Math.max(0, Math.floor((screen.availHeight - height) / 2)) });
  } catch (e) {
    console.error('Failed to open editor window', e);
  }
}

// Lightbox wiring
lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox(); // click on backdrop closes
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox?.classList.contains('hidden')) closeLightbox();
});

// Save right before panel/tab hides to avoid losing state on quick close
try {
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePanelState(); });
  window.addEventListener('pagehide', () => savePanelState());
} catch {}
