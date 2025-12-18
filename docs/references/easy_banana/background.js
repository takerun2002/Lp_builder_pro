const STORYBOARD_TAB_KEY = 'storyboardTabId';

const MAIN_PANEL_URL = (() => {
  try {
    const url = new URL(chrome.runtime.getURL('sidepanel.html'));
    url.searchParams.set('full', '1');
    url.searchParams.set('view', 'tab');
    return url.toString();
  } catch {
    return chrome.runtime.getURL('sidepanel.html?full=1&view=tab');
  }
})();

function openPanelTab() {
  const query = { url: [`${chrome.runtime.getURL('sidepanel.html')}*`] };
  chrome.tabs.query(query, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn('[background] tabs.query failed', chrome.runtime.lastError.message);
      chrome.tabs.create({ url: MAIN_PANEL_URL, active: true });
      return;
    }
    const existing = tabs.find((tab) => {
      try {
        const url = new URL(tab.url || '');
        return url.pathname.endsWith('/sidepanel.html') && url.searchParams.get('view') === 'tab';
      } catch {
        return false;
      }
    });
    if (existing?.id) {
      chrome.tabs.update(existing.id, { active: true }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[background] tabs.update failed', chrome.runtime.lastError.message);
        }
      });
      if (existing.windowId !== undefined) {
        chrome.windows.update(existing.windowId, { focused: true }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[background] windows.update failed', chrome.runtime.lastError.message);
          }
        });
      }
      return;
    }
    chrome.tabs.create({ url: MAIN_PANEL_URL, active: true }, (tab) => {
      if (chrome.runtime.lastError) {
        console.warn('[background] tabs.create main panel failed', chrome.runtime.lastError.message);
      } else if (tab?.windowId !== undefined) {
        chrome.windows.update(tab.windowId, { focused: true }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[background] windows.update (create) failed', chrome.runtime.lastError.message);
          }
        });
      }
    });
  });
}

chrome.action?.onClicked?.addListener(() => {
  openPanelTab();
});

let storyboardTabId = null;

const storyboardUrlPrefix = chrome.runtime.getURL('storyboard.html');

if (chrome.storage?.session) {
  chrome.storage.session.get(STORYBOARD_TAB_KEY, (data) => {
    const stored = data?.[STORYBOARD_TAB_KEY];
    if (typeof stored === 'number') storyboardTabId = stored;
  });
}

function rememberStoryboardTab(id) {
  storyboardTabId = typeof id === 'number' ? id : null;
  if (!chrome.storage?.session) return;
  if (storyboardTabId !== null) {
    chrome.storage.session.set({ [STORYBOARD_TAB_KEY]: storyboardTabId });
  } else {
    chrome.storage.session.remove(STORYBOARD_TAB_KEY);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === storyboardTabId) rememberStoryboardTab(null);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (typeof tab?.url === 'string' && tab.url.startsWith(storyboardUrlPrefix)) {
    rememberStoryboardTab(tabId);
  }
});

function openStoryboardTab(sendResponse) {
  const url = chrome.runtime.getURL('storyboard.html');
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn('[background] tabs.create storyboard failed', chrome.runtime.lastError.message);
      sendResponse?.({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    rememberStoryboardTab(tab?.id ?? null);
    sendResponse?.({ ok: true, tabId: storyboardTabId });
  });
}

function resolveStoryboardIds(message, callback) {
  const ids = new Set();
  if (typeof message?.tabId === 'number') ids.add(message.tabId);
  if (typeof storyboardTabId === 'number') ids.add(storyboardTabId);
  if (ids.size || !chrome.storage?.session) {
    callback(Array.from(ids));
    return;
  }
  chrome.storage.session.get(STORYBOARD_TAB_KEY, (data) => {
    const stored = data?.[STORYBOARD_TAB_KEY];
    if (typeof stored === 'number') ids.add(stored);
    callback(Array.from(ids));
  });
}

function removeTabs(ids) {
  ids.forEach((id) => {
    chrome.tabs.remove(id, () => {
      if (chrome.runtime.lastError) {
        console.warn('[background] tabs.remove failed', id, chrome.runtime.lastError.message);
        return;
      }
      if (id === storyboardTabId) rememberStoryboardTab(null);
    });
  });
}

function closeStoryboardTab(message = {}) {
  resolveStoryboardIds(message, (ids) => {
    if (ids.length) {
      removeTabs(ids);
      return;
    }
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('[background] tabs.query failed', chrome.runtime.lastError.message);
        return;
      }
      const matchedIds = tabs
        .filter((tab) => typeof tab?.id === 'number' && typeof tab?.url === 'string' && tab.url.startsWith(storyboardUrlPrefix))
        .map((tab) => tab.id);
      if (!matchedIds.length) {
        console.warn('[background] no storyboard tab found to close');
        return;
      }
      removeTabs(matchedIds);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case 'storyboard:open-tab':
      openStoryboardTab(sendResponse);
      return true;
    case 'storyboard:register-tab':
      if (sender?.tab?.id) rememberStoryboardTab(sender.tab.id);
      else if (typeof message.tabId === 'number') rememberStoryboardTab(message.tabId);
      sendResponse?.({ ok: true });
      return false;
    case 'storyboard:close-tab':
      if (sender?.tab?.id) rememberStoryboardTab(sender.tab.id);
      closeStoryboardTab(message);
      sendResponse?.({ ok: true });
      return false;
    default:
      break;
  }
  return undefined;
});
