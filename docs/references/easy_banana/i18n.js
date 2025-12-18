// Lightweight i18n utility for runtime language switching (en/ja)
// Usage: include this script before page JS, then call I18N.initAndApply(document)

(function(){
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en','ja'];

  async function getPreferredLang() {
    try {
      const p = await new Promise((resolve) => {
        chrome?.storage?.local?.get?.(['uiLang'], (v)=> resolve(v?.uiLang || 'auto'));
      });
      if (p && p !== 'auto') return SUPPORTED.includes(p) ? p : DEFAULT_LANG;
    } catch {}
    try {
      const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
      if (nav.startsWith('ja')) return 'ja';
    } catch {}
    return DEFAULT_LANG;
  }

  async function loadDict(lang) {
    const pick = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    const url = chrome.runtime.getURL(`locales/${pick}.json`);
    const res = await fetch(url);
    if (!res.ok) throw new Error('i18n dict load failed');
    return res.json();
  }

  function applyToElement(el, dict) {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) {
      el.textContent = dict[key];
    }
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      // format: "placeholder:panel.prompt|title:panel.title"
      const parts = attr.split('|');
      for (const p of parts) {
        const [attrName, k] = p.split(':');
        if (attrName && k && dict[k]) {
          try { el.setAttribute(attrName, dict[k]); } catch {}
        }
      }
    }
  }

  function apply(root, dict) {
    const all = (root || document).querySelectorAll('[data-i18n], [data-i18n-attr]');
    all.forEach((el) => applyToElement(el, dict));
  }

  let current = { lang: null, dict: {} };

  async function initAndApply(root) {
    const lang = await getPreferredLang();
    if (current.lang !== lang) {
      current.dict = await loadDict(lang);
      current.lang = lang;
    }
    apply(root || document, current.dict);
  }

  function t(key, fallback) { return current.dict?.[key] || fallback || key; }

  // Listen for uiLang changes
  try {
    chrome?.storage?.onChanged?.addListener((changes, area) => {
      if (area === 'local' && Object.prototype.hasOwnProperty.call(changes, 'uiLang')) {
        initAndApply(document);
      }
    });
  } catch {}

  window.I18N = { initAndApply, t };
})();
