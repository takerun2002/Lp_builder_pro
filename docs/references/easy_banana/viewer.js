const img = document.getElementById('img');
const closeBtn = document.getElementById('close');
const tip = document.querySelector('.tip');

async function getSrcFromUrl() {
  const url = new URL(location.href);
  return url.searchParams.get('src') || '';
}

function closeWindow() {
  // Clean up blob URL if present to avoid memory leak
  const src = img.src;
  if (src && src.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(src);
    } catch {}
  }
  // Try to close popup; if opened in a tab, navigate back
  if (window.close) window.close();
}

async function init() {
  const src = await getSrcFromUrl();
  if (src) {
    img.src = src;
    tip.textContent = 'クリックまたは Esc で閉じる';
  } else {
    tip.textContent = '画像を読み込めませんでした（Esc で閉じる）';
  }
}

document.addEventListener('click', (e) => {
  // Any click closes (except if downloading context menu etc.)
  closeWindow();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeWindow();
});

closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  closeWindow();
});

// Clean up blob URLs on page unload to prevent memory leaks
window.addEventListener('unload', () => {
  const src = img.src;
  if (src && src.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(src);
    } catch {}
  }
});

init();
