/* eslint-disable no-console */
document.addEventListener('DOMContentLoaded', () => {
  const rowsContainer = document.getElementById('storyRows');
  const rowTemplate = document.getElementById('storyboardRowTemplate');
  const downloadAllBtn = document.getElementById('storyDownloadAll');
  const downloadAllDefaultLabel = downloadAllBtn?.textContent || 'ZIP Download All';

  if (!rowsContainer || !rowTemplate) return;

  const rows = new Map();
  let rowSeq = 0;
  let storyboardModels = [];
  let modelsLoaded = false;
  let zipBusy = false;

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i += 1) {
      crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
  }

  function toDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | (month << 5) | day;
    const dosTime = (hours << 11) | (minutes << 5) | seconds;
    return { date: dosDate & 0xFFFF, time: dosTime & 0xFFFF };
  }

  class ZipWriter {
    constructor() {
      this.parts = [];
      this.central = [];
      this.offset = 0;
      this.fileCount = 0;
      if (!ZipWriter.encoder) ZipWriter.encoder = new TextEncoder();
    }

    add(name, data, fileDate) {
      const input = data instanceof Uint8Array ? data : new Uint8Array(data);
      const encoder = ZipWriter.encoder;
      const nameBytes = encoder.encode(name);
      const dos = toDosDateTime(fileDate);
      const crc = crc32(input);
      const localOffset = this.offset;

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dos.time, true);
      localView.setUint16(12, dos.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, input.length, true);
      localView.setUint32(22, input.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, dos.time, true);
      centralView.setUint16(14, dos.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, input.length, true);
      centralView.setUint32(24, input.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, localOffset, true);
      centralHeader.set(nameBytes, 46);

      this.parts.push(localHeader, input);
      this.central.push(centralHeader);
      this.offset += localHeader.length + input.length;
      this.fileCount += 1;
    }

    generate() {
      const centralOffset = this.offset;
      const centralSize = this.central.reduce((acc, part) => acc + part.length, 0);
      const endRecord = new Uint8Array(22);
      const endView = new DataView(endRecord.buffer);
      endView.setUint32(0, 0x06054b50, true);
      endView.setUint16(4, 0, true);
      endView.setUint16(6, 0, true);
      endView.setUint16(8, this.fileCount, true);
      endView.setUint16(10, this.fileCount, true);
      endView.setUint32(12, centralSize, true);
      endView.setUint32(16, centralOffset, true);
      endView.setUint16(20, 0, true);

      return new Blob([...this.parts, ...this.central, endRecord], { type: 'application/zip' });
    }
  }

  function hasDownloadableResults() {
    for (const entry of rows.values()) {
      const result = entry?.state?.result;
      if (!result) continue;
      if (result.type === 'video' && Array.isArray(result.videos) && result.videos.some((item) => item?.url)) return true;
      if (result.type === 'image' && Array.isArray(result.images) && result.images.some((item) => item && (item.src || item.dataUrl || item.url))) return true;
      if (result.type === 'audio' && Array.isArray(result.audios) && result.audios.some((item) => item && (item.src || item.dataUrl || item.url))) return true;
    }
    return false;
  }

  function refreshDownloadAllState() {
    if (!downloadAllBtn) return;
    downloadAllBtn.disabled = zipBusy || !hasDownloadableResults();
  }

  function setZipBusy(flag, label) {
    zipBusy = !!flag;
    if (downloadAllBtn) {
      downloadAllBtn.textContent = flag ? (label || 'ZIPを準備しています...') : downloadAllDefaultLabel;
    }
    refreshDownloadAllState();
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function mergeLogs(current, incoming) {
    const base = Array.isArray(current) ? current.slice() : [];
    const seen = new Set(base);
    const next = Array.isArray(incoming) ? incoming : [];
    for (const line of next) {
      const text = typeof line === 'string' ? line.trim() : '';
      if (!text || seen.has(text)) continue;
      seen.add(text);
      base.push(text);
    }
    return base;
  }

  function getStatusString(data) {
    const fields = [data?.status, data?.queue_status, data?.state, data?.phase];
    for (const field of fields) {
      if (typeof field === 'string' && field.trim()) return field.trim();
    }
    return '';
  }

  function collectLogsFromData(data) {
    const sources = [
      data?.logs,
      data?.output?.logs,
      data?.result?.logs,
      data?.data?.logs,
      data?.debug?.logs,
      data?.queue?.logs
    ];
    const lines = [];
    const pushLine = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(pushLine);
        return;
      }
      if (typeof value === 'string') {
        lines.push(value);
        return;
      }
      if (typeof value === 'object') {
        const msg = value.message || value.text || value.status || JSON.stringify(value);
        lines.push(msg);
      }
    };
    sources.forEach(pushLine);
    const message = data?.message || data?.detail || data?.note;
    if (typeof message === 'string') lines.push(message);
    return lines.map((line) => line.toString().trim()).filter(Boolean);
  }

  function collectExtraUrls(data) {
    const extras = new Set();
    const add = (value) => {
      if (typeof value === 'string' && value.startsWith('http')) extras.add(value);
    };
    add(data?.status_url);
    add(data?.result_url);
    add(data?.response_url);
    add(data?.video_url);
    add(data?.videoUrl);
    const urls = data?.urls;
    if (Array.isArray(urls)) urls.forEach(add);
    else if (urls && typeof urls === 'object') Object.values(urls).forEach(add);
    const queue = data?.queue;
    if (queue && typeof queue === 'object') {
      add(queue.status_url);
      add(queue.result_url);
    }
    return extras;
  }

  function statusIndicatesSuccess(status) {
    if (typeof status !== 'string') return false;
    const text = status.trim().toLowerCase();
    if (!text) return false;
    return /(success|succeed|completed|complete|finished|finish|done|ready|ok)/.test(text);
  }

  function normalizeOutputType(value) {
    const type = (value || '').toString().trim().toLowerCase();
    if (type === 'image' || type === 'images' || type === 'img') return 'image';
    if (type === 'audio' || type === 'sound') return 'audio';
    return 'video';
  }

  function sanitizeBase64(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  }

  function looksLikeBase64(value) {
    if (typeof value !== 'string') return false;
    const stripped = sanitizeBase64(value);
    return stripped.length > 32 && /^[a-z0-9+/=]+$/i.test(stripped);
  }

  function toDataUrlFromBase64(value, mime = 'application/octet-stream') {
    if (!looksLikeBase64(value)) return '';
    const stripped = sanitizeBase64(value);
    return `data:${mime};base64,${stripped}`;
  }

  function looksLikeHex(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length > 32 && trimmed.length % 2 === 0 && /^[0-9a-f]+$/i.test(trimmed);
  }

  function hexToBase64DataUrl(value, mime = 'application/octet-stream') {
    if (!looksLikeHex(value)) return '';
    const hex = value.trim();
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    const chunks = [];
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      chunks.push(String.fromCharCode.apply(null, slice));
    }
    const binary = chunks.join('');
    return `data:${mime};base64,${btoa(binary)}`;
  }

  async function openImagePopup(src) {
    const viewerUrl = new URL(chrome.runtime.getURL('viewer.html'));
    try {
      const res = await fetch(src, { referrerPolicy: 'no-referrer', credentials: 'omit' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        viewerUrl.searchParams.set('src', blobUrl);
      } else {
        viewerUrl.searchParams.set('src', src);
      }
    } catch (err) {
      console.warn('Failed to convert image for preview', err);
      viewerUrl.searchParams.set('src', src);
    }

    const width = Math.min(window?.screen?.availWidth || 1600, 1600);
    const height = Math.min(window?.screen?.availHeight || 1000, 1000);
    try {
      await chrome.windows.create({
        url: viewerUrl.toString(),
        type: 'popup',
        focused: true,
        width,
        height,
        left: 0,
        top: 0
      });
    } catch (err) {
      console.warn('chrome.windows.create failed, fallback to window.open', err);
      window.open(viewerUrl.toString(), '_blank');
    }
  }

  const VIDEO_EXTENSION_REGEX = /\.(mp4|mov|webm|mkv|m4v|mpg|mpeg)(\?|#|$)/i;
  const DATA_VIDEO_REGEX = /^data:video\//i;

  function isLikelyQueueUrl(url) {
    if (typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.includes('/requests/') || lower.includes('/status') || lower.includes('/result');
  }

  function isVideoUrlString(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (isLikelyQueueUrl(trimmed)) return false;
    if (DATA_VIDEO_REGEX.test(trimmed)) return true;
    if (VIDEO_EXTENSION_REGEX.test(trimmed)) return true;
    if (/fal\.media\//i.test(trimmed) && /video/i.test(trimmed)) return true;
    if (/googleapis\.com\//i.test(trimmed) && /video/i.test(trimmed)) return true;
    return false;
  }

  function normalizeVideoCandidate(value, index = 0) {
    if (!value) return null;
    const base = { name: `Video ${index + 1}` };

    const finalize = (rawUrl, meta = {}) => {
      if (typeof rawUrl !== 'string') return null;
      const trimmed = rawUrl.trim();
      if (!trimmed) return null;
      if (!/^https?:/i.test(trimmed) && !DATA_VIDEO_REGEX.test(trimmed)) return null;
      if (!isVideoUrlString(trimmed) && !DATA_VIDEO_REGEX.test(trimmed)) return null;
      if (/^https?:/i.test(trimmed)) {
        return { ...base, url: trimmed, ...meta };
      }
      if (looksLikeBase64(trimmed)) {
        const mime = meta.mime || 'video/mp4';
        return { ...base, url: toDataUrlFromBase64(trimmed, mime), ...meta };
      }
      return null;
    };

    if (typeof value === 'string') {
      return finalize(value);
    }

    if (typeof value === 'object') {
      const meta = {};
      const mime = value.content_type || value.mime || value.mime_type || value.type;
      if (mime) meta.mime = mime;
      const filename = value.file_name || value.filename || value.name;
      if (filename) meta.filename = filename;
      const size = value.file_size || value.size || value.bytes;
      if (size) meta.size = size;

      const candidates = [
        value.url,
        value.href,
        value.link,
        value.source,
        value.download_url,
        value.downloadUrl,
        value.signed_url,
        value.signedUrl,
        value.asset_url,
        value.assetUrl,
        value.video_url,
        value.videoUrl,
        value.path,
        value.value
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (isLikelyQueueUrl(candidate)) continue;
        const normalized = finalize(candidate, meta);
        if (normalized) return normalized;
      }

      if (typeof value.data === 'string') {
        const normalized = finalize(value.data, meta);
        if (normalized) return normalized;
      }
      if (value.file && typeof value.file === 'object') {
        const nested = normalizeVideoCandidate(value.file, index);
        if (nested) return nested;
      }

      if ((mime || '').toLowerCase().startsWith('video/') && typeof value.file_data === 'string') {
        const normalized = finalize(value.file_data, meta);
        if (normalized) return normalized;
      }
    }

    return null;
  }

  function extractVideoInfo(data) {
    const logs = collectLogsFromData(data);
    const status = getStatusString(data);
    const extras = collectExtraUrls(data);

    const videos = [];
    const push = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => push(item));
        return;
      }
      const normalized = normalizeVideoCandidate(value, videos.length);
      if (normalized) videos.push(normalized);
    };

    push(data?.video);
    push(data?.video_url);
    push(data?.videoUrl);
    push(data?.output?.video);
    push(data?.output?.video_url);
    push(data?.result?.video);
    push(data?.result?.video_url);
    push(data?.data?.video);
    push(data?.data?.video_url);
    push(data?.videos);
    push(data?.output?.videos);
    push(data?.result?.videos);
    push(data?.data?.videos);

    let primary = videos.find((item) => typeof item?.url === 'string' && item.url.trim());

    if (!primary) {
      const fallback = new Set();
      const visit = (value, depth = 0) => {
        if (value == null || depth > 4) return;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (isVideoUrlString(trimmed)) fallback.add(trimmed);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item) => visit(item, depth + 1));
          return;
        }
        if (typeof value === 'object') {
          for (const [key, val] of Object.entries(value)) {
            if (typeof val === 'string') {
              const lowerKey = key.toLowerCase();
              if (isVideoUrlString(val) || (lowerKey.includes('video') && !isLikelyQueueUrl(val))) {
                fallback.add(val);
              }
            }
            if (val && typeof val === 'object' && typeof val.url === 'string') {
              const inner = val.url.trim();
              if (isVideoUrlString(inner)) fallback.add(inner);
            }
            visit(val, depth + 1);
          }
        }
      };
      visit(data);
      const fallbackUrl = Array.from(fallback).find((url) => /^https?:/i.test(url)) || '';
      if (fallbackUrl) {
        const normalized = normalizeVideoCandidate(fallbackUrl, videos.length) || { name: `Video ${videos.length + 1}`, url: fallbackUrl };
        videos.push(normalized);
        primary = normalized;
      }
    }

    const videoUrl = primary?.url || '';

    return {
      videoUrl,
      logs,
      status,
      extraUrls: Array.from(extras),
      videos
    };
  }

  function normalizeImageCandidate(value, index = 0) {
    if (!value) return null;
    const base = { name: `Image ${index + 1}` };
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^data:image\//i.test(trimmed)) {
        return { ...base, dataUrl: trimmed, mime: trimmed.split(';')[0].split(':')[1] || '' };
      }
      if (/^https?:/i.test(trimmed)) {
        return { ...base, url: trimmed };
      }
      if (looksLikeBase64(trimmed)) {
        return { ...base, dataUrl: toDataUrlFromBase64(trimmed, 'image/png'), mime: 'image/png' };
      }
      return null;
    }
    if (typeof value === 'object') {
      const candidate = { ...base };
      const url = value.url || value.href || value.link || value.image_url || value.imageUrl || value.path || value.signed_url || value.asset_url;
      if (typeof url === 'string' && /^https?:/i.test(url)) {
        candidate.url = url;
      }
      const dataUrl = typeof value.dataUrl === 'string' ? value.dataUrl : null;
      if (dataUrl && /^data:image\//i.test(dataUrl)) candidate.dataUrl = dataUrl;
      const base64 = value.base64 || value.image_base64 || value.imageBase64 || value.b64_json || value.image;
      if (!candidate.url && !candidate.dataUrl && looksLikeBase64(base64 || '')) {
        candidate.dataUrl = toDataUrlFromBase64(base64, value.mime || value.mime_type || 'image/png');
        candidate.mime = value.mime || value.mime_type || 'image/png';
      }
      if (!candidate.url && !candidate.dataUrl && typeof value.data === 'string') {
        if (/^data:image\//i.test(value.data)) candidate.dataUrl = value.data;
        else if (looksLikeBase64(value.data)) candidate.dataUrl = toDataUrlFromBase64(value.data, value.mime || 'image/png');
      }
      if (!candidate.url && !candidate.dataUrl && typeof value.src === 'string') {
        if (/^data:image\//i.test(value.src)) candidate.dataUrl = value.src;
        else if (/^https?:/i.test(value.src)) candidate.url = value.src;
      }
      if (value.filename || value.name) candidate.filename = value.filename || value.name;
      if (candidate.url || candidate.dataUrl) return candidate;
    }
    return null;
  }

  function extractImageInfo(data) {
    const logs = collectLogsFromData(data);
    const status = getStatusString(data);
    const extras = collectExtraUrls(data);
    const images = [];
    const push = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => push(item));
        return;
      }
      const normalized = normalizeImageCandidate(value, images.length);
      if (normalized) images.push(normalized);
    };

    push(data?.image);
    push(data?.images);
    push(data?.output?.image);
    push(data?.output?.images);
    push(data?.result?.image);
    push(data?.result?.images);
    push(data?.data?.image);
    push(data?.data?.images);
    push(data?.output?.result);
    push(data?.artifacts);
    push(data?.output?.artifacts);
    const urls = data?.urls;
    if (Array.isArray(urls)) urls.forEach(push);

    return {
      type: 'image',
      ready: images.length > 0,
      images,
      logs,
      status,
      extraUrls: Array.from(extras)
    };
  }

  function normalizeAudioCandidate(value, index = 0) {
    if (!value) return null;
    const base = { name: `Audio ${index + 1}` };
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^data:audio\//i.test(trimmed)) {
        return { ...base, dataUrl: trimmed, mime: trimmed.split(';')[0].split(':')[1] || '' };
      }
      if (/^https?:/i.test(trimmed)) {
        return { ...base, url: trimmed };
      }
      if (looksLikeBase64(trimmed)) {
        return { ...base, dataUrl: toDataUrlFromBase64(trimmed, 'audio/mpeg'), mime: 'audio/mpeg' };
      }
      if (looksLikeHex(trimmed)) {
        return { ...base, dataUrl: hexToBase64DataUrl(trimmed, 'audio/mpeg'), mime: 'audio/mpeg' };
      }
      return null;
    }
    if (typeof value === 'object') {
      const candidate = { ...base };
      const url = value.url || value.audio_url || value.audioUrl || value.href || value.link || value.path || value.signed_url;
      if (typeof url === 'string' && /^https?:/i.test(url)) candidate.url = url;
      const dataUrl = typeof value.dataUrl === 'string' ? value.dataUrl : null;
      if (dataUrl && /^data:audio\//i.test(dataUrl)) candidate.dataUrl = dataUrl;
      const base64 = value.base64 || value.b64_json || value.audio || value.data;
      if (!candidate.url && !candidate.dataUrl && looksLikeBase64(base64 || '')) {
        candidate.dataUrl = toDataUrlFromBase64(base64, value.mime || value.mime_type || 'audio/mpeg');
        candidate.mime = value.mime || value.mime_type || 'audio/mpeg';
      }
      if (!candidate.url && !candidate.dataUrl && looksLikeHex(value.hex || value.audio_hex || '')) {
        candidate.dataUrl = hexToBase64DataUrl(value.hex || value.audio_hex, value.mime || 'audio/mpeg');
        candidate.mime = value.mime || 'audio/mpeg';
      }
      if (!candidate.url && !candidate.dataUrl && typeof value.src === 'string') {
        if (/^data:audio\//i.test(value.src)) candidate.dataUrl = value.src;
        else if (/^https?:/i.test(value.src)) candidate.url = value.src;
      }
      if (value.filename || value.name) candidate.filename = value.filename || value.name;
      if (candidate.url || candidate.dataUrl) return candidate;
    }
    return null;
  }

  function extractAudioInfo(data) {
    const logs = collectLogsFromData(data);
    const status = getStatusString(data);
    const extras = collectExtraUrls(data);
    const audios = [];
    const push = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => push(item));
        return;
      }
      const normalized = normalizeAudioCandidate(value, audios.length);
      if (normalized) audios.push(normalized);
    };

    push(data?.audio);
    push(data?.audios);
    push(data?.output?.audio);
    push(data?.output?.audios);
    push(data?.result?.audio);
    push(data?.result?.audios);
    push(data?.data?.audio);
    push(data?.data?.audios);
    push(data?.audio_url);
    push(data?.audioUrl);
    push(data?.artifacts);
    push(data?.output?.artifacts);

    return {
      type: 'audio',
      ready: audios.length > 0,
      audios,
      logs,
      status,
      extraUrls: Array.from(extras)
    };
  }

  function extractStoryboardResult(outputType, data) {
    const type = normalizeOutputType(outputType);
    if (type === 'image') return extractImageInfo(data);
    if (type === 'audio') return extractAudioInfo(data);
    const info = extractVideoInfo(data);
    const videos = Array.isArray(info.videos)
      ? info.videos.filter((item) => item && typeof item.url === 'string' && item.url.trim())
      : [];
    if (!videos.length && info.videoUrl) videos.push({ url: info.videoUrl });
    return {
      type: 'video',
      ready: videos.length > 0,
      videos,
      logs: info.logs,
      status: info.status,
      extraUrls: info.extraUrls || []
    };
  }

  function findModelByValue(value) {
    if (!value) return null;
    const [provider, ...rest] = value.split(':');
    const model = rest.join(':');
    return storyboardModels.find((entry) => entry.provider === provider && entry.model === model) || null;
  }

  function setRowOutputType(row, type) {
    const normalized = normalizeOutputType(type);
    row.state.outputType = normalized;
    if (row.state.result && row.state.result.type !== normalized) {
      row.state.result = null;
      if (row.elements.output) row.elements.output.innerHTML = '';
    }
    updateResultActions(row);
  }

  function getVideoResult(row) {
    return row?.state?.result?.type === 'video' ? row.state.result : null;
  }

  function getImageResult(row) {
    return row?.state?.result?.type === 'image' ? row.state.result : null;
  }

  function getAudioResult(row) {
    return row?.state?.result?.type === 'audio' ? row.state.result : null;
  }

  function clearResult(row) {
    row.state.result = null;
    row.state.videoControls = null;
    row.state.audioControls = null;
    if (row.elements.output) row.elements.output.innerHTML = '';
    updateResultActions(row);
  }

  function addControlEntry(row, labelText, noteText = 'Idle') {
    const list = row.elements.controlList;
    if (!list) return;
    const entry = document.createElement('div');
    entry.className = 'control-row';
    entry.setAttribute('role', 'listitem');

    const header = document.createElement('div');
    header.className = 'control-row-header';
    const label = document.createElement('span');
    label.textContent = labelText;
    const note = document.createElement('small');
    note.textContent = noteText;
    header.appendChild(label);
    header.appendChild(note);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'control-title';
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Title (optional)';
    titleLabel.setAttribute('for', `${row.id}-title`);
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = `${row.id}-title`;
    titleInput.placeholder = 'Example: Evening mood';
    titleWrap.appendChild(titleLabel);
    titleWrap.appendChild(titleInput);

    const memoWrap = document.createElement('div');
    memoWrap.className = 'control-memo';
    const memoLabel = document.createElement('label');
    memoLabel.textContent = 'Memo';
    memoLabel.setAttribute('for', `${row.id}-memo`);
    const memoInput = document.createElement('input');
    memoInput.type = 'text';
    memoInput.id = `${row.id}-memo`;
    memoInput.placeholder = 'Optional notes';
    memoWrap.appendChild(memoLabel);
    memoWrap.appendChild(memoInput);

    entry.appendChild(header);
    entry.appendChild(titleWrap);
    entry.appendChild(memoWrap);

    list.appendChild(entry);
    row.elements.controlEntry = entry;
    row.elements.controlLabel = label;
    row.elements.controlNote = note;
    row.elements.controlTitle = titleInput;
    row.elements.controlMemo = memoInput;
  }

  function getRowsInDomOrder() {
    const ordered = [];
    if (!rowsContainer) return ordered;
    rowsContainer.querySelectorAll('.storyboard-row').forEach((rowEl) => {
      const rowId = rowEl.dataset.rowId;
      if (!rowId) return;
      const row = rows.get(rowId);
      if (row) ordered.push(row);
    });
    return ordered;
  }

  function reindexRows() {
    const orderedRows = getRowsInDomOrder();
    orderedRows.forEach((row, index) => {
      const sequence = index + 1;
      row.state.sequence = sequence;
      if (row.elements.controlLabel) row.elements.controlLabel.textContent = `Job ${sequence}`;
    });
  }

  function moveRow(row, direction) {
    if (!row || !rows.has(row.id)) return;
    const orderedRows = getRowsInDomOrder();
    const index = orderedRows.indexOf(row);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedRows.length) return;
    const referenceRow = orderedRows[targetIndex];
    if (!referenceRow || !referenceRow.root || !row.root) return;
    if (direction < 0) {
      rowsContainer.insertBefore(row.root, referenceRow.root);
    } else {
      const nextSibling = referenceRow.root.nextSibling;
      if (nextSibling) rowsContainer.insertBefore(row.root, nextSibling);
      else rowsContainer.appendChild(row.root);
    }
    reindexRows();
    updateControlButtons();
    refreshDownloadAllState();
    highlightRow(row);
    row.root.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function highlightRow(row) {
    if (!row || !row.root) return;
    row.root.classList.add('storyboard-row--moved');
    setTimeout(() => {
      row.root.classList.remove('storyboard-row--moved');
    }, 700);
  }

  function updateControlNote(row, text) {
    if (row?.elements?.controlNote) row.elements.controlNote.textContent = text;
  }

  function updateControlButtons() {
    const orderedRows = getRowsInDomOrder();
    const total = orderedRows.length;
    orderedRows.forEach((row, index) => {
      const addBtn = row.elements.controlAdd;
      if (addBtn) addBtn.disabled = false;
      const removeBtn = row.elements.controlRemove;
      if (removeBtn) removeBtn.disabled = !!row.state.isGenerating || total <= 1;
      const duplicateBtn = row.elements.controlDuplicate;
      if (duplicateBtn) duplicateBtn.disabled = false;
      const moveUpBtn = row.elements.controlMoveUp;
      if (moveUpBtn) moveUpBtn.disabled = index === 0;
      const moveDownBtn = row.elements.controlMoveDown;
      if (moveDownBtn) moveDownBtn.disabled = index === total - 1;
    });
  }

  function setStatus(row, message, tone = 'info', opts = {}) {
    const statusEl = row.elements.status;
    if (!statusEl) return;
    if (row.state.statusTimer) {
      clearTimeout(row.state.statusTimer);
      row.state.statusTimer = null;
    }
    statusEl.dataset.tone = tone || 'info';
    statusEl.textContent = message || '';
    if (!message) {
      statusEl.classList.remove('is-visible');
      return;
    }
    statusEl.classList.add('is-visible');
    if (opts?.duration) {
      row.state.statusTimer = setTimeout(() => {
        statusEl.classList.remove('is-visible');
        statusEl.textContent = '';
        row.state.statusTimer = null;
      }, opts.duration);
    }
  }

  function setBusy(row, flag) {
    row.state.isGenerating = !!flag;
    const cancelBtn = row.elements.cancelBtn;
    if (cancelBtn) cancelBtn.disabled = !flag;
    const addBtn = row.elements.controlAdd;
    if (addBtn) addBtn.disabled = false;
    const removeBtn = row.elements.controlRemove;
    if (removeBtn) removeBtn.disabled = flag || rows.size <= 1;
    const duplicateBtn = row.elements.controlDuplicate;
    if (duplicateBtn) duplicateBtn.disabled = false;
    updateGenerateButtonState(row);
    updateControlButtons();
  }

  function updateResultActions(row) {
    refreshDownloadAllState();
  }

  function showLogs(row, lines) {
    const wrapper = row.elements.logsWrapper;
    const body = row.elements.logsBody;
    if (!wrapper || !body) return;
    if (!lines || !lines.length) {
      wrapper.hidden = true;
      body.textContent = '';
      return;
    }
    wrapper.hidden = false;
    body.textContent = lines.join('\n');
  }

  function ensureFieldCounterMap(row) {
    if (!(row?.state?.fieldCounters instanceof Map)) row.state.fieldCounters = new Map();
    return row.state.fieldCounters;
  }

  function hasInvalidTextInputs(row) {
    const map = row?.state?.fieldCounters;
    if (!(map instanceof Map)) return false;
    for (const info of map.values()) {
      if (info?.invalid) return true;
    }
    return false;
  }

  function updateGenerateButtonState(row) {
    const generateBtn = row?.elements?.generateBtn;
    if (!generateBtn) return;
    if (row.state.isGenerating) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      return;
    }
    const invalid = hasInvalidTextInputs(row);
    generateBtn.disabled = invalid;
    generateBtn.textContent = 'Generate';
    if (invalid) generateBtn.dataset.disabledReason = 'maxlength';
    else delete generateBtn.dataset.disabledReason;
  }

  function updateTextFieldInfo(row, info) {
    if (!info || !info.input) return;
    const value = info.input.value || '';
    info.currentLength = value.length;
    info.invalid = info.limit ? info.currentLength > info.limit : false;
    if (info.counter) {
      const text = info.limit ? `${info.currentLength}/${info.limit}` : `${info.currentLength}`;
      info.counter.textContent = text;
      info.counter.classList.toggle('is-over-limit', info.invalid);
    }
    if (info.input) info.input.classList.toggle('is-over-limit', info.invalid);
    if (!row.state.isGenerating) updateGenerateButtonState(row);
  }

  function registerTextField(row, input, limit, counter) {
    const map = ensureFieldCounterMap(row);
    const info = {
      input,
      counter,
      limit: limit > 0 ? limit : 0,
      currentLength: (input.value || '').length,
      invalid: false
    };
    const update = () => updateTextFieldInfo(row, info);
    info.update = update;
    map.set(input, info);
    input.addEventListener('input', update);
    input.addEventListener('change', update);
    update();
  }

  function scheduleVideoSource(row, url, options = {}) {
    const delay = Math.max(0, Number(options?.delayMs || 0));
    const apply = () => {
      const state = ensureRowVideoState(row);
      const video = state?.videoElement || row.state.videoControls?.videoEl;
      const controls = row.state.videoControls;
      const finalUrl = typeof url === 'string' ? url.trim() : '';

      if (!video) return;

      if (!finalUrl) {
        video.removeAttribute('src');
        video.load();
      } else {
        try {
          video.pause();
        } catch {}
        video.removeAttribute('src');
        video.load();
        video.src = finalUrl;
        video.dataset.sourceUrl = finalUrl;
        video.load();
      }

      if (row.state.videoSource) row.state.videoSource.url = finalUrl;

      const enabled = !!finalUrl;
      if (controls?.downloadBtn) controls.downloadBtn.disabled = !enabled;
      if (controls?.copyBtn) controls.copyBtn.disabled = !enabled;
      if (controls?.link) controls.link.href = enabled ? finalUrl : '#';
      if (controls?.stepBackBtn) controls.stepBackBtn.disabled = !enabled;
      if (controls?.stepForwardBtn) controls.stepForwardBtn.disabled = !enabled;
      if (controls?.stepResetBtn) controls.stepResetBtn.disabled = !enabled;
    };

    if (delay > 0) {
      setTimeout(apply, delay);
    } else {
      apply();
    }
  }

  function renderVideo(row, url, meta = {}) {
    const outputEl = row.elements.output;
    if (!outputEl) return;

    const candidateVideos = Array.isArray(meta.videos) ? meta.videos : [];
    const normalizedVideos = candidateVideos
      .map((item, index) => {
        if (!item || typeof item.url !== 'string') return null;
        const safeUrl = item.url.trim();
        if (!safeUrl) return null;
        return {
          name: item.name || item.filename || `Video ${index + 1}`,
          url: safeUrl,
          mime: item.mime || item.content_type || item.mime_type,
          filename: item.filename || item.file_name || item.name,
          size: item.size || item.file_size,
          ...item
        };
      })
      .filter(Boolean);

    const extraUrls = Array.isArray(meta.extraUrls)
      ? meta.extraUrls.filter((value) => typeof value === 'string' && value.startsWith('http'))
      : Array.isArray(row.state.result?.extraUrls)
        ? row.state.result.extraUrls.filter((value) => typeof value === 'string' && value.startsWith('http'))
        : [];

    const primaryUrl = (url || '').trim() || (normalizedVideos[0]?.url || '');
    const modelLabel = meta?.modelLabel || row.state.result?.modelLabel || '';
    const delayMs = Number.isFinite(meta?.delayMs) ? Number(meta.delayMs) : 1000;

    row.state.result = {
      type: 'video',
      videos: normalizedVideos.length
        ? normalizedVideos
        : (primaryUrl ? [{ url: primaryUrl, name: 'Video 1' }] : []),
      extraUrls,
      modelLabel,
      meta
    };

    row.state.videoSource = {
      url: primaryUrl,
      extraUrls,
      modelLabel
    };

    row.state.videoControls = null;
    outputEl.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'video-result';

    const media = document.createElement('div');
    media.className = 'video-result-media';
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('controlsList', 'nodownload');
    video.className = 'video';
    media.appendChild(video);

    const controls = document.createElement('div');
    controls.className = 'video-result-controls';

    if (modelLabel) {
      const badge = document.createElement('span');
      badge.className = 'video-badge video-result-badge';
      badge.textContent = modelLabel;
      controls.appendChild(badge);
    }

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.textContent = 'Download Video';
    downloadBtn.addEventListener('click', () => handleDownload(row));
    controls.appendChild(downloadBtn);

    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.textContent = '動画をリロード';
    reloadBtn.addEventListener('click', () => handleVideoReload(row, reloadBtn));
    controls.appendChild(reloadBtn);

    const stepper = document.createElement('div');
    stepper.className = 'video-stepper';

    const stepBackBtn = document.createElement('button');
    stepBackBtn.type = 'button';
    stepBackBtn.textContent = '◀︎ 1F';
    stepBackBtn.addEventListener('click', () => stepFrame(row, -1));
    stepper.appendChild(stepBackBtn);

    const stepResetBtn = document.createElement('button');
    stepResetBtn.type = 'button';
    stepResetBtn.textContent = 'Reset';
    stepResetBtn.addEventListener('click', () => resetFrame(row));
    stepper.appendChild(stepResetBtn);

    const stepForwardBtn = document.createElement('button');
    stepForwardBtn.type = 'button';
    stepForwardBtn.textContent = '1F ▶︎';
    stepForwardBtn.addEventListener('click', () => stepFrame(row, 1));
    stepper.appendChild(stepForwardBtn);

    controls.appendChild(stepper);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy Frame to Clipboard';
    copyBtn.addEventListener('click', () => handleCopy(row));
    controls.appendChild(copyBtn);

    const footer = document.createElement('div');
    footer.className = 'video-footer';
    const link = document.createElement('a');
    link.href = primaryUrl || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open video in new tab';
    footer.appendChild(link);
    controls.appendChild(footer);

    wrapper.appendChild(media);
    wrapper.appendChild(controls);

    outputEl.appendChild(wrapper);

    row.state.videoControls = {
      videoEl: video,
      downloadBtn,
      reloadBtn,
      copyBtn,
      link,
      stepBackBtn,
      stepForwardBtn,
      stepResetBtn
    };

    downloadBtn.disabled = true;
    copyBtn.disabled = true;
    stepBackBtn.disabled = true;
    stepForwardBtn.disabled = true;
    stepResetBtn.disabled = true;

    updateResultActions(row);
    setupStepper(row, video);
    scheduleVideoSource(row, primaryUrl, { delayMs: Math.max(0, delayMs) });
  }

  function renderImages(row, info, meta = {}) {
    const outputEl = row.elements.output;
    if (!outputEl) return;
    const rawImages = Array.isArray(info?.images) ? info.images : [];
    const normalized = rawImages.map((item, index) => {
      const src = item?.dataUrl || item?.url || item?.src || '';
      const name = item?.name || item?.filename || `Image ${index + 1}`;
      const mime = item?.mime || (src.startsWith('data:image/') ? src.split(';')[0].split(':')[1] : '');
      return { ...item, src, name, mime };
    }).filter((item) => item.src);

    row.state.result = {
      type: 'image',
      images: normalized,
      meta
    };

    outputEl.innerHTML = '';
    if (!normalized.length) {
      updateResultActions(row);
      return;
    }

    const list = document.createElement('div');
    list.className = 'image-results';
    normalized.forEach((item, index) => {
      const block = document.createElement('div');
      block.className = 'image-result';

      const preview = document.createElement('div');
      preview.className = 'image-result-preview';
      preview.tabIndex = 0;
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.name || `Image ${index + 1}`;
      preview.appendChild(img);
      const handlePreview = () => openImagePreview(row, index);
      preview.addEventListener('click', handlePreview);
      preview.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePreview();
        }
      });

      const info = document.createElement('div');
      info.className = 'image-result-info';
      const title = document.createElement('div');
      title.className = 'image-result-title';
      title.textContent = item.name || `Image ${index + 1}`;
      info.appendChild(title);

      if (meta?.modelLabel && index === 0) {
        const badge = document.createElement('span');
        badge.className = 'video-badge image-result-badge';
        badge.textContent = meta.modelLabel;
        info.appendChild(badge);
      }

      const actions = document.createElement('div');
      actions.className = 'image-result-actions';

      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.textContent = 'Preview';
      previewBtn.addEventListener('click', handlePreview);
      actions.appendChild(previewBtn);

      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.textContent = 'Download';
      downloadBtn.addEventListener('click', () => handleDownloadImage(row, index, downloadBtn));
      actions.appendChild(downloadBtn);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => handleCopyImage(row, index, copyBtn));
      actions.appendChild(copyBtn);

      info.appendChild(actions);

      block.appendChild(preview);
      block.appendChild(info);
      list.appendChild(block);
    });

    outputEl.appendChild(list);
    updateResultActions(row);
  }

  function renderAudio(row, info, meta = {}) {
    const outputEl = row.elements.output;
    if (!outputEl) return;
    const rawAudios = Array.isArray(info?.audios) ? info.audios : [];
    const normalized = rawAudios.map((item, index) => {
      const src = item?.dataUrl || item?.url || item?.src || '';
      const name = item?.name || item?.filename || `Audio ${index + 1}`;
      const mime = item?.mime || (src.startsWith('data:audio/') ? src.split(';')[0].split(':')[1] : '');
      return { ...item, src, name, mime };
    }).filter((item) => item.src);

    row.state.result = {
      type: 'audio',
      audios: normalized,
      meta
    };

    outputEl.innerHTML = '';
    if (!normalized.length) {
      updateResultActions(row);
      return;
    }

    const list = document.createElement('div');
    list.className = 'audio-results';

    normalized.forEach((item, index) => {
      const block = document.createElement('div');
      block.className = 'audio-result';

      const playerWrap = document.createElement('div');
      playerWrap.className = 'audio-result-player';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = item.src;
      audio.setAttribute('controlsList', 'nodownload');
      playerWrap.appendChild(audio);

      const info = document.createElement('div');
      info.className = 'audio-result-info';
      const title = document.createElement('div');
      title.className = 'audio-result-title';
      title.textContent = item.name || `Audio ${index + 1}`;
      info.appendChild(title);

      if (meta?.modelLabel && index === 0) {
        const badge = document.createElement('span');
        badge.className = 'video-badge audio-result-badge';
        badge.textContent = meta.modelLabel;
        info.appendChild(badge);
      }

      const actions = document.createElement('div');
      actions.className = 'audio-result-actions';
      const downloadBtn = document.createElement('button');
      downloadBtn.type = 'button';
      downloadBtn.textContent = 'Download Audio';
      downloadBtn.addEventListener('click', () => handleDownloadAudio(row, index, downloadBtn));
      actions.appendChild(downloadBtn);
      info.appendChild(actions);

      block.appendChild(playerWrap);
      block.appendChild(info);
      list.appendChild(block);
    });

    outputEl.appendChild(list);
    updateResultActions(row);
  }

  function ensureRowVideoState(row) {
    if (!row.state.video) row.state.video = { frameDuration: 1 / 30, lastTimestamp: 0 };
    return row.state.video;
  }

  function setupStepper(row, video) {
    const state = ensureRowVideoState(row);
    state.videoElement = video;
    state.originalTime = 0;
    state.frameDuration = 1 / 30;
    state.ready = false;

    const estimateFrame = ({ presentationTime }, metadata) => {
      const last = state.lastTimestamp || presentationTime;
      const delta = presentationTime - last;
      if (delta > 0 && delta < 1) {
        state.frameDuration = delta;
      }
      state.lastTimestamp = presentationTime;
      if (!state.ready && presentationTime >= 0) {
        state.originalTime = presentationTime;
        state.ready = true;
      }
      if (!video.paused && video.currentTime < video.duration) {
        video.requestVideoFrameCallback(estimateFrame);
      }
    };

    const onLoadedMetadata = () => {
      state.originalTime = video.currentTime;
      state.ready = true;
      video.requestVideoFrameCallback(estimateFrame);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    if (video.readyState >= 1) onLoadedMetadata();
  }

  async function copyFrameToClipboard(row) {
    if (!navigator?.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('クリップボードに画像をコピーできません。ブラウザの対応状況を確認してください。');
    }
    const video = row.elements.output?.querySelector('video');
    if (!video) throw new Error('コピーできる動画がありません。');
    if (video.readyState < 2) {
      await new Promise((resolve, reject) => {
        const onLoad = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('動画の読み込みに失敗しました。')); };
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoad);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('loadeddata', onLoad, { once: true });
        video.addEventListener('error', onError, { once: true });
      });
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) throw new Error('動画サイズを取得できませんでした。');
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas コンテキストの作成に失敗しました。');
    try {
      ctx.drawImage(video, 0, 0, width, height);
    } catch (err) {
      throw new Error('動画のフレームを取得できませんでした。（クロスオリジン制限の可能性があります）');
    }
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('フレーム画像の生成に失敗しました。'))), 'image/png');
    });
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
  }

  function isImageLikeFile(file) {
    if (!file) return false;
    const mime = (file.type || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    const name = (file.name || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|heic|heif|tif?f|svg)$/.test(name);
  }

  const IMAGE_SIZE_LIMIT_BYTES = 1.6 * 1024 * 1024;
  const IMAGE_DATAURL_LIMIT = 2.4 * 1024 * 1024;
  const IMAGE_MAX_DIMENSION = 1280;

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          if (typeof reader.result !== 'string') {
            reject(new Error('画像データの読み込みに失敗しました。'));
            return;
          }
          const optimized = await optimizeImageDataUrl(file, reader.result);
          resolve(optimized);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('画像データの読み込みに失敗しました。'));
      reader.readAsDataURL(file);
    });
  }

  async function optimizeImageDataUrl(file, dataUrl) {
    if (!dataUrl) return dataUrl;
    if ((file?.size || 0) <= IMAGE_SIZE_LIMIT_BYTES && dataUrl.length <= IMAGE_DATAURL_LIMIT) {
      return dataUrl;
    }
    try {
      const recompressed = await recompressImageDataUrl(dataUrl, {
        maxDimension: IMAGE_MAX_DIMENSION,
        lengthLimit: IMAGE_DATAURL_LIMIT
      });
      if (recompressed && recompressed.length < dataUrl.length) return recompressed;
    } catch (err) {
      console.warn('Failed to recompress image', err);
    }
    return dataUrl;
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
      img.src = dataUrl;
    });
  }

  async function recompressImageDataUrl(dataUrl, options = {}) {
    const { maxDimension = 1280, lengthLimit = Infinity } = options;
    const img = await loadImageFromDataUrl(dataUrl);
    const width = img.width || 1;
    const height = img.height || 1;
    const longest = Math.max(width, height) || 1;
    const scale = longest > maxDimension ? maxDimension / longest : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas コンテキストを取得できませんでした。');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const qualities = [0.88, 0.8, 0.72, 0.66, 0.6, 0.55];
    let best = '';
    for (const quality of qualities) {
      const candidate = canvas.toDataURL('image/jpeg', quality);
      best = candidate;
      if (candidate.length <= lengthLimit) break;
    }
    return best;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('画像データの読み込みに失敗しました。'));
      };
      reader.onerror = () => reject(new Error('画像データの読み込みに失敗しました。'));
      reader.readAsDataURL(blob);
    });
  }

  async function readClipboardImages() {
    if (!navigator?.clipboard) {
      throw new Error('クリップボードへアクセスできません。ブラウザの設定を確認してください。');
    }
    if (typeof navigator.clipboard.read !== 'function') {
      throw new Error('クリップボードから画像を取得できません。ブラウザが対応していません。');
    }
    let items;
    try {
      items = await navigator.clipboard.read();
    } catch (err) {
      const message = err?.name === 'NotAllowedError'
        ? 'クリップボードへのアクセスが許可されていません。ブラウザの設定を確認してください。'
        : 'クリップボードから画像を読み取れませんでした。';
      throw new Error(message);
    }
    const results = [];
    for (const item of items || []) {
      if (!item?.types) continue;
      for (const type of item.types) {
        if (!type || !type.toLowerCase().startsWith('image/')) continue;
        let blob;
        try {
          blob = await item.getType(type);
        } catch (err) {
          console.warn('Failed to access clipboard item', err);
          continue;
        }
        if (!blob) continue;
        try {
          const dataUrl = await blobToDataUrl(blob);
          const optimized = await optimizeImageDataUrl({ size: blob.size }, dataUrl);
          results.push({
            dataUrl: optimized,
            name: `Clipboard Image ${results.length + 1}`
          });
        } catch (err) {
          console.warn('Failed to process clipboard image', err);
        }
      }
    }
    return results;
  }

  function joinFieldKey(parent, key) {
    if (!key) return parent || '';
    return parent ? `${parent}.${key}` : key;
  }

  function coerceNumberValue(value) {
    if (value === '' || value === null || value === undefined) {
      return { ok: false, value: undefined };
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? { ok: true, value } : { ok: false, value: undefined };
    }
    const num = Number(value);
    if (Number.isFinite(num)) {
      return { ok: true, value: num };
    }
    return { ok: false, value: undefined };
  }

  function assignNestedValue(target, path, value) {
    if (!path) return;
    const segments = path.split('.');
    let cursor = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      if (!Object.prototype.hasOwnProperty.call(cursor, segment) || typeof cursor[segment] !== 'object' || cursor[segment] === null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    cursor[segments[segments.length - 1]] = value;
  }

  function getNestedValue(source, path) {
    if (!path) return undefined;
    const segments = path.split('.');
    let cursor = source;
    for (const segment of segments) {
      if (cursor === null || cursor === undefined) return undefined;
      if (typeof cursor !== 'object') return undefined;
      cursor = cursor[segment];
    }
    return cursor;
  }

  function ensureHiddenStore(row) {
    if (!row?.state) return {};
    if (!row.state.hiddenValues || typeof row.state.hiddenValues !== 'object') {
      row.state.hiddenValues = {};
    }
    if (!(row.state.hiddenFieldKeys instanceof Set)) {
      row.state.hiddenFieldKeys = new Set();
    }
    return row.state.hiddenValues;
  }

  function resolveHiddenDefault(def, baseType, wantsNumber = false) {
    if (!def) return undefined;
    if (baseType === 'select' || baseType === 'selectcustomtext') {
      const options = Array.isArray(def.options) ? def.options : [];
      const chosen = options.find((opt) => opt?.default) || options[0];
      const candidates = [];
      if (chosen && chosen.value !== undefined) candidates.push(chosen.value);
      if (def.default !== undefined && def.default !== null) candidates.push(def.default);
      if (def.value !== undefined && def.value !== null) candidates.push(def.value);
      if (wantsNumber) {
        for (const candidate of candidates) {
          const result = coerceNumberValue(candidate);
          if (result.ok) return result.value;
        }
        return undefined;
      }
      for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) return String(candidate);
      }
      if (chosen && chosen.label !== undefined) return String(chosen.label);
      return undefined;
    }
    if (baseType === 'boolean') {
      if (typeof def.default === 'boolean') return def.default;
      if (typeof def.default === 'string') return def.default === 'true';
      if (typeof def.default === 'number') return def.default !== 0;
      return undefined;
    }
    if (baseType === 'number') {
      if (def.default !== undefined && def.default !== null) {
        const result = coerceNumberValue(def.default);
        if (result.ok) return result.value;
      }
      const options = Array.isArray(def.options) ? def.options : [];
      const chosen = options.find((opt) => opt?.default) || options[0];
      if (chosen && chosen.value !== undefined) {
        const result = coerceNumberValue(chosen.value);
        if (result.ok) return result.value;
      }
      return undefined;
    }
    if (baseType === 'singleimage' || baseType === 'multiimages' || baseType === 'multiimage') {
      return undefined;
    }
    if (wantsNumber) {
      const candidates = [];
      if (def.default !== undefined && def.default !== null) candidates.push(def.default);
      if (def.value !== undefined && def.value !== null) candidates.push(def.value);
      for (const candidate of candidates) {
        const result = coerceNumberValue(candidate);
        if (result.ok) return result.value;
      }
      return undefined;
    }
    if (def.default !== undefined && def.default !== null) {
      return String(def.default);
    }
    if (def.value !== undefined && def.value !== null) {
      return String(def.value);
    }
    return undefined;
  }

  function collectHiddenDefaults(row, def, parentKey = '', forceHidden = false) {
    if (!def || typeof def !== 'object') return;
    const key = def.key || def.type || '';
    const rawType = (def.type || 'text').toLowerCase();
    const baseType = rawType.replace(/[-_\s]/g, '');
    const keyPath = joinFieldKey(parentKey, key);
    const isContainer = rawType === 'container';
    const variableType = typeof def.variable_type === 'string' ? def.variable_type.toLowerCase() : '';
    const wantsNumber = variableType === 'number' || baseType === 'number';
    const hidden = forceHidden || def.hidden === true;

    if (isContainer) {
      const children = Array.isArray(def.contents) ? def.contents : [];
      children.forEach((child) => collectHiddenDefaults(row, child, keyPath, hidden));
    }

    if (!hidden || !keyPath || isContainer) return;

    const store = ensureHiddenStore(row);
    row.state.hiddenFieldKeys.add(keyPath);
    const value = resolveHiddenDefault(def, baseType, wantsNumber);
    if (value !== undefined) {
      assignNestedValue(store, keyPath, value);
    }
  }

  function mergeHiddenDefaults(target, source) {
    if (!source || typeof source !== 'object') return;
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!Object.prototype.hasOwnProperty.call(target, key) || typeof target[key] !== 'object' || target[key] === null || Array.isArray(target[key])) {
          target[key] = {};
        }
        mergeHiddenDefaults(target[key], value);
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(target, key)) {
        target[key] = value;
      }
    });
  }

  function flattenFieldDefs(defs, parentKey = '') {
    const result = [];
    (defs || []).forEach((def) => {
      if (!def || typeof def !== 'object') return;
      const key = def.key || def.type || '';
      const keyPath = key ? joinFieldKey(parentKey, key) : parentKey;
      const rawType = (def.type || '').toLowerCase();
      const isContainer = rawType === 'container';
      result.push({ key: keyPath, def, container: isContainer });
      if (isContainer) {
        const children = flattenFieldDefs(Array.isArray(def.contents) ? def.contents : [], keyPath);
        result.push(...children);
      }
    });
    return result;
  }

  function createImageField(row, def, mode, parentKey = '') {
    const key = def.key || def.type || 'image';
    const keyPath = joinFieldKey(parentKey, key);
    const limit = typeof def.max === 'number' && def.max > 0 ? def.max : null;
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-field toolbar-field--upload';
    // Add data-field-key to wrapper for querySelector to find it
    wrapper.dataset.fieldKey = keyPath;
    wrapper.dataset.fieldType = mode === 'multi' ? 'multiimages' : 'singleimage';

    const label = document.createElement('label');
    label.textContent = def.label || key;
    wrapper.appendChild(label);

    const dropzone = document.createElement('div');
    dropzone.className = 'image-dropzone';
    dropzone.tabIndex = 0;
    dropzone.dataset.fieldKey = keyPath;
    dropzone.dataset.fieldType = mode === 'multi' ? 'multiimages' : 'singleimage';
    dropzone.dataset.fieldLabel = def.label || key;
    if (def.optional) dropzone.dataset.optional = '1';
    if (limit) dropzone.dataset.maxCount = String(limit);

    const instructions = document.createElement('div');
    instructions.className = 'image-dropzone-instructions';
    instructions.textContent = mode === 'multi'
      ? `Drag & drop ${limit ? `up to ${limit} images` : 'images'}, or click to choose.`
      : 'Drag & drop an image, or click to choose.';
    dropzone.appendChild(instructions);

    const hint = document.createElement('div');
    hint.className = 'image-dropzone-hint';
    hint.textContent = 'Accepted formats: PNG, JPG, GIF, WebP.';
    dropzone.appendChild(hint);

    const actions = document.createElement('div');
    actions.className = 'image-dropzone-actions';
    const pasteButton = document.createElement('button');
    pasteButton.type = 'button';
    pasteButton.className = 'image-clipboard';
    pasteButton.innerHTML = '<span>クリップボードの画像を貼り付け</span>';
    if (typeof navigator?.clipboard?.read !== 'function') {
      pasteButton.disabled = true;
      pasteButton.title = 'ブラウザが画像の貼り付けに対応していません。';
    }
    actions.appendChild(pasteButton);
    dropzone.appendChild(actions);

    const previews = document.createElement('div');
    previews.className = 'image-previews';
    dropzone.appendChild(previews);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = mode === 'multi';
    fileInput.hidden = true;
    dropzone.appendChild(fileInput);

    wrapper.appendChild(dropzone);

    const normalizeSingle = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return { dataUrl: value, name: def.label || key };
      if (value?.dataUrl) {
        return {
          dataUrl: value.dataUrl,
          name: value.name || value.filename || def.label || key
        };
      }
      return null;
    };

    const normalizeMulti = (value) => {
      const list = Array.isArray(value) ? value : [];
      const items = [];
      list.forEach((entry, index) => {
        if (!entry) return;
        if (typeof entry === 'string') {
          items.push({ dataUrl: entry, name: `Image ${index + 1}` });
          return;
        }
        if (entry.dataUrl) {
          items.push({
            dataUrl: entry.dataUrl,
            name: entry.name || entry.filename || `Image ${index + 1}`
          });
        }
      });
      return items;
    };

    const setValue = (value) => {
      if (mode === 'multi') {
        dropzone.storyValue = normalizeMulti(value);
      } else {
        dropzone.storyValue = normalizeSingle(value);
      }
      updatePreview();
    };

    const updatePreview = () => {
      previews.innerHTML = '';
      if (mode === 'multi') {
        const items = Array.isArray(dropzone.storyValue) ? dropzone.storyValue : [];
        dropzone.classList.toggle('has-value', items.length > 0);
        items.forEach((item, index) => {
          if (!item?.dataUrl) return;
          const preview = document.createElement('div');
          preview.className = 'image-preview';
          const thumb = document.createElement('img');
          thumb.src = item.dataUrl;
          thumb.alt = item.name || `Image ${index + 1}`;
          preview.appendChild(thumb);
          const footer = document.createElement('div');
          footer.className = 'image-preview-footer';
          const nameEl = document.createElement('span');
          nameEl.textContent = item.name || `Image ${index + 1}`;
          footer.appendChild(nameEl);
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'image-remove';
          removeBtn.textContent = 'Remove';
          removeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const next = Array.isArray(dropzone.storyValue) ? dropzone.storyValue.slice() : [];
            next.splice(index, 1);
            dropzone.storyValue = next;
            updatePreview();
          });
          footer.appendChild(removeBtn);
          preview.appendChild(footer);
          previews.appendChild(preview);
        });
      } else {
        const item = dropzone.storyValue && dropzone.storyValue.dataUrl ? dropzone.storyValue : null;
        dropzone.classList.toggle('has-value', !!item);
        if (item) {
          const preview = document.createElement('div');
          preview.className = 'image-preview';
          const thumb = document.createElement('img');
          thumb.src = item.dataUrl;
          thumb.alt = item.name || 'Selected image';
          preview.appendChild(thumb);
          const footer = document.createElement('div');
          footer.className = 'image-preview-footer';
          const nameEl = document.createElement('span');
          nameEl.textContent = item.name || 'Selected image';
          footer.appendChild(nameEl);
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'image-remove';
          removeBtn.textContent = 'Remove';
          removeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            dropzone.storyValue = null;
            updatePreview();
          });
          footer.appendChild(removeBtn);
          preview.appendChild(footer);
          previews.appendChild(preview);
        }
      }
    };

    const handleFiles = async (fileList) => {
      const files = Array.from(fileList || []).filter(isImageLikeFile);
      if (!files.length) {
        setStatus(row, '画像ファイルを選択してください。', 'error', { duration: 2000 });
        return;
      }

      if (mode === 'single') {
        const file = files[0];
        try {
          const dataUrl = await readFileAsDataUrl(file);
          setValue({ dataUrl, name: file.name || file.type || 'Image' });
        } catch (err) {
          console.error('Failed to read image', err);
          setStatus(row, '画像の読み込みに失敗しました。', 'error', { duration: 2200 });
        }
        return;
      }

      const current = Array.isArray(dropzone.storyValue) ? dropzone.storyValue.slice() : [];
      const limitRemaining = limit ? Math.max(0, limit - current.length) : files.length;
      if (limit && limitRemaining <= 0) {
        setStatus(row, `画像は最大${limit}枚までです。`, 'error', { duration: 2200 });
        return;
      }

      const usable = limit ? files.slice(0, limitRemaining) : files;
      const additions = [];
      for (const file of usable) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          additions.push({ dataUrl, name: file.name || `Image ${current.length + additions.length + 1}` });
        } catch (err) {
          console.error('Failed to read image', err);
          setStatus(row, `画像「${file.name || 'unknown'}」の読み込みに失敗しました。`, 'error', { duration: 2200 });
        }
      }
      setValue(current.concat(additions));
      if (limit && files.length > usable.length) {
        setStatus(row, `画像は最大${limit}枚までです。`, 'error', { duration: 2200 });
      }
    };

    const applyClipboardImages = (images) => {
      if (!Array.isArray(images) || !images.length) {
        setStatus(row, 'クリップボードに画像が見つかりません。', 'error', { duration: 2000 });
        return false;
      }
      if (mode === 'single') {
        setValue(images[0]);
        return true;
      }
      const current = Array.isArray(dropzone.storyValue) ? dropzone.storyValue.slice() : [];
      const limitRemaining = limit ? Math.max(0, limit - current.length) : images.length;
      if (limit && limitRemaining <= 0) {
        setStatus(row, `画像は最大${limit}枚までです。`, 'error', { duration: 2200 });
        return false;
      }
      const additions = images.slice(0, limitRemaining).map((item, index) => ({
        dataUrl: item.dataUrl,
        name: item.name || `Clipboard ${current.length + index + 1}`
      }));
      if (!additions.length) return false;
      setValue(current.concat(additions));
      if (limit && images.length > limitRemaining) {
        setStatus(row, `画像は最大${limit}枚までです。`, 'error', { duration: 2200 });
      }
      return true;
    };

    const handleClipboardPaste = async () => {
      if (pasteButton.disabled) return;
      if (typeof navigator?.clipboard?.read !== 'function') {
        setStatus(row, 'クリップボードから画像を取得できません。ブラウザが対応していません。', 'error', { duration: 2600 });
        return;
      }
      pasteButton.disabled = true;
      dropzone.classList.add('is-loading');
      try {
        setStatus(row, 'クリップボードから画像を取得しています...', 'info');
        const images = await readClipboardImages();
        const applied = applyClipboardImages(images);
        if (applied) {
          setStatus(row, 'クリップボードから画像を貼り付けました。', 'success', { duration: 2000 });
        }
      } catch (err) {
        console.error('Failed to read clipboard image', err);
        const message = err?.message || 'クリップボードからの貼り付けに失敗しました。';
        setStatus(row, message, 'error', { duration: 2600 });
      } finally {
        dropzone.classList.remove('is-loading');
        pasteButton.disabled = typeof navigator?.clipboard?.read !== 'function';
      }
    };

    dropzone.storyValue = mode === 'multi' ? [] : null;
    dropzone.storySetValue = setValue;
    dropzone.storyGetValue = () => dropzone.storyValue;

    dropzone.addEventListener('dragenter', (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', (event) => {
      if (!dropzone.contains(event.relatedTarget)) {
        dropzone.classList.remove('is-dragover');
      }
    });
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragover');
      const files = event.dataTransfer?.files;
      if (files?.length) handleFiles(files);
    });
    dropzone.addEventListener('click', (event) => {
      if (event.target.closest('.image-remove') || event.target.closest('.image-clipboard')) return;
      fileInput.click();
    });
    dropzone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (event.target.closest('.image-clipboard')) {
          handleClipboardPaste();
        } else {
          fileInput.click();
        }
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length) handleFiles(fileInput.files);
      fileInput.value = '';
    });
    pasteButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleClipboardPaste();
    });

    // Expose setValue and getValue for restoring/collecting preserved values
    const getValue = () => dropzone.storyValue;
    dropzone.storySetValue = setValue;
    dropzone.storyGetValue = getValue;
    wrapper.storySetValue = setValue;
    wrapper.storyGetValue = getValue; // Also expose on wrapper for easier access

    return wrapper;
  }



function guessExtension(mime, fallback) {
  if (!mime || typeof mime !== 'string') return fallback;
  const lower = mime.toLowerCase();
  if (lower.includes('mp4')) return 'mp4';
  if (lower.includes('mov')) return 'mov';
  if (lower.includes('webm')) return 'webm';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'mp3';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('m4a')) return 'm4a';
  return fallback;
}

async function uploadFalMedia(row, meta, kind, apiKey, timeoutMs) {
  if (!meta?.file) {
    return { url: '', error: new Error('ファイルが見つかりません。') };
  }

  const label = kind === 'video' ? '動画' : '音声';
  const defaultExt = kind === 'video' ? 'mp4' : 'mp3';
  const filename = meta.name || `input.${guessExtension(meta.mime, defaultExt)}`;
  const mime = meta.mime || (kind === 'video' ? 'video/mp4' : 'audio/mpeg');
  const maxUploadSizeMb = 90;
  const sizeMb = meta.file.size / (1024 * 1024);
  if (sizeMb > maxUploadSizeMb) {
    return { url: '', error: new Error(`${label}が大きすぎます（約${sizeMb.toFixed(2)}MB）。${maxUploadSizeMb}MB以下にしてください。`) };
  }

  setStatus(row, `${label}をアップロードしています...`, 'info');

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
          file_name: filename
        }),
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, Math.max(timeoutMs, 40000));
    } catch (err) {
      console.error('[StoryBoard] FAL upload initiate failed', endpoint, err);
      throw new Error(`${label}のアップロード初期化に失敗しました。`);
    }

    if (!response.ok) {
      let message = `${label}のアップロード初期化に失敗しました (HTTP ${response.status})`;
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
      console.error('[StoryBoard] FAL upload initiate parse error', endpoint, err);
      throw new Error(`${label}のアップロードURLを取得できませんでした。`);
    }

    const uploadUrl = data?.upload_url || data?.uploadUrl;
    const fileUrl = data?.file_url || data?.fileUrl || data?.url;
    if (!uploadUrl || !fileUrl) {
      console.warn('[StoryBoard] FAL upload initiate missing fields', data);
      throw new Error(`${label}のアップロードURLを取得できませんでした。`);
    }

    let uploadResponse;
    try {
      uploadResponse = await fetchWithTimeout(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': mime
        },
        body: meta.file,
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, Math.max(timeoutMs, 90000));
    } catch (err) {
      console.error('[StoryBoard] FAL upload PUT failed', uploadUrl, err);
      throw new Error(`${label}のアップロード中にエラーが発生しました。`);
    }

    if (!uploadResponse.ok) {
      let message = `${label}のアップロードに失敗しました (HTTP ${uploadResponse.status})`;
      try {
        const text = await uploadResponse.text();
        if (text) message = text;
      } catch {}
      throw new Error(message);
    }

    setStatus(row, `${label}のアップロードが完了しました。`, 'success', { duration: 1600 });
    return { url: fileUrl, error: null };
  };

  let lastError = null;
  for (const endpoint of initiateEndpoints) {
    try {
      return await tryInitiateUpload(endpoint);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err || ''));
      console.warn('[StoryBoard] FAL upload initiate fallback', endpoint, lastError?.message);
    }
  }

  for (const endpoint of legacyFormEndpoints) {
    const form = new FormData();
    form.append('file', meta.file, filename);
    if (mime) form.append('content_type', mime);
    form.append('filename', filename);

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
      }, Math.max(timeoutMs, 60000));
    } catch (err) {
      console.error('[StoryBoard] FAL upload request failed', endpoint, err);
      lastError = new Error(`${label}のアップロードリクエストに失敗しました。`);
      continue;
    }

    let text = '';
    try { text = await response.text(); } catch {}

    if (!response.ok) {
      let message = `${label}のアップロードに失敗しました (HTTP ${response.status})`;
      if (text) {
        try {
          const data = JSON.parse(text);
          message = data?.error || data?.message || message;
        } catch {}
      }
      console.warn('[StoryBoard] FAL upload non-OK', endpoint, message);
      lastError = new Error(message);
      continue;
    }

    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch {}
    }
    const url = data?.url || data?.file_url || data?.fileUrl;
    if (url) {
      setStatus(row, `${label}のアップロードが完了しました。`, 'success', { duration: 1600 });
      return { url, error: null };
    }

    console.warn('[StoryBoard] FAL upload missing URL', endpoint, data);
    lastError = new Error(`${label}のアップロードURLを取得できませんでした。`);
  }

  return { url: '', error: lastError || new Error(`${label}のアップロードに失敗しました。`) };
}

function createMediaField(row, def, baseType, parentKey = '') {
  const key = def.key || def.type || (baseType === 'video' ? 'video' : 'audio');
  const keyPath = joinFieldKey(parentKey, key);
  const wrapper = document.createElement('div');
  wrapper.className = 'toolbar-field toolbar-field--media toolbar-field--upload';

  const label = document.createElement('label');
  label.className = 'toolbar-field-label';
  const textSpan = document.createElement('span');
  textSpan.className = 'toolbar-field-text';
  textSpan.textContent = def.label || key;
  label.appendChild(textSpan);
  wrapper.appendChild(label);

  const dropzone = document.createElement('div');
  dropzone.className = 'image-dropzone media-dropzone';
  dropzone.dataset.fieldKey = keyPath;
  dropzone.dataset.fieldType = baseType;
  dropzone.dataset.fieldLabel = def.label || key;
  dropzone.tabIndex = 0;
  if (def.optional) dropzone.dataset.optional = '1';

  const instructions = document.createElement('div');
  instructions.className = 'image-dropzone-instructions';
  instructions.textContent = baseType === 'video'
    ? 'Drag & drop a video, or click to choose.'
    : 'Drag & drop an audio file, or click to choose.';
  dropzone.appendChild(instructions);

  const hint = document.createElement('div');
  hint.className = 'image-dropzone-hint';
  hint.textContent = baseType === 'video'
    ? 'Accepted formats: MP4, MOV. Max ~100 MB.'
    : 'Accepted formats: MP3, WAV. Max ~20 MB.';
  dropzone.appendChild(hint);

  const actions = document.createElement('div');
  actions.className = 'image-dropzone-actions';
  const chooseBtn = document.createElement('button');
  chooseBtn.type = 'button';
  chooseBtn.className = 'image-clipboard media-picker';
  chooseBtn.innerHTML = `<span>${baseType === 'video' ? '動画ファイルを選択' : '音声ファイルを選択'}</span>`;
  actions.appendChild(chooseBtn);

  const fromOutputBtn = document.createElement('button');
  fromOutputBtn.type = 'button';
  fromOutputBtn.className = 'image-clipboard media-output-button';
  fromOutputBtn.innerHTML = '<span>出力ファイルから選ぶ</span>';
  actions.appendChild(fromOutputBtn);

  dropzone.appendChild(actions);

  const previews = document.createElement('div');
  previews.className = 'image-previews media-previews';
  dropzone.appendChild(previews);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = baseType === 'video' ? 'video/*' : 'audio/*';
  fileInput.hidden = true;
  dropzone.appendChild(fileInput);

  wrapper.appendChild(dropzone);

  const state = { base64: '', dataUrl: '', mime: '', name: '', file: null, objectUrl: '' };

  const updatePreview = () => {
    previews.innerHTML = '';
    const hasValue = !!state.base64;
    dropzone.classList.toggle('has-value', hasValue);
    if (!hasValue) return;

    const preview = document.createElement('div');
    preview.className = 'image-preview media-preview';

    const body = document.createElement('div');
    body.className = 'media-preview-body';
    const mediaUrl = state.objectUrl || state.dataUrl;
    if (baseType === 'video') {
      const videoEl = document.createElement('video');
      videoEl.src = mediaUrl;
      videoEl.controls = true;
      videoEl.playsInline = true;
      videoEl.preload = 'metadata';
      videoEl.muted = true;
      body.appendChild(videoEl);
    } else {
      const audioEl = document.createElement('audio');
      audioEl.src = mediaUrl;
      audioEl.controls = true;
      audioEl.preload = 'metadata';
      body.appendChild(audioEl);
    }
    preview.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'image-preview-footer';
    const nameEl = document.createElement('span');
    nameEl.textContent = state.name || (baseType === 'video' ? '選択した動画' : '選択した音声');
    footer.appendChild(nameEl);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'image-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetState();
    });
    footer.appendChild(removeBtn);
    preview.appendChild(footer);

    previews.appendChild(preview);
  };

  const resetState = () => {
    if (state.objectUrl && typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(state.objectUrl);
    }
    state.base64 = '';
    state.dataUrl = '';
    state.mime = '';
    state.name = '';
    state.file = null;
    state.objectUrl = '';
    fileInput.value = '';
    dropzone.classList.remove('is-loading');
    updatePreview();
    updateGenerateButtonState(row);
  };

  const toDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('ファイルの読込に失敗しました。'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error || new Error('ファイルの読込に失敗しました。'));
    reader.readAsDataURL(file);
  });

  const applyFile = async (file) => {
    if (!file) {
      resetState();
      return;
    }

    if (baseType === 'video' && file.type && !file.type.startsWith('video/')) {
      setStatus(row, '動画ファイルを選択してください。', 'error', { duration: 2200 });
      return;
    }
    if (baseType === 'audio' && file.type && !file.type.startsWith('audio/')) {
      setStatus(row, '音声ファイルを選択してください。', 'error', { duration: 2200 });
      return;
    }

    try {
      dropzone.classList.add('is-loading');
      const dataUrl = await toDataUrl(file);
      dropzone.classList.remove('is-loading');
      const parts = dataUrl.split(',');
      const base64 = parts.length > 1 ? parts[1] : parts[0];
      state.base64 = base64;
      state.dataUrl = dataUrl;
      state.mime = file.type || (baseType === 'video' ? 'video/mp4' : 'audio/mpeg');
      state.name = file.name || '';
      if (state.objectUrl && typeof URL?.revokeObjectURL === 'function') URL.revokeObjectURL(state.objectUrl);
      state.file = file;
      state.objectUrl = typeof URL?.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
      updatePreview();
      updateGenerateButtonState(row);
    } catch (err) {
      console.error('media read failed', err);
      dropzone.classList.remove('is-loading');
      resetState();
      setStatus(row, 'ファイルの読み込みに失敗しました。', 'error', { duration: 2200 });
    }
  };

  chooseBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    fileInput.click();
  });

  const applyOutputSelection = async (selection) => {
    const label = baseType === 'video' ? '動画' : '音声';
    dropzone.classList.add('is-loading');
    setStatus(row, `${label}を読み込んでいます...`, 'info');
    try {
      const media = await loadMediaOutputSelection(selection, baseType);
      if (!media?.dataUrl || !media?.blob) {
        throw new Error('出力ファイルを読み込めませんでした。');
      }
      const extension = guessExtensionFromMime(media.mime, baseType === 'video' ? 'mp4' : 'mp3');
      const jobLabel = selection?.rowSequence ? `ジョブ${selection.rowSequence}` : '選択したジョブ';
      const baseName = selection?.name || `${label}${selection?.rowSequence ? `_${selection.rowSequence}` : ''}`;
      const nameRoot = baseName
        ? baseName.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '')
        : '';
      const fallbackName = nameRoot || (baseType === 'video' ? 'output_video' : 'output_audio');
      const filename = `${fallbackName}.${extension}`;
      let fileBlob = media.blob;
      if (typeof File === 'function') {
        try {
          fileBlob = new File([media.blob], filename, { type: media.mime });
        } catch (err) {
          console.warn('File constructor failed, fallback to Blob', err);
          fileBlob = media.blob;
        }
      }
      dropzone.storySetValue({
        base64: media.base64,
        dataUrl: media.dataUrl,
        mime: media.mime,
        name: filename,
        file: fileBlob
      });
      setStatus(row, `${jobLabel}の${label}を取り込みました。`, 'success', { duration: 2200 });
    } catch (err) {
      console.error('Failed to import media from output', err);
      throw err instanceof Error ? err : new Error('出力ファイルの読み込みに失敗しました。');
    } finally {
      dropzone.classList.remove('is-loading');
    }
  };

  fromOutputBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openMediaOutputPicker(row, baseType, applyOutputSelection);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      resetState();
      return;
    }
    applyFile(file);
  });

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });

  dropzone.addEventListener('dragleave', (event) => {
    if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragover');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = event.dataTransfer?.files?.[0];
    applyFile(file || null);
  });

  dropzone.addEventListener('click', (event) => {
    if (event.target.closest('.image-remove') || event.target.closest('.image-clipboard')) return;
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  dropzone.storyGetValue = () => {
    if (!state.base64) return null;
    return {
      base64: state.base64,
      dataUrl: state.dataUrl,
      mime: state.mime,
      name: state.name
    };
  };

  dropzone.storySetValue = (value) => {
    if (!value) {
      resetState();
      return;
    }
    const base64 = value?.base64 || (typeof value === 'string' ? value : '');
    if (!base64) {
      resetState();
      return;
    }
    if (state.objectUrl && typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = '';
    }
    state.base64 = base64.startsWith('data:') ? base64.split(',').pop() || '' : base64;
    state.mime = value?.mime || (baseType === 'video' ? 'video/mp4' : 'audio/mpeg');
    state.name = value?.name || '';
    state.dataUrl = base64.startsWith('data:') ? base64 : `data:${state.mime};base64,${state.base64}`;
    state.file = value?.file instanceof Blob ? value.file : null;
    if (state.file instanceof Blob) {
      state.objectUrl = typeof URL?.createObjectURL === 'function' ? URL.createObjectURL(state.file) : '';
    }
    updatePreview();
    updateGenerateButtonState(row);
  };

  dropzone.storyGetMeta = () => {
    if (!state.file) return null;
    return {
      file: state.file,
      mime: state.mime,
      name: state.name,
      size: state.file.size || 0,
      type: baseType
    };
  };

  resetState();
  return wrapper;
}


  function createFieldElement(row, def, parentKey = '') {
    const key = def.key || def.type || 'field';
    const rawType = (def.type || 'text').toLowerCase();
    const baseType = rawType.replace(/[-_\s]/g, '');
    const variableTypeRaw = typeof def.variable_type === 'string' ? def.variable_type.toLowerCase().trim() : '';
    const variableType = variableTypeRaw === 'number' ? 'number' : (variableTypeRaw === 'string' ? 'string' : '');
    const keyPath = joinFieldKey(parentKey, key);
    if (def.hidden) {
      return null;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-field';

    if (baseType === 'singleimage') {
      return createImageField(row, def, 'single', parentKey);
    }
    if (baseType === 'multiimages' || baseType === 'multiimage') {
      return createImageField(row, def, 'multi', parentKey);
    }
    if (baseType === 'video' || baseType === 'audio') {
      return createMediaField(row, def, baseType, parentKey);
    }

    if (rawType === 'container') {
      wrapper.classList.add('toolbar-field--group');
      if (def.label) {
        const title = document.createElement('div');
        title.className = 'toolbar-group-title';
        title.textContent = def.label;
        wrapper.appendChild(title);
      }
      const group = document.createElement('div');
      group.className = 'toolbar-group-fields';
      const contents = Array.isArray(def.contents) ? def.contents : [];
      contents.forEach((childDef) => {
        try {
          const childEl = createFieldElement(row, childDef, keyPath);
          if (childEl) group.appendChild(childEl);
        } catch (err) {
          console.error('Failed to render nested storyboard field', childDef, err);
        }
      });
      wrapper.appendChild(group);
      return wrapper;
    }

    const labelText = def.label || key;

    if (rawType === 'boolean') {
      wrapper.classList.add('toolbar-field--toggle');
      const toggle = document.createElement('label');
      toggle.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.fieldKey = keyPath;
      input.dataset.fieldType = rawType;
      input.dataset.fieldLabel = labelText;
      if (def.optional) input.dataset.optional = '1';
      if (def.default === true) input.checked = true;
      const slider = document.createElement('span');
      slider.className = 'toggle-slider';
      slider.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 'toggle-text';
      text.textContent = labelText;
      toggle.appendChild(input);
      toggle.appendChild(text);
      toggle.appendChild(slider);
      wrapper.appendChild(toggle);
      return wrapper;
    }

    const label = document.createElement('label');
    label.className = 'toolbar-field-label';
    const textSpan = document.createElement('span');
    textSpan.className = 'toolbar-field-text';
    textSpan.textContent = labelText;
    label.appendChild(textSpan);

    const sanitizedKey = keyPath.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
    const inputId = `sb-${(row.id || 'row').toString().replace(/[^a-zA-Z0-9_-]/g, '-')}-${sanitizedKey || 'field'}`;
    const isTextLike = rawType === 'text' || rawType === 'textarea' || def.multiline === true;
    const explicitLimit = typeof def.maxLength === 'number'
      ? def.maxLength
      : typeof def.maxLength === 'string'
        ? Number(def.maxLength)
        : 0;
    const charLimit = Number.isFinite(explicitLimit) && explicitLimit > 0 ? Math.max(0, Math.floor(explicitLimit)) : 0;

    let input;
    let customInput = null;
    if (rawType === 'select' || rawType === 'selectcustomtext') {
      wrapper.classList.add('toolbar-field--select');
      input = document.createElement('select');
      const supportsCustom = rawType === 'selectcustomtext';
      let options = Array.isArray(def.options) ? def.options.slice() : [];
      const customLabel = def.customLabel || 'Custom';
      if (supportsCustom) {
        options = [{ label: customLabel, value: '__custom__' }, ...options];
      }
      const defaultValue = def.default !== undefined && def.default !== null ? String(def.default) : '';
      let anySelected = false;
      options.forEach((opt) => {
        const value = opt?.value !== undefined ? String(opt.value) : '';
        const optionEl = document.createElement('option');
        optionEl.value = value;
        optionEl.textContent = opt?.label ?? value;
        if (!anySelected) {
          if (defaultValue && value === defaultValue) {
            optionEl.selected = true;
            anySelected = true;
          } else if (opt?.default) {
            optionEl.selected = true;
            anySelected = true;
          }
        }
        input.appendChild(optionEl);
      });
      if (!anySelected) {
        if (defaultValue) {
          input.value = defaultValue;
        } else if (input.options.length) {
          input.selectedIndex = 0;
        }
      }
      if (supportsCustom) {
        input.dataset.allowCustom = '1';
        customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'toolbar-field-custom hidden';
        customInput.placeholder = def.customPlaceholder || 'カスタム値を入力';
        customInput.setAttribute('autocomplete', 'off');
        if (variableType) customInput.dataset.variableType = variableType;
        const ensureCustomState = () => {
          const isCustom = input.value === '__custom__';
          if (isCustom) {
            customInput.classList.remove('hidden');
            customInput.dataset.customFieldKey = keyPath;
            customInput.required = input.required && !def.optional;
            if (!customInput.value) {
              if (defaultValue && defaultValue !== '__custom__' && !Array.from(input.options).some((opt) => opt.value === defaultValue)) {
                customInput.value = defaultValue;
              } else if (def.customDefault !== undefined && def.customDefault !== null) {
                customInput.value = String(def.customDefault);
              }
            }
          } else {
            customInput.classList.add('hidden');
            delete customInput.dataset.customFieldKey;
            customInput.required = false;
          }
        };
        input.addEventListener('change', () => {
          ensureCustomState();
          updateGenerateButtonState(row);
        });
        customInput.addEventListener('input', () => updateGenerateButtonState(row));
        input.storySetValue = (value) => {
          const str = value !== undefined && value !== null ? String(value) : '';
          const hasOption = Array.from(input.options).some((opt) => opt.value === str && str !== '__custom__');
          if (hasOption) {
            input.value = str;
          } else if (str) {
            input.value = '__custom__';
            customInput.value = str === '__custom__' ? (customInput.value || '') : str;
          } else {
            const first = input.options[0]?.value ?? '';
            input.value = first;
            if (first !== '__custom__') customInput.value = '';
          }
          ensureCustomState();
        };
        if (defaultValue && !Array.from(input.options).some((opt) => opt.value === defaultValue) && defaultValue !== '__custom__') {
          input.value = '__custom__';
          customInput.value = defaultValue;
        }
        if (input.value === '__custom__' && !customInput.value && def.customDefault !== undefined && def.customDefault !== null) {
          customInput.value = String(def.customDefault);
        }
        ensureCustomState();
      }
    } else if (isTextLike) {
      input = document.createElement('textarea');
      const baseRows = Number(def.rows) || (def.multiline ? 4 : 3);
      const promptBias = /prompt/i.test(key) ? 4 : 0;
      input.rows = Math.max(baseRows, promptBias, 2);
      if (def.default !== undefined && def.default !== null) input.value = String(def.default);
    } else {
      input = document.createElement('input');
      input.type = rawType === 'number' ? 'number' : 'text';
      if (rawType === 'number') {
        if (typeof def.min === 'number') input.min = String(def.min);
        if (typeof def.max === 'number') input.max = String(def.max);
        if (typeof def.step === 'number') input.step = String(def.step);
      }
      if (def.default !== undefined && def.default !== null) input.value = String(def.default);
    }

    input.id = inputId;
    if (def.placeholder && input) input.placeholder = def.placeholder;
    if (def.required && input) input.required = true;

    input.dataset.fieldKey = keyPath;
    input.dataset.fieldType = rawType;
    input.dataset.fieldLabel = labelText;
    if (def.optional) input.dataset.optional = '1';
    if (variableType) input.dataset.variableType = variableType;

    if (isTextLike) {
      wrapper.classList.add('toolbar-field--stacked', 'toolbar-field--text');
      label.htmlFor = inputId;
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      if (charLimit > 0) {
        const counter = document.createElement('div');
        counter.className = 'toolbar-field-counter';
        wrapper.appendChild(counter);
        registerTextField(row, input, charLimit, counter);
      } else {
        updateGenerateButtonState(row);
      }
    } else {
      label.appendChild(input);
      wrapper.appendChild(label);
      if (customInput) wrapper.appendChild(customInput);
    }
    if (!isTextLike) updateGenerateButtonState(row);
    return wrapper;
  }

  function updateReferenceInfo(row, entry) {
    const wrapper = row?.elements?.referenceWrapper;
    if (!wrapper) return;
    const linkEl = row.elements.referenceLink;
    const notesEl = row.elements.referenceNotes;
    const refUrl = typeof entry?.reference === 'string' ? entry.reference.trim() : '';
    const refLabelRaw = typeof entry?.referenceLabel === 'string' ? entry.referenceLabel.trim() : '';
    const refLabel = refLabelRaw || '詳細なリファレンスはこちら';
    const notes = Array.isArray(entry?.referenceNotes)
      ? entry.referenceNotes.filter((note) => typeof note === 'string' && note.trim())
      : [];
    const hasLink = !!refUrl;
    const hasNotes = notes.length > 0;

    if (linkEl) {
      if (hasLink) {
        linkEl.href = refUrl;
        linkEl.textContent = refLabel;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener';
        linkEl.hidden = false;
      } else {
        linkEl.textContent = refLabel;
        linkEl.removeAttribute('href');
        linkEl.hidden = true;
      }
    }

    if (notesEl) {
      notesEl.innerHTML = '';
      if (hasNotes) {
        const frag = document.createDocumentFragment();
        notes.forEach((textItem) => {
          const item = document.createElement('li');
          item.textContent = textItem;
          frag.appendChild(item);
        });
        notesEl.appendChild(frag);
        notesEl.hidden = false;
      } else {
        notesEl.hidden = true;
      }
    }

    wrapper.hidden = !hasLink && !hasNotes;
  }

  function deriveRequestPage(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const raw = typeof entry.request_page === 'string' ? entry.request_page.trim() : '';
    if (raw) return raw;
    const provider = (entry.provider || '').toLowerCase();
    const reference = typeof entry.reference === 'string' ? entry.reference.trim() : '';
    if (!reference) return '';
    if (provider === 'fal') {
      const replaced = reference.replace(/\/?api(?:\/?$)/, '/requests');
      if (replaced && replaced !== reference) return replaced;
      return reference.endsWith('/') ? `${reference}requests` : `${reference}/requests`;
    }
    return '';
  }

  function updateRequestButton(row, entry) {
    const wrapper = row?.elements?.requestWrapper;
    const btn = row?.elements?.requestBtn;
    if (!wrapper || !btn) return;
    const url = deriveRequestPage(entry);
    row.state.requestPageUrl = url || '';
    if (url) {
      btn.disabled = false;
      btn.dataset.url = url;
      wrapper.hidden = false;
    } else {
      btn.disabled = true;
      delete btn.dataset.url;
      wrapper.hidden = true;
    }
  }

  function preserveCommonFields(row) {
    // Preserve common fields that work across models
    const params = collectParameters(row);
    const preserved = {
      prompt: params.prompt || '',
      binaryInputs: new Map(row.state.binaryInputs || [])
    };

    // Preserve all image field variations (based on models_sb.json)
    const imageFields = [
      'image_url',          // Most common single image field
      'start_image_url',    // Video-to-video models
      'end_image_url',      // Video-to-video models (optional)
      'image_urls',         // Multi-image fields
      'reference_image_urls' // Reference images
    ];
    imageFields.forEach(key => {
      if (params[key] !== undefined) {
        preserved[key] = params[key];
      }
    });

    // Preserve video and audio
    if (params.video_url !== undefined) preserved.video_url = params.video_url;
    if (params.audio_url !== undefined) preserved.audio_url = params.audio_url;

    // Preserve elements (reference_image_urls, frontal_image_url)
    if (params.elements) {
      preserved.elements = params.elements;
    }

    return preserved;
  }

  function restorePreservedFields(row, preserved) {
    if (!preserved) return;

    const container = row.elements.fieldsContainer;
    if (!container) return;

    // Restore binary inputs (video/audio files)
    if (preserved.binaryInputs instanceof Map) {
      row.state.binaryInputs = new Map(preserved.binaryInputs);
    }

    // Restore text prompt
    if (preserved.prompt) {
      const promptInput = container.querySelector('[data-field-key="prompt"]');
      if (promptInput) promptInput.value = preserved.prompt;
    }

    // Collect all preserved image data (single image fields only, not arrays)
    const preservedImageData = [];
    const singleImageFieldKeys = [
      'image_url',
      'start_image_url',
      'end_image_url'
    ];
    singleImageFieldKeys.forEach(key => {
      if (preserved[key]) {
        preservedImageData.push({ key, value: preserved[key] });
      }
    });

    // Find all available image fields in the new model (avoid duplicates by using wrapper)
    const allFieldElements = container.querySelectorAll('[data-field-key]');
    const availableImageFields = [];
    const seenKeys = new Set();
    allFieldElements.forEach(el => {
      const key = el.dataset.fieldKey;
      const fieldType = el.dataset.fieldType;
      // Only include single image fields, and only once per key (wrapper)
      if ((fieldType === 'singleimage') && !seenKeys.has(key) && el.tagName === 'DIV' && el.classList.contains('toolbar-field')) {
        availableImageFields.push({ key, element: el });
        seenKeys.add(key);
      }
    });


    // Strategy: Map preserved images to available fields
    // If old model had image_url and new model has start_image_url, use start_image_url
    if (preservedImageData.length > 0) {
      preservedImageData.forEach((preserved, idx) => {
        // Try to restore to same field name first
        let targetField = availableImageFields.find(f => f.key === preserved.key);

        // If not found, use the first available single image field
        if (!targetField && idx < availableImageFields.length) {
          targetField = availableImageFields[idx];
        }

        if (targetField && typeof targetField.element.storySetValue === 'function') {
          targetField.element.storySetValue(preserved.value);
        } else if (!targetField) {
          // No single image field available, try multi-image fields (stored later in multiImageData processing)
          // Add to a temporary list for fallback
          if (!preserved._triedMultiFallback) {
            preserved._triedMultiFallback = true;
            const availableMulti = [];
            allFieldElements.forEach(el => {
              const key = el.dataset.fieldKey;
              const fieldType = el.dataset.fieldType;
              if (fieldType === 'multiimages' && el.tagName === 'DIV' && el.classList.contains('toolbar-field')) {
                if (!availableMulti.find(f => f.key === key)) {
                  availableMulti.push({ key, element: el });
                }
              }
            });
            if (availableMulti.length > 0) {
              const multiField = availableMulti[0];
              multiField.element.storySetValue([preserved.value]);
            }
          }
        }
      });
    }

    // Restore multi-image arrays
    // Try to restore to same field name first, then fall back to any available multi-image field
    const multiImageData = [];
    if (Array.isArray(preserved.image_urls) && preserved.image_urls.length > 0) {
      multiImageData.push({ key: 'image_urls', value: preserved.image_urls });
    }
    if (Array.isArray(preserved.reference_image_urls) && preserved.reference_image_urls.length > 0) {
      multiImageData.push({ key: 'reference_image_urls', value: preserved.reference_image_urls });
    }


    if (multiImageData.length > 0) {
      // Find available multi-image fields in new model
      const availableMultiFields = [];
      const seenMultiKeys = new Set();
      allFieldElements.forEach(el => {
        const key = el.dataset.fieldKey;
        const fieldType = el.dataset.fieldType;
        if (fieldType === 'multiimages' && !seenMultiKeys.has(key) && el.tagName === 'DIV' && el.classList.contains('toolbar-field')) {
          availableMultiFields.push({ key, element: el });
          seenMultiKeys.add(key);
        }
      });


      multiImageData.forEach((preserved, idx) => {
        // Try exact match first
        let targetField = availableMultiFields.find(f => f.key === preserved.key);
        // Fall back to first available multi-image field
        if (!targetField && idx < availableMultiFields.length) {
          targetField = availableMultiFields[idx];
        }

        if (targetField && typeof targetField.element.storySetValue === 'function') {
          targetField.element.storySetValue(preserved.value);
        } else if (!targetField && availableImageFields.length > 0) {
          // If no multi-image field available, use first single image field with first image
          const firstImage = preserved.value[0];
          if (firstImage) {
            const singleField = availableImageFields[0];
            singleField.element.storySetValue(firstImage);
          }
        }
      });
    }

    // Restore video_url and audio_url
    if (preserved.video_url) {
      const input = container.querySelector('[data-field-key="video_url"]');
      if (input) input.value = preserved.video_url;
    }
    if (preserved.audio_url) {
      const input = container.querySelector('[data-field-key="audio_url"]');
      if (input) input.value = preserved.audio_url;
    }

    // Restore elements (image arrays within elements)
    if (preserved.elements) {
      if (Array.isArray(preserved.elements.reference_image_urls) && preserved.elements.reference_image_urls.length > 0) {
        const dropzone = container.querySelector('[data-field-key="elements.reference_image_urls"]');
        if (dropzone && typeof dropzone.storySetValue === 'function') {
          dropzone.storySetValue(preserved.elements.reference_image_urls);
        }
      }
      if (preserved.elements.frontal_image_url) {
        const dropzone = container.querySelector('[data-field-key="elements.frontal_image_url"]');
        if (dropzone && typeof dropzone.storySetValue === 'function') {
          dropzone.storySetValue(preserved.elements.frontal_image_url);
        }
      }
    }
  }

  function renderFields(row) {
    const container = row.elements.fieldsContainer;
    if (!container) return;
    container.innerHTML = '';
    row.state.missingFields = [];
    row.state.hiddenValues = {};
    row.state.hiddenFieldKeys = new Set();
    row.state.fieldCounters = new Map();
    row.state.binaryInputs = new Map();
    const select = row.elements.modelSelect;
    const entry = storyboardModels.length ? findModelByValue(select?.value || '') : null;
    updateReferenceInfo(row, entry);
    updateRequestButton(row, entry);
    setRowOutputType(row, entry?.output || 'video');
    if (!storyboardModels.length) {
      updateGenerateButtonState(row);
      return;
    }
    const fields = Array.isArray(entry?.inputs)
      ? entry.inputs
      : Array.isArray(entry?.prompt)
        ? entry.prompt
        : [];
    fields.forEach((def) => {
      try {
        collectHiddenDefaults(row, def, '');
        const fieldEl = createFieldElement(row, def, '');
        if (fieldEl) container.appendChild(fieldEl);
      } catch (err) {
        console.error('Failed to render storyboard field', def, err);
      }
    });
    updateGenerateButtonState(row);
  }

  function collectParameters(row) {
    const container = row.elements.fieldsContainer;
    const params = {};
    const missing = [];
    if (!container) {
      row.state.missingFields = [];
      return params;
    }
    container.querySelectorAll('[data-field-key]').forEach((el) => {
      const keyPath = el.dataset.fieldKey;
      if (!keyPath) return;
      const type = (el.dataset.fieldType || '').toLowerCase();
      const label = el.dataset.fieldLabel || keyPath;
      const optional = el.dataset.optional === '1';
      const variableType = (el.dataset.variableType || '').toLowerCase();
      const wantsNumber = variableType === 'number';

      if (type === 'container') {
        return;
      }

      if (type === 'boolean') {
        assignNestedValue(params, keyPath, !!el.checked);
        return;
      }

      if (type === 'selectcustomtext') {
        const value = (el.value || '').trim();
        const isCustom = value === '__custom__';
        if (isCustom) {
          let customInput = null;
          if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            try { customInput = container.querySelector(`[data-custom-field-key='${CSS.escape(keyPath)}']`); } catch {}
          }
          if (!customInput) {
            const candidates = Array.from(container.querySelectorAll('[data-custom-field-key]'));
            customInput = candidates.find((node) => node.dataset.customFieldKey === keyPath) || null;
          }
          const customValue = (customInput?.value || '').trim();
          if (!customValue) {
            if (!optional && (customInput?.required || el.required)) missing.push(label);
            return;
          }
          let finalValue = customValue;
          if (wantsNumber) {
            const result = coerceNumberValue(customValue);
            if (!result.ok) {
              if (!optional && (customInput?.required || el.required)) missing.push(label);
              return;
            }
            finalValue = result.value;
          }
          assignNestedValue(params, keyPath, finalValue);
        } else if (value) {
          let finalValue = value;
          if (wantsNumber) {
            const result = coerceNumberValue(value);
            if (!result.ok) {
              if (!optional && el.required) missing.push(label);
              return;
            }
            finalValue = result.value;
          }
          assignNestedValue(params, keyPath, finalValue);
        } else if (!optional && el.required) {
          missing.push(label);
        }
        return;
      }

      if (type === 'select') {
        const rawValue = (el.value || '').trim();
        if (rawValue === '') {
          if (!optional && el.required) missing.push(label);
          return;
        }
        if (wantsNumber) {
          const result = coerceNumberValue(rawValue);
          if (!result.ok) {
            if (!optional && el.required) missing.push(label);
            return;
          }
          assignNestedValue(params, keyPath, result.value);
          return;
        }
        assignNestedValue(params, keyPath, rawValue);
        return;
      }

      if (type === 'singleimage' || type === 'singleimages') {
        const value = typeof el.storyGetValue === 'function' ? el.storyGetValue() : el.storyValue;
        const dataUrl = value?.dataUrl || (typeof value === 'string' ? value : '');
        if (dataUrl) assignNestedValue(params, keyPath, dataUrl);
        else if (!optional) missing.push(label);
        return;
      }

      if (type === 'multiimages' || type === 'multiimage') {
        const raw = typeof el.storyGetValue === 'function' ? el.storyGetValue() : el.storyValue;
        const list = Array.isArray(raw) ? raw : [];
        const data = list
          .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (item.dataUrl) return item.dataUrl;
            return '';
          })
          .filter(Boolean);
        if (data.length) assignNestedValue(params, keyPath, data);
        else if (!optional) missing.push(label);
        return;
      }

      if (type === 'video' || type === 'audio') {
        const meta = typeof el.storyGetMeta === 'function' ? el.storyGetMeta() : null;
        const binaryStore = row.state.binaryInputs instanceof Map ? row.state.binaryInputs : null;
        if (meta?.file instanceof Blob) {
          if (binaryStore) binaryStore.set(keyPath, { ...meta });
        } else if (binaryStore && binaryStore.has(keyPath)) {
          binaryStore.delete(keyPath);
        }
        const hasBinaryFile = meta?.file instanceof Blob;
        const value = typeof el.storyGetValue === 'function' ? el.storyGetValue() : el.storyValue;
        const rawBase64 = value?.base64 || (typeof value === 'string' ? value : '');
        const base64 = hasBinaryFile ? '' : rawBase64;
        if (base64) {
          const mime = value?.mime || (type === 'video' ? 'video/mp4' : 'audio/mpeg');
          const payloadValue = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
          assignNestedValue(params, keyPath, payloadValue);
        } else if (hasBinaryFile) {
          assignNestedValue(params, keyPath, null);
        } else if (!optional) {
          missing.push(label);
        }
        return;
      }

      if (type === 'number') {
        const value = el.value;
        if (value === '' || value === null || Number.isNaN(Number(value))) {
          if (!optional && el.required) missing.push(label);
          return;
        }
        assignNestedValue(params, keyPath, Number(value));
        return;
      }

      const value = (el.value || '').trim();
      if (value === '') {
        if (!optional && el.required) missing.push(label);
        return;
      }
      if (wantsNumber) {
        const result = coerceNumberValue(value);
        if (!result.ok) {
          if (!optional && el.required) missing.push(label);
          return;
        }
        assignNestedValue(params, keyPath, result.value);
        return;
      }
      assignNestedValue(params, keyPath, value);
    });
    const hiddenDefaults = row.state.hiddenValues;
    if (hiddenDefaults && typeof hiddenDefaults === 'object') {
      mergeHiddenDefaults(params, hiddenDefaults);
    }
    row.state.missingFields = missing;
    return params;
  }

  function applyParameters(row, params) {
    if (!params || typeof params !== 'object') return;
    const container = row.elements.fieldsContainer;
    if (!container) return;
    const entries = [];
    const visit = (value, path) => {
      if (!path) return;
      if (value === null || value === undefined) {
        entries.push([path, value]);
        return;
      }
      if (Array.isArray(value)) {
        entries.push([path, value]);
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([childKey, childValue]) => {
          const next = joinFieldKey(path, childKey);
          visit(childValue, next);
        });
        return;
      }
      entries.push([path, value]);
    };
    Object.entries(params).forEach(([rootKey, rootValue]) => {
      visit(rootValue, rootKey);
    });

    const fields = Array.from(container.querySelectorAll('[data-field-key]'));

    entries.forEach(([keyPath, value]) => {
      if (!keyPath) return;
      const field = fields.find((el) => el.dataset.fieldKey === keyPath);
      if (!field) return;
      const type = (field.dataset.fieldType || '').toLowerCase();
      if (type === 'boolean') {
        field.checked = !!value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (type === 'singleimage' || type === 'singleimages' || type === 'multiimages' || type === 'multiimage') {
        if (typeof field.storySetValue === 'function') {
          field.storySetValue(value);
        }
        return;
      }
      const stringValue = value !== undefined && value !== null ? String(value) : '';
      if (field.tagName === 'SELECT') {
        if (typeof field.storySetValue === 'function') field.storySetValue(stringValue);
        else field.value = stringValue;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (type === 'number') {
        field.value = stringValue;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
      field.value = stringValue;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });

    ensureHiddenStore(row);
    if (row.state.hiddenFieldKeys instanceof Set && row.state.hiddenFieldKeys.size) {
      row.state.hiddenFieldKeys.forEach((path) => {
        if (!path) return;
        const hiddenValue = getNestedValue(params, path);
        if (hiddenValue !== undefined) assignNestedValue(row.state.hiddenValues, path, hiddenValue);
      });
    }
  }

  function buildPayload(params) {
    return { ...params };
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer || 0);
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function pollFalQueue(row, endpoint, requestId, apiKey, timeoutMs, onUpdate, extraUrls, logsBase, outputType) {
    const started = Date.now();
    let lastProgress = started;
    let lastStatus = '';
    const base = endpoint.replace(/\/?$/, '');
    const builders = [
      (id) => `${base}/${id}`,
      (id) => `${base}/${id}/status`,
      (id) => `${base}/${id}/result`,
      (id) => `${base}/requests/${id}`,
      (id) => `${base}/requests/${id}/status`,
      (id) => `${base}/requests/${id}/result`
    ];

    let origin = '';
    let encodedPath = '';
    try {
      const urlObj = new URL(endpoint);
      origin = urlObj.origin;
      const normalizedPath = urlObj.pathname.replace(/(^\/|\/$)/g, '');
      if (normalizedPath) {
        encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
        builders.push((id) => `${origin}/v1/queues/${encodedPath}/requests/${id}`);
        builders.push((id) => `${origin}/v1/history/${encodedPath}/${id}`);
      }
      builders.push((id) => `${origin}/v1/requests/${id}`);
    } catch {}

    const extras = new Set(extraUrls || []);
    const seedExtras = [
      `${base}/${requestId}/status`,
      `${base}/${requestId}/result`,
      `${base}/requests/${requestId}`,
      `${base}/requests/${requestId}/status`,
      `${base}/requests/${requestId}/result`
    ];
    seedExtras.forEach((url) => extras.add(url));
    if (origin) extras.add(`${origin}/v1/requests/${requestId}`);
    if (origin && encodedPath) {
      extras.add(`${origin}/v1/queues/${encodedPath}/requests/${requestId}`);
      extras.add(`${origin}/v1/history/${encodedPath}/${requestId}`);
    }

    let logs = Array.isArray(logsBase) ? logsBase.slice() : [];
    const updateProgress = () => { lastProgress = Date.now(); };
    const addExtraUrl = (value) => {
      if (typeof value === 'string' && value.startsWith('http')) extras.add(value);
    };

    const absoluteDeadline = started + timeoutMs;

    const tryFetch = async (targetUrl) => {
      if (!targetUrl) return null;
      const now = Date.now();
      const remaining = Math.max(0, absoluteDeadline - now);
      const fetchWindow = Math.min(15000, Math.max(5000, remaining || 5000));
      let res;
      try {
        res = await fetchWithTimeout(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Accept': 'application/json'
          },
          referrerPolicy: 'no-referrer',
          credentials: 'omit'
        }, fetchWindow);
      } catch (err) {
        if (err?.name === 'AbortError') return null;
        throw err;
      }
      if (!res.ok) {
        if (res.status === 404 || res.status === 401 || res.status === 403 || res.status === 405) return null;
        return null;
      }
      const text = await res.text();
      if (!text) return null;
      let data;
      try { data = JSON.parse(text); }
      catch { return null; }

      if (typeof onUpdate === 'function' && row.state.isGenerating) onUpdate(data);
      updateProgress();

      const info = extractStoryboardResult(outputType, data);
      const before = logs.length;
      logs = mergeLogs(logs, info.logs);
      if (logs.length !== before) updateProgress();
      if (Array.isArray(info?.extraUrls)) info.extraUrls.forEach(addExtraUrl);

      const status = info.status || getStatusString(data);
      if (status) {
        const normalized = status.toUpperCase();
        if (normalized.includes('FAILED') || normalized.includes('CANCEL')) {
          throw new Error(`FALリクエストが失敗しました (${status})`);
        }
        if (status !== lastStatus) {
          lastStatus = status;
          updateProgress();
        }
      }

      const statusDone = info?.status ? statusIndicatesSuccess(info.status) : false;
      if (info.ready && (!info.status || statusDone)) return { info, logs };
      return null;
    };

    while (true) {
      if (row.state.isCanceled) throw new Error('キャンセルしました');
      let result = null;
      for (const build of builders) {
        if (row.state.isCanceled) throw new Error('キャンセルしました');
        try {
          result = await tryFetch(build(requestId));
          if (result) return result;
        } catch (err) {
          if (err?.name === 'AbortError') continue;
          throw err;
        }
      }

      for (const url of Array.from(extras)) {
        if (row.state.isCanceled) throw new Error('キャンセルしました');
        try {
          result = await tryFetch(url);
          if (result) return result;
        } catch (err) {
          if (err?.name === 'AbortError') continue;
          throw err;
        }
      }

      const now = Date.now();
      const inactivityLimit = Math.min(timeoutMs, 60000);
      if (now - lastProgress > inactivityLimit) {
        const idleSec = Math.round((now - lastProgress) / 1000);
        throw new Error(`FALレスポンスが${idleSec}秒間更新されませんでした。`);
      }
      if (now >= absoluteDeadline) {
        const seconds = Math.round(timeoutMs / 1000);
        throw new Error(`生成がタイムアウトしました（${seconds}秒を超えました）。`);
      }

      await sleep(1200);
    }
  }

  async function runProviderModel(row, entry, params, apiKey) {
    let endpoint = (entry?.endpoint || '').trim();
    if (!endpoint) throw new Error('モデルのエンドポイントが設定されていません。');
    const provider = (entry?.provider || '').toLowerCase();
    const timeoutMs = Math.max(Number(entry?.timeoutSec || 90) * 1000, 10000);
    const payload = buildPayload(params);

    const binaryStore = row.state.binaryInputs instanceof Map ? row.state.binaryInputs : null;
    let videoBinary = binaryStore?.get('video_url') || null;
    let audioBinary = binaryStore?.get('audio_url') || null;

    // Upload video, audio, and images to FAL CDN for all FAL models
    if (provider === 'fal') {
      if (videoBinary?.file instanceof Blob) {
        const result = await uploadFalMedia(row, videoBinary, 'video', apiKey, timeoutMs);
        if (result?.url) {
          payload.video_url = result.url;
          if (binaryStore) binaryStore.delete('video_url');
          videoBinary = null;
        } else {
          throw new Error(result?.error?.message || '動画のアップロードに失敗しました。');
        }
      }

      if (audioBinary?.file instanceof Blob) {
        const result = await uploadFalMedia(row, audioBinary, 'audio', apiKey, timeoutMs);
        if (result?.url) {
          payload.audio_url = result.url;
          if (binaryStore) binaryStore.delete('audio_url');
          audioBinary = null;
        } else {
          throw new Error(result?.error?.message || '音声のアップロードに失敗しました。');
        }
      }

      // Upload all Base64 image data URIs to FAL CDN
      const uploadImageField = async (key, value) => {
        if (typeof value !== 'string' || !value.startsWith('data:image/')) return value;
        try {
          // Convert data URI to Blob
          const response = await fetch(value);
          const blob = await response.blob();
          const ext = blob.type.includes('png') ? 'png' : 'jpg';
          const meta = {
            file: blob,
            mime: blob.type,
            name: `${key}.${ext}`
          };
          const result = await uploadFalMedia(row, meta, 'video', apiKey, timeoutMs);
          if (result?.url) {
            return result.url;
          } else {
            console.warn(`[StoryBoard] Failed to upload image for ${key}, keeping Base64`);
            return value;
          }
        } catch (err) {
          console.warn(`[StoryBoard] Error uploading image for ${key}:`, err);
          return value;
        }
      };

      // Process single image fields
      for (const key of ['start_image_url', 'end_image_url', 'image_url']) {
        if (payload[key]) {
          payload[key] = await uploadImageField(key, payload[key]);
        }
      }

      // Process array image fields
      if (Array.isArray(payload.image_urls)) {
        payload.image_urls = await Promise.all(
          payload.image_urls.map((url, idx) => uploadImageField(`image_${idx}`, url))
        );
      }

      // Process elements field (contains reference_image_urls and frontal_image_url)
      if (payload.elements) {
        if (Array.isArray(payload.elements.reference_image_urls)) {
          payload.elements.reference_image_urls = await Promise.all(
            payload.elements.reference_image_urls.map((url, idx) => uploadImageField(`element_ref_${idx}`, url))
          );
        }
        if (payload.elements.frontal_image_url) {
          payload.elements.frontal_image_url = await uploadImageField('element_frontal', payload.elements.frontal_image_url);
        }
      }
    }
    if (row.state.isCanceled) throw new Error('キャンセルしました');
    const outputType = normalizeOutputType(entry?.output || row.state.outputType);
    setRowOutputType(row, outputType);

    if (provider === 'elevenlabs') {
      const rawVoiceId = params?.voice_id || params?.voiceId || '';
      const voiceId = typeof rawVoiceId === 'string' ? rawVoiceId.trim() : String(rawVoiceId || '').trim();
      if (endpoint.includes('{voice_id}')) {
        if (!voiceId) throw new Error('voice_id を選択してください。');
        endpoint = endpoint.replace('{voice_id}', encodeURIComponent(voiceId));
      }
      delete payload.voice_id;
      delete payload.voiceId;
      if (!payload.output_format) payload.output_format = 'mp3_44100_128';
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg, application/json'
        },
        body: JSON.stringify(payload),
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      }, timeoutMs);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              errorMessage = data?.detail?.message || data?.error || data?.message || errorMessage;
            } catch {
              errorMessage = text;
            }
          }
        } catch {}
        throw new Error(errorMessage || 'リクエストに失敗しました。');
      }

      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const mime = 'audio/mpeg';
      const fakeData = {
        audio: {
          dataUrl: `data:${mime};base64,${base64}`,
          mime,
          filename: `elevenlabs_${Date.now()}.mp3`
        },
        status: 'completed'
      };
      const info = extractAudioInfo(fakeData);
      info.ready = info.audios.length > 0;
      return { info, logs: [] };
    }

    const useQueue = /queue\.fal\.run/i.test(endpoint);
    const useFormData = useQueue && ((videoBinary && videoBinary.file instanceof Blob) || (audioBinary && audioBinary.file instanceof Blob));
    let requestInit;
    if (useFormData) {
      const form = new FormData();
      const appendFile = (meta, fieldBase) => {
        if (!meta?.file) return;
        const fallbackName = fieldBase === 'video' ? `input.${guessExtension(meta.mime, 'mp4')}` : `input.${guessExtension(meta.mime, 'mp3')}`;
        const filename = meta.name || fallbackName;
        form.append(`${fieldBase}_file`, meta.file, filename);
        form.append(`${fieldBase}_filename`, filename);
        if (meta.mime) form.append(`${fieldBase}_mime`, meta.mime);
      };
      appendFile(videoBinary, 'video');
      appendFile(audioBinary, 'audio');
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'video_url') return;
        if (key === 'audio_url') return;
        if (value === undefined || value === null) return;
        if (typeof value === 'object') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, String(value));
        }
      });
      requestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`
        },
        body: form,
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      };
    } else {
      const cleanPayload = { ...payload };
      Object.keys(cleanPayload).forEach((key) => {
        if (cleanPayload[key] === null || cleanPayload[key] === undefined) {
          delete cleanPayload[key];
        }
      });
      const body = useQueue ? cleanPayload : { input: cleanPayload };
      requestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        referrerPolicy: 'no-referrer',
        credentials: 'omit'
      };
    }

    const response = await fetchWithTimeout(endpoint, requestInit, timeoutMs);

    const raw = await response.text();
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const data = raw ? JSON.parse(raw) : {};
        errorMessage = data?.error?.message || data?.error || data?.message || errorMessage;
      } catch {}
      throw new Error(errorMessage || 'リクエストに失敗しました。');
    }

    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { throw new Error('レスポンスの解析に失敗しました。'); }

    if (row.state.isGenerating) handleUpdate(row, data);
    if (row.state.isCanceled) throw new Error('キャンセルしました');

    const info = extractStoryboardResult(outputType, data);
    const statusDone = info?.status ? statusIndicatesSuccess(info.status) : false;
    if (info.ready && (!info.status || statusDone)) return { info, logs: info.logs };

    const requestId = data?.request_id || data?.requestId || data?.id;
    if (!useQueue) throw new Error('生成結果を含むレスポンスを取得できませんでした。');
    if (!requestId) throw new Error('キューのリクエストIDが取得できませんでした。');

    const result = await pollFalQueue(row, endpoint, requestId, apiKey, timeoutMs, (update) => handleUpdate(row, update), info.extraUrls, info.logs, outputType);
    return result;
  }

  function handleUpdate(row, data) {
    const info = extractStoryboardResult(row?.state?.outputType || 'video', data);
    row.state.aggregatedLogs = mergeLogs(row.state.aggregatedLogs, info.logs);
    showLogs(row, row.state.aggregatedLogs);
    if (!row.state.isGenerating) return;
    if (info.status) {
      const label = info.status.replace(/_/g, ' ');
      setStatus(row, `ステータス: ${label}`, 'info');
    }
  }

  async function getFalApiKey() {
    const read = async (source) => new Promise((resolve) => {
      try {
        source.get(['falApiKey'], (value) => resolve(value?.falApiKey || ''));
      } catch (err) {
        resolve('');
      }
    });
    let key = '';
    if (chrome?.storage?.session) key = await read(chrome.storage.session);
    if (!key && chrome?.storage?.local) key = await read(chrome.storage.local);
    return key.trim();
  }

  async function getElevenLabsApiKey() {
    const read = async (source) => new Promise((resolve) => {
      try {
        source.get(['elevenlabsApiKey'], (value) => resolve(value?.elevenlabsApiKey || ''));
      } catch (err) {
        resolve('');
      }
    });
    let key = '';
    if (chrome?.storage?.session) key = await read(chrome.storage.session);
    if (!key && chrome?.storage?.local) key = await read(chrome.storage.local);
    return key.trim();
  }

  async function getProviderApiKey(provider) {
    const id = (provider || '').toLowerCase();
    if (id === 'fal') return getFalApiKey();
    if (id === 'elevenlabs') return getElevenLabsApiKey();
    return '';
  }

  function populateRowModels(row) {
    const select = row.elements.modelSelect;
    if (!select) return;
    const preserved = select.value;
    while (select.options.length > 1) select.remove(1);
    let anySelected = false;
    storyboardModels.forEach((entry) => {
      const opt = document.createElement('option');
      opt.value = `${entry.provider || 'unknown'}:${entry.model || ''}`;
      opt.textContent = entry.label || opt.value;
      if (entry.default === true && !anySelected) {
        opt.selected = true;
        anySelected = true;
      }
      select.appendChild(opt);
    });
    if (preserved && Array.from(select.options).some((opt) => opt.value === preserved)) {
      select.value = preserved;
    } else if (!select.value && select.options.length > 1) {
      select.selectedIndex = 1;
    }
  }

  function buildJobFilename(row, rawTitle, extension = 'mp4') {
    const sequence = Number(row?.state?.sequence) || Number(row?.id?.replace('row-', '')) || 1;
    const jobSegment = `job_${sequence}`;
    const titleSource = typeof rawTitle === 'string' ? rawTitle : '';
    const normalized = titleSource && typeof titleSource.normalize === 'function'
      ? titleSource.normalize('NFKC')
      : titleSource;
    const collapsed = normalized.trim().replace(/\s+/g, '_');
    const sanitized = collapsed
      .replace(/[^\p{Letter}\p{Number}_-]+/gu, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    const safeExt = (extension || 'mp4').toString().replace(/[^a-z0-9.]+/gi, '').replace(/^\.+/, '').toLowerCase() || 'bin';
    const fallbackNameMap = {
      mp4: 'video',
      mov: 'video',
      webm: 'video',
      m4v: 'video',
      mpg: 'video',
      mpeg: 'video',
      avi: 'video',
      gif: 'image',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      webp: 'image',
      bmp: 'image',
      svg: 'image',
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      m4a: 'audio',
      weba: 'audio',
      aac: 'audio'
    };
    const titleSegment = sanitized || fallbackNameMap[safeExt] || 'file';
    return `${jobSegment}_${titleSegment}.${safeExt}`;
  }

  function guessExtensionFromMime(mime, fallback = 'bin') {
    const map = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/webm': 'webm'
    };
    const key = (mime || '').toString().trim().toLowerCase();
    return map[key] || fallback;
  }

  function guessExtensionFromUrl(url, fallback = 'bin') {
    if (typeof url !== 'string') return fallback;
    const match = url.split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i);
    if (match && match[1]) return match[1].toLowerCase();
    return fallback;
  }

  async function fetchMediaBlob(source, fallbackMime = 'application/octet-stream') {
    if (!source) return null;
    const src = source.toString();
    try {
      const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (err) {
      if (/^data:/i.test(src)) {
        const res = await fetch(src);
        if (!res.ok) throw err;
        return await res.blob();
      }
      if (typeof source === 'object' && source.dataUrl) {
        const res = await fetch(source.dataUrl);
        if (!res.ok) throw err;
        return await res.blob();
      }
      if (typeof source === 'object' && source.base64) {
        const dataUrl = toDataUrlFromBase64(source.base64, fallbackMime);
        if (dataUrl) {
          const res = await fetch(dataUrl);
          if (!res.ok) throw err;
          return await res.blob();
        }
      }
      throw err;
    }
  }

  function gatherMediaOutputs(baseType) {
    const matches = [];
    const targetType = baseType === 'audio' ? 'audio' : 'video';
    rows.forEach((candidateRow) => {
      const result = candidateRow?.state?.result;
      if (!result) return;
      const resultType = (result?.type || '').toLowerCase();
      if (resultType !== targetType) return;
      const items = targetType === 'video'
        ? (Array.isArray(result?.videos) ? result.videos : [])
        : (Array.isArray(result?.audios) ? result.audios : []);
      items.forEach((item, index) => {
        if (!item) return;
        const rawSource = item.dataUrl || item.url || item.src;
        if (!rawSource) return;
        const jobSequence = candidateRow.state?.sequence || 0;
        matches.push({
          key: `${candidateRow.id || 'row'}_${targetType}_${index}`,
          rowId: candidateRow.id,
          rowSequence: jobSequence,
          rowTitle: candidateRow.elements?.controlTitle?.value || '',
          modelLabel: result?.modelLabel || item?.modelLabel || '',
          name: item?.name || item?.filename || `${targetType === 'video' ? 'Video' : 'Audio'} ${index + 1}`,
          mime: item?.mime || item?.content_type || item?.mime_type || '',
          size: item?.size || item?.file_size || 0,
          index,
          source: rawSource,
          dataUrl: typeof rawSource === 'string' && rawSource.startsWith('data:') ? rawSource : (typeof item?.dataUrl === 'string' ? item.dataUrl : ''),
          type: targetType
        });
      });
    });
    matches.sort((a, b) => {
      if (a.rowSequence !== b.rowSequence) return a.rowSequence - b.rowSequence;
      return a.index - b.index;
    });
    return matches;
  }

  async function loadMediaOutputSelection(selection, baseType) {
    if (!selection) throw new Error('出力が選択されていません。');
    const fallbackMime = selection.mime || (baseType === 'video' ? 'video/mp4' : 'audio/mpeg');
    const source = selection.dataUrl && selection.dataUrl.startsWith('data:') ? selection.dataUrl : selection.source;
    if (!source) throw new Error('出力ファイルのURLを取得できませんでした。');
    try {
      const blob = await fetchMediaBlob(source, fallbackMime);
      if (!blob) throw new Error('出力ファイルの取得に失敗しました。');
      const mime = blob.type || fallbackMime;
      const dataUrl = await blobToDataUrl(blob);
      const base64 = dataUrl.split(',').pop() || '';
      return { blob, dataUrl, base64, mime, name: selection.name, rowSequence: selection.rowSequence };
    } catch (err) {
      throw err instanceof Error ? err : new Error('出力ファイルの取得に失敗しました。');
    }
  }

  function openMediaOutputPicker(row, baseType, onSelect) {
    const entries = gatherMediaOutputs(baseType);
    if (!entries.length) {
      const message = baseType === 'video'
        ? '利用できる動画の出力がありません。'
        : '利用できる音声の出力がありません。';
      setStatus(row, message, 'info', { duration: 2400 });
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'media-output-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'media-output-dialog';
    overlay.appendChild(dialog);

    const heading = document.createElement('h2');
    heading.className = 'media-output-title';
    heading.textContent = baseType === 'video' ? '動画出力から選択' : '音声出力から選択';
    dialog.appendChild(heading);

    const description = document.createElement('p');
    description.className = 'media-output-description';
    description.textContent = '取り込みたい出力を選択してください。';
    dialog.appendChild(description);

    const list = document.createElement('div');
    list.className = 'media-output-list';
    dialog.appendChild(list);

    const closeOverlay = () => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeOverlay();
    });

    const closeSection = document.createElement('div');
    closeSection.className = 'media-output-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'media-output-cancel';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.addEventListener('click', () => closeOverlay());
    closeSection.appendChild(cancelBtn);
    dialog.appendChild(closeSection);

    const formatJobLabel = (entry) => {
      const seq = entry.rowSequence || 0;
      const title = (entry.rowTitle || '').trim();
      return title ? `ジョブ${seq}「${title}」` : `ジョブ${seq}`;
    };

    entries.forEach((entry) => {
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'media-output-item';
      itemBtn.dataset.rowId = entry.rowId || '';
      itemBtn.dataset.rowSequence = String(entry.rowSequence || '');

      const top = document.createElement('span');
      top.className = 'media-output-item-job';
      top.textContent = formatJobLabel(entry);
      itemBtn.appendChild(top);

      const name = document.createElement('span');
      name.className = 'media-output-item-name';
      name.textContent = entry.name || (baseType === 'video' ? 'Video' : 'Audio');
      itemBtn.appendChild(name);

      if (entry.modelLabel) {
        const pill = document.createElement('span');
        pill.className = 'media-output-item-model';
        pill.textContent = entry.modelLabel;
        itemBtn.appendChild(pill);
      }

      const detail = document.createElement('span');
      detail.className = 'media-output-item-meta';
      const mime = entry.mime || (baseType === 'video' ? 'video/mp4' : 'audio/mpeg');
      const sizeText = entry.size ? `・約${(entry.size / (1024 * 1024)).toFixed(2)}MB` : '';
      detail.textContent = `${mime}${sizeText}`;
      itemBtn.appendChild(detail);

      itemBtn.addEventListener('click', async () => {
        if (typeof onSelect !== 'function') {
          closeOverlay();
          return;
        }
        if (itemBtn.disabled) return;
        itemBtn.disabled = true;
        itemBtn.dataset.loading = '1';
        try {
          await onSelect(entry);
          closeOverlay();
        } catch (err) {
          itemBtn.disabled = false;
          delete itemBtn.dataset.loading;
          console.error('StoryBoard output import failed', err);
          const message = err?.message || '出力ファイルの取り込みに失敗しました。';
          setStatus(row, message, 'error', { duration: 2600 });
        }
      });

      list.appendChild(itemBtn);
    });

    document.body.appendChild(overlay);
    const firstButton = list.querySelector('button');
    if (firstButton) firstButton.focus();
  }

  async function convertBlobToPng(blob) {
    if (!blob) return null;
    if ((blob.type || '').toLowerCase() === 'image/png') return blob;
    const dataUrl = await blobToDataUrl(blob);
    const img = await loadImageFromDataUrl(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width || 1;
    canvas.height = img.height || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas コンテキストの作成に失敗しました。');
    ctx.drawImage(img, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob((png) => {
        if (png) resolve(png);
        else reject(new Error('PNG への変換に失敗しました。'));
      }, 'image/png');
    });
  }

  async function downloadBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const attempt = chrome?.downloads?.download;
    const fallback = async () => {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    };
    try {
      if (typeof attempt === 'function') {
        await new Promise((resolve, reject) => {
          attempt({ url: objectUrl, filename, saveAs: false }, (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(downloadId);
          });
        });
      } else {
        await fallback();
      }
    } catch (err) {
      console.warn('downloadBlob fallback', err);
      await fallback();
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    }
  }

  async function handleDownload(row) {
    const url = getVideoResult(row)?.videos?.[0]?.url || '';
    if (!url) return;
    const rawTitle = (row.elements.controlTitle?.value || '').trim();
    const filename = buildJobFilename(row, rawTitle);
    const downloadAttempt = chrome?.downloads?.download;
    setStatus(row, '動画を準備しています...', 'info');

    if (typeof downloadAttempt === 'function') {
      try {
        await new Promise((resolve, reject) => {
          downloadAttempt({ url, filename, saveAs: false }, (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(downloadId);
          });
        });
      setStatus(row, '動画のダウンロードを開始しました。', 'success', { duration: 1800 });
      return;
    } catch (err) {
      console.warn('Download API failed, falling back to fetch', err);
    }
    }

    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error('動画の取得に失敗しました。');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      setStatus(row, '動画のダウンロードを開始しました。', 'success', { duration: 1800 });
    } catch (err) {
      console.error('Failed to trigger download', err);
      setStatus(row, err?.message || 'ダウンロードに失敗しました。', 'error', { duration: 2600 });
      try { window.open(url, '_blank'); }
      catch (e) { console.error('Fallback open failed', e); }
    }
  }

  async function refetchLatestVideoInfo(row) {
    const extras = new Set();
    const mediaPattern = /\.(mp4|mov|webm|mkv|avi|m4v|flv|wmv)(\?|#|$)/i;
    const fromResult = row?.state?.result?.extraUrls;
    if (Array.isArray(fromResult)) {
      fromResult.forEach((value) => {
        if (typeof value === 'string' && value.startsWith('http') && !mediaPattern.test(value)) extras.add(value);
      });
    }
    const fromSource = row?.state?.videoSource?.extraUrls;
    if (Array.isArray(fromSource)) {
      fromSource.forEach((value) => {
        if (typeof value === 'string' && value.startsWith('http') && !mediaPattern.test(value)) extras.add(value);
      });
    }
    if (!extras.size) return null;

    let apiKey = row?.state?.lastFalApiKey || '';
    if (!apiKey) apiKey = await getFalApiKey();
    if (!apiKey) throw new Error('FAL APIキーが設定されていません。');

    const timeoutMs = 20000;
    for (const targetUrl of extras) {
      try {
        const res = await fetchWithTimeout(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Accept': 'application/json'
          },
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          credentials: 'omit'
        }, timeoutMs);
        if (!res.ok) continue;
        const text = await res.text();
        if (!text) continue;
        let data;
        try { data = JSON.parse(text); }
        catch { continue; }
        const info = extractStoryboardResult(row?.state?.outputType || 'video', data);
        if (Array.isArray(info?.videos) && info.videos.some((item) => item?.url)) {
          return { info, data };
        }
      } catch (err) {
        console.warn('refetchLatestVideoInfo failed', err);
      }
    }
    return null;
  }

  async function handleVideoReload(row, button) {
    const reloadBtn = button || row?.state?.videoControls?.reloadBtn || null;
    if (reloadBtn) reloadBtn.disabled = true;
    const label = row?.state?.result?.modelLabel || row?.state?.videoSource?.modelLabel || '';
    try {
      setStatus(row, '動画URLを再取得しています...', 'info');
      const refreshed = await refetchLatestVideoInfo(row);
      if (refreshed?.info) {
        const info = refreshed.info;
        const videos = Array.isArray(info.videos) ? info.videos : [];
        const primary = videos.find((item) => item?.url) || {};
        row.state.aggregatedLogs = mergeLogs(row.state.aggregatedLogs, info.logs || []);
        showLogs(row, row.state.aggregatedLogs);
        renderVideo(row, primary.url || '', {
          modelLabel: label,
          videos,
          extraUrls: info.extraUrls || [],
          delayMs: 1000,
          ...primary
        });
        setStatus(row, '動画を再取得しました。', 'success', { duration: 2000 });
      } else {
        const fallbackUrl = row?.state?.videoSource?.url || row?.state?.result?.videos?.[0]?.url || '';
        if (!fallbackUrl) throw new Error('動画URLを取得できませんでした。');
        scheduleVideoSource(row, fallbackUrl, { delayMs: 1000 });
        if (row.state.videoControls?.link) {
          row.state.videoControls.link.href = fallbackUrl;
        }
        setStatus(row, '動画を再読込しました。', 'info', { duration: 1800 });
      }
    } catch (err) {
      console.error('handleVideoReload failed', err);
      setStatus(row, err?.message || '動画の再取得に失敗しました。', 'error', { duration: 2600 });
    } finally {
      if (reloadBtn) reloadBtn.disabled = false;
    }
  }

  async function handleDownloadImage(row, index = 0, button) {
    const result = getImageResult(row);
    const images = result?.images || [];
    const image = images[index];
    if (!image) {
      setStatus(row, 'ダウンロードできる画像がありません。', 'error', { duration: 2000 });
      return;
    }
    const src = image?.src || image?.dataUrl || image?.url;
    if (!src) {
      setStatus(row, 'ダウンロードできる画像がありません。', 'error', { duration: 2000 });
      return;
    }
    const mime = image?.mime || (src.startsWith('data:') ? src.split(';')[0].split(':')[1] : 'image/png');
    const ext = mime ? guessExtensionFromMime(mime, guessExtensionFromUrl(src, 'png')) : guessExtensionFromUrl(src, 'png');
    const rawTitle = (row.elements.controlTitle?.value || '').trim();
    const filename = buildJobFilename(row, rawTitle || image?.name, ext || 'png');
    try {
      setStatus(row, '画像を準備しています...', 'info');
      if (button) button.disabled = true;
      const blob = await fetchMediaBlob(src, mime || 'image/png');
      if (!blob) throw new Error('画像の取得に失敗しました。');
      await downloadBlob(blob, filename);
      setStatus(row, '画像のダウンロードを開始しました。', 'success', { duration: 1800 });
    } catch (err) {
      console.error('Failed to download image', err);
      setStatus(row, err?.message || '画像のダウンロードに失敗しました。', 'error', { duration: 2600 });
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function handleCopyImage(row, index = 0, button) {
    if (!navigator?.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setStatus(row, 'クリップボードに画像をコピーできません。', 'error', { duration: 2400 });
      return;
    }
    const result = getImageResult(row);
    const image = result?.images?.[index];
    if (!image) {
      setStatus(row, 'コピーできる画像がありません。', 'error', { duration: 2200 });
      return;
    }
    const src = image?.src || image?.dataUrl || image?.url;
    if (!src) {
      setStatus(row, 'コピーできる画像がありません。', 'error', { duration: 2200 });
      return;
    }
    try {
      setStatus(row, '画像をコピーしています...', 'info');
      if (button) button.disabled = true;
      const blob = await fetchMediaBlob(src, image?.mime || 'image/png');
      if (!blob) throw new Error('画像の取得に失敗しました。');
      const pngBlob = await convertBlobToPng(blob);
      const item = new ClipboardItem({ [pngBlob.type || 'image/png']: pngBlob });
      await navigator.clipboard.write([item]);
      setStatus(row, '画像をコピーしました。', 'success', { duration: 2000 });
    } catch (err) {
      console.error('Failed to copy image', err);
      setStatus(row, err?.message || '画像のコピーに失敗しました。', 'error', { duration: 2600 });
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function openImagePreview(row, index = 0) {
    const result = getImageResult(row);
    const image = result?.images?.[index];
    const src = image?.src || image?.dataUrl || image?.url;
    if (!src) {
      setStatus(row, 'プレビューできる画像がありません。', 'error', { duration: 2200 });
      return;
    }
    try {
      setStatus(row, 'プレビューを開いています...', 'info');
      await openImagePopup(src);
      setStatus(row, 'プレビューを開きました。', 'success', { duration: 1500 });
    } catch (err) {
      console.error('Failed to open image preview', err);
      setStatus(row, err?.message || 'プレビューを開けませんでした。', 'error', { duration: 2600 });
    }
  }

  async function handleDownloadAudio(row, index = 0, button) {
    const result = getAudioResult(row);
    const audios = result?.audios || [];
    const audio = audios[index];
    const src = audio?.src || audio?.dataUrl || audio?.url;
    if (!src) {
      setStatus(row, 'ダウンロードできる音声がありません。', 'error', { duration: 2000 });
      return;
    }
    const mime = audio?.mime || (src.startsWith('data:') ? src.split(';')[0].split(':')[1] : 'audio/mpeg');
    const ext = mime ? guessExtensionFromMime(mime, guessExtensionFromUrl(src, 'mp3')) : guessExtensionFromUrl(src, 'mp3');
    const rawTitle = (row.elements.controlTitle?.value || '').trim();
    const filename = buildJobFilename(row, rawTitle || audio?.name, ext || 'mp3');
    try {
      setStatus(row, '音声を準備しています...', 'info');
      if (button) button.disabled = true;
      const blob = await fetchMediaBlob(src, mime || 'audio/mpeg');
      if (!blob) throw new Error('音声の取得に失敗しました。');
      await downloadBlob(blob, filename);
      setStatus(row, '音声のダウンロードを開始しました。', 'success', { duration: 1800 });
    } catch (err) {
      console.error('Failed to download audio', err);
      setStatus(row, err?.message || '音声のダウンロードに失敗しました。', 'error', { duration: 2600 });
    } finally {
      if (button) button.disabled = false;
    }
  }

  function handleCancel(row) {
    if (!row.state.isGenerating) return;
    row.state.isCanceled = true;
    setStatus(row, 'キャンセルしています...', 'info');
    updateControlNote(row, 'Canceling...');
  }

  async function handleCopy(row) {
    const url = getVideoResult(row)?.videos?.[0]?.url || '';
    if (!url) return;
    const copyBtn = row.state.videoControls?.copyBtn || null;
    if (copyBtn) copyBtn.disabled = true;
    try {
      setStatus(row, 'フレームをコピーしています...', 'info');
      await copyFrameToClipboard(row);
      setStatus(row, '停止中のフレームをコピーしました。', 'success', { duration: 2000 });
    } catch (err) {
      console.error('Copy frame failed', err);
      const message = err?.message || 'フレームのコピーに失敗しました。';
      setStatus(row, message, 'error', { duration: 2600 });
    } finally {
      if (copyBtn) copyBtn.disabled = !getVideoResult(row)?.videos?.[0]?.url;
    }
  }

  function clampTime(video, time) {
    return Math.max(0, Math.min(video.duration || Number.MAX_SAFE_INTEGER, time));
  }

  function stepFrame(row, direction) {
    const state = ensureRowVideoState(row);
    const video = state.videoElement;
    if (!video) return;
    const duration = Math.max(state.frameDuration || 1 / 30, 1 / 60);
    const delta = duration * direction;
    const target = clampTime(video, video.currentTime + delta);
    video.currentTime = target;
  }

  function resetFrame(row) {
    const state = ensureRowVideoState(row);
    const video = state.videoElement;
    if (!video) return;
    const base = state.originalTime ?? 0;
    video.currentTime = clampTime(video, base);
  }

  async function handleGenerate(row) {
    if (row.state.isGenerating) return;
    if (!modelsLoaded || !storyboardModels.length) {
      setStatus(row, 'モデル定義が読み込まれていません。数秒後に再度お試しください。', 'error');
      return;
    }
    const select = row.elements.modelSelect;
    const modelValue = select?.value || '';
    const entry = findModelByValue(modelValue);
    if (!entry) {
      setStatus(row, 'モデルを選択してください。', 'error');
      return;
    }

    if (hasInvalidTextInputs(row)) {
      setStatus(row, '入力文字数が上限を超えています。', 'error');
      return;
    }

    row.state.missingFields = [];
    const params = collectParameters(row);
    const missing = Array.isArray(row.state.missingFields)
      ? row.state.missingFields.filter(Boolean)
      : [];
    if (missing.length) {
      const message = `${missing.join(', ')} を設定してください。`;
      setStatus(row, message, 'error');
      return;
    }

    const fieldDefs = flattenFieldDefs(Array.isArray(entry?.inputs) ? entry.inputs : Array.isArray(entry?.prompt) ? entry.prompt : [], '');
    const promptField = fieldDefs.find((item) => !item?.container && (item?.def?.key || '').toLowerCase() === 'prompt');
    const promptIsOptional = promptField?.def?.optional === true;
    const promptExplicitOptional = promptField?.def?.required === false;
    const promptRequired = !!promptField && !promptIsOptional && !promptExplicitOptional;
    if (promptRequired) {
      const promptValue = getNestedValue(params, promptField.key);
      const hasPrompt = Array.isArray(promptValue)
        ? promptValue.length > 0
        : typeof promptValue === 'string'
          ? promptValue.trim().length > 0
          : promptValue !== undefined && promptValue !== null;
      if (!hasPrompt) {
        setStatus(row, 'プロンプトを入力してください。', 'error');
        return;
      }
    }

    const provider = (entry?.provider || 'fal').toLowerCase();
    const apiKey = await getProviderApiKey(provider);
    if (!apiKey) {
      const providerLabel = provider === 'elevenlabs' ? 'ElevenLabs' : (provider || 'FAL').toUpperCase();
      setStatus(row, `${providerLabel} APIキーが設定されていません。設定ページで入力してください。`, 'error');
      return;
    }

    if (provider === 'fal') row.state.lastFalApiKey = apiKey;

    const outputType = normalizeOutputType(entry?.output || row.state.outputType);
    setRowOutputType(row, outputType);

    row.state.isCanceled = false;
    row.state.aggregatedLogs = [];
    showLogs(row, []);
    clearResult(row);
    setBusy(row, true);
    const runningMessage = outputType === 'audio'
      ? '音声を生成しています...'
      : outputType === 'image'
        ? '画像を生成しています...'
        : '動画を生成しています...';
    setStatus(row, runningMessage, 'info');
    updateControlNote(row, 'Running...');

    try {
      const result = await runProviderModel(row, entry, params, apiKey);
      const info = result?.info || null;
      if (!info) throw new Error('生成結果を取得できませんでした。');
      const resolvedType = normalizeOutputType(info.type || outputType);
      row.state.aggregatedLogs = mergeLogs(row.state.aggregatedLogs, result.logs || []);
      if (resolvedType === 'image') {
        renderImages(row, info, { modelLabel: entry.label });
      } else if (resolvedType === 'audio') {
        renderAudio(row, info, { modelLabel: entry.label });
      } else {
        const videos = Array.isArray(info?.videos) ? info.videos : [];
        const primary = videos.find((item) => item?.url) || {};
        renderVideo(row, primary.url || '', {
          modelLabel: entry.label,
          videos,
          extraUrls: info.extraUrls || [],
          delayMs: 1000,
          ...primary
        });
      }
      showLogs(row, row.state.aggregatedLogs);
      const doneMessage = resolvedType === 'audio'
        ? '音声の生成が完了しました。'
        : resolvedType === 'image'
          ? '画像の生成が完了しました。'
          : '動画の生成が完了しました。';
      setStatus(row, doneMessage, 'success', { duration: 2000 });
      updateControlNote(row, 'Completed');
    } catch (err) {
      console.error('[StoryBoard] generate failed', err);
      showLogs(row, row.state.aggregatedLogs);
      const message = err?.message || '生成に失敗しました。';
      if (row.state.isCanceled || message.includes('キャンセル')) {
        setStatus(row, 'キャンセルしました。', 'info', { duration: 2000 });
        updateControlNote(row, 'Canceled');
      } else {
        setStatus(row, message, 'error');
        updateControlNote(row, 'Failed');
      }
    } finally {
      setBusy(row, false);
      row.state.isCanceled = false;
      updateControlButtons();
    }
  }

  function removeRow(row) {
    if (!row || !rows.has(row.id)) return;
    if (row.state.isGenerating) {
      setStatus(row, '生成中のジョブは削除できません。', 'error', { duration: 2400 });
      return;
    }
    rows.delete(row.id);
    if (row.root?.parentNode === rowsContainer) rowsContainer.removeChild(row.root);
    reindexRows();
    updateControlButtons();
    refreshDownloadAllState();
    if (!rows.size) {
      const fallback = createRow();
      fallback.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function duplicateRow(row) {
    if (!row || !rows.has(row.id)) return;
    if (!modelsLoaded || !storyboardModels.length) {
      setStatus(row, 'モデル定義が読み込まれていません。数秒後に再度お試しください。', 'error');
      return;
    }

    const modelValue = row.elements.modelSelect?.value || '';
    const params = collectParameters(row);
    const title = row.elements.controlTitle?.value || '';
    const memo = row.elements.controlMemo?.value || '';

    const newRow = createRow({ insertAfter: row });

    if (modelValue && newRow.elements.modelSelect) {
      const hasOption = Array.from(newRow.elements.modelSelect.options).some((opt) => opt.value === modelValue);
      if (hasOption) {
        newRow.elements.modelSelect.value = modelValue;
      }
    }

    renderFields(newRow);

    applyParameters(newRow, params);
    if (newRow.elements.controlTitle) newRow.elements.controlTitle.value = title;
    if (newRow.elements.controlMemo) newRow.elements.controlMemo.value = memo;
    updateControlNote(newRow, 'Idle');
    setStatus(newRow, '複製しました。', 'success', { duration: 1200 });
    if (row.state.isGenerating) {
      setStatus(row, '生成中に複製を作成しました。', 'info', { duration: 1600 });
    }
    highlightRow(newRow);
    refreshDownloadAllState();
  }

  function setupRow(row) {
    const selectId = `${row.id}-model`;
    row.elements.modelSelect.id = selectId;
    row.elements.modelLabel.setAttribute('for', selectId);

    addControlEntry(row, `Job ${row.state.sequence}`, 'Idle');
    showLogs(row, []);

    row.elements.modelSelect.addEventListener('change', () => {
      // Preserve common fields when switching models
      const preservedFields = preserveCommonFields(row);
      renderFields(row);
      restorePreservedFields(row, preservedFields);
    });
    row.elements.generateBtn.addEventListener('click', () => handleGenerate(row));
    row.elements.cancelBtn.addEventListener('click', () => handleCancel(row));
    if (row.elements.requestBtn) {
      row.elements.requestBtn.addEventListener('click', () => {
        const modelValue = row.elements.modelSelect?.value || '';
        const entry = findModelByValue(modelValue);
        const url = row.state.requestPageUrl || deriveRequestPage(entry);
        if (!url) {
          setStatus(row, 'リクエストページを開けませんでした。', 'error', { duration: 2000 });
          return;
        }
        try {
          const opened = window.open(url, '_blank', 'noopener');
          if (!opened) {
            setStatus(row, 'リクエストページを開けませんでした。ブラウザのポップアップ設定を確認してください。', 'error', { duration: 2600 });
          }
        } catch (err) {
          console.error('[StoryBoard] failed to open request page', err);
          setStatus(row, 'リクエストページを開けませんでした。', 'error', { duration: 2000 });
        }
      });
    }
    row.elements.controlDuplicate.addEventListener('click', () => duplicateRow(row));
    if (row.elements.controlMoveUp) {
      row.elements.controlMoveUp.addEventListener('click', () => moveRow(row, -1));
    }
    if (row.elements.controlMoveDown) {
      row.elements.controlMoveDown.addEventListener('click', () => moveRow(row, 1));
    }
    row.elements.controlAdd.addEventListener('click', () => {
      const newRow = createRow({ insertAfter: row });
      newRow.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      highlightRow(newRow);
    });
    row.elements.controlRemove.addEventListener('click', () => {
      const confirmed = window.confirm('消しても良いですか？');
      if (!confirmed) return;
      removeRow(row);
    });

    if (modelsLoaded) {
      populateRowModels(row);
      renderFields(row);
    }
  }

  async function handleDownloadAll() {
    if (zipBusy) return;
    const downloadables = Array.from(rows.values())
      .map((row) => ({ row, result: row.state.result }))
      .filter(({ result }) => {
        if (!result) return false;
        if (result.type === 'video') return Array.isArray(result.videos) && result.videos.some((item) => item?.url);
        if (result.type === 'image') return Array.isArray(result.images) && result.images.length > 0;
        if (result.type === 'audio') return Array.isArray(result.audios) && result.audios.length > 0;
        return false;
      });
    if (!downloadables.length) {
      refreshDownloadAllState();
      return;
    }

    setZipBusy(true, 'ZIPを準備しています...');
    const zip = new ZipWriter();
    const processed = [];
    let objectUrl = '';

    try {
      for (const { row, result } of downloadables) {
        const rawTitle = row.elements.controlTitle?.value || '';
        if (result.type === 'video') {
          const videos = Array.isArray(result.videos) ? result.videos : [];
          const primary = videos.find((item) => item?.url) || videos[0];
          if (!primary?.url) {
            setStatus(row, 'ZIPに追加できる動画がありませんでした。', 'error', { duration: 2600 });
            continue;
          }
          setStatus(row, '動画をZIPに追加しています...', 'info');
          const blob = await fetchMediaBlob(primary.url, 'video/mp4');
          if (!blob) throw new Error('動画の取得に失敗しました。');
          const extension = guessExtensionFromUrl(primary.url, 'mp4');
          const filename = buildJobFilename(row, rawTitle, extension || 'mp4');
          const data = new Uint8Array(await blob.arrayBuffer());
          zip.add(filename, data);
          processed.push(row);
          setStatus(row, 'ZIPに追加しました。', 'success', { duration: 1600 });
          continue;
        }

        if (result.type === 'image') {
          const images = Array.isArray(result.images) ? result.images : [];
          if (!images.length) continue;
          let added = 0;
          for (let index = 0; index < images.length; index += 1) {
            const item = images[index];
            const src = item?.src || item?.dataUrl || item?.url;
            if (!src) continue;
            setStatus(row, `画像をZIPに追加しています... (${index + 1}/${images.length})`, 'info');
            const mime = item?.mime || (src.startsWith('data:') ? src.split(';')[0].split(':')[1] : 'image/png');
            const blob = await fetchMediaBlob(src, mime || 'image/png');
            if (!blob) continue;
            const extFromMime = mime ? guessExtensionFromMime(mime, 'png') : 'png';
            const extension = extFromMime || guessExtensionFromUrl(src, 'png');
            const titleForFile = rawTitle
              ? `${rawTitle} ${index + 1}`
              : item?.name || `image_${index + 1}`;
            const filename = buildJobFilename(row, titleForFile, extension || 'png');
            const data = new Uint8Array(await blob.arrayBuffer());
            zip.add(filename, data);
            added += 1;
          }
          if (added > 0) {
            processed.push(row);
            setStatus(row, 'ZIPに追加しました。', 'success', { duration: 1600 });
          } else {
            setStatus(row, 'ZIPに追加できる画像がありませんでした。', 'error', { duration: 2600 });
          }
          continue;
        }

        if (result.type === 'audio') {
          const audios = Array.isArray(result.audios) ? result.audios : [];
          if (!audios.length) continue;
          const primary = audios[0];
          const src = primary?.src || primary?.dataUrl || primary?.url;
          if (!src) {
            setStatus(row, 'ZIPに追加できる音声がありませんでした。', 'error', { duration: 2600 });
            continue;
          }
          setStatus(row, '音声をZIPに追加しています...', 'info');
          const mime = primary?.mime || (src.startsWith('data:') ? src.split(';')[0].split(':')[1] : 'audio/mpeg');
          const blob = await fetchMediaBlob(src, mime || 'audio/mpeg');
          if (!blob) throw new Error('音声の取得に失敗しました。');
          const extension = mime ? guessExtensionFromMime(mime, guessExtensionFromUrl(src, 'mp3')) : guessExtensionFromUrl(src, 'mp3');
          const filename = buildJobFilename(row, rawTitle || primary?.name, extension || 'mp3');
          const data = new Uint8Array(await blob.arrayBuffer());
          zip.add(filename, data);
          processed.push(row);
          setStatus(row, 'ZIPに追加しました。', 'success', { duration: 1600 });
        }
      }

      const blob = zip.generate();
      const zipName = `storyboard_results_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}.zip`;
      objectUrl = URL.createObjectURL(blob);

      let downloaded = false;
      if (typeof chrome?.downloads?.download === 'function') {
        try {
          await new Promise((resolve, reject) => {
            chrome.downloads.download({ url: objectUrl, filename: zipName, saveAs: false }, (downloadId) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve(downloadId);
            });
          });
          downloaded = true;
        } catch (err) {
          console.warn('chrome.downloads.download failed, falling back', err);
        }
      }

      if (!downloaded) {
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = zipName;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }

      processed.forEach((row) => setStatus(row, 'ZIPのダウンロードを開始しました。', 'success', { duration: 2000 }));
    } catch (err) {
      console.error('[StoryBoard] download all failed', err);
      const message = err?.message || 'ZIPの作成に失敗しました。';
      downloadables.forEach(({ row }) => setStatus(row, message, 'error', { duration: 2600 }));
    } finally {
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
      }
      setZipBusy(false);
    }
  }

  function createRow(options = {}) {
    const fragment = rowTemplate.content.cloneNode(true);
    const rowEl = fragment.querySelector('.storyboard-row');
    if (!rowEl) throw new Error('Row template missing root element');
    const rowId = `row-${++rowSeq}`;
    const sequence = rowSeq;
    rowEl.dataset.rowId = rowId;

    const elements = {
      root: rowEl,
      track: rowEl.querySelector('.storyboard-track'),
      controlList: rowEl.querySelector('.control-list'),
      controlMoveUp: rowEl.querySelector('.control-move-up'),
      controlMoveDown: rowEl.querySelector('.control-move-down'),
      controlAdd: rowEl.querySelector('.control-add'),
      controlRemove: rowEl.querySelector('.control-remove'),
      controlDuplicate: rowEl.querySelector('.control-duplicate'),
      controlEntry: null,
      controlLabel: null,
      controlNote: null,
      modelGroup: rowEl.querySelector('.model-group'),
      modelLabel: rowEl.querySelector('.model-label'),
      modelSelect: rowEl.querySelector('.story-model'),
      referenceWrapper: rowEl.querySelector('.model-reference'),
      referenceLink: rowEl.querySelector('.model-reference-link'),
      referenceNotes: rowEl.querySelector('.model-reference-notes'),
      requestWrapper: rowEl.querySelector('.model-request'),
      requestBtn: rowEl.querySelector('.story-request'),
      generateBtn: rowEl.querySelector('.story-generate'),
      cancelBtn: rowEl.querySelector('.story-cancel'),
      status: rowEl.querySelector('.story-status'),
      fieldsContainer: rowEl.querySelector('.story-fields'),
      output: rowEl.querySelector('.story-output'),
      logsWrapper: rowEl.querySelector('.story-logs'),
      logsBody: rowEl.querySelector('.story-logs-body')
    };

    const state = {
      sequence,
      aggregatedLogs: [],
      isGenerating: false,
      statusTimer: null,
      isCanceled: false,
      missingFields: [],
      hiddenValues: {},
      hiddenFieldKeys: new Set(),
      outputType: 'video',
      result: null,
      videoControls: null,
      audioControls: null,
      fieldCounters: new Map(),
      requestPageUrl: ''
    };

    const row = { id: rowId, root: rowEl, elements, state };
    rows.set(rowId, row);

    if (options?.insertAfter && options.insertAfter.root?.parentNode === rowsContainer) {
      rowsContainer.insertBefore(rowEl, options.insertAfter.root.nextSibling);
    } else {
      rowsContainer.appendChild(rowEl);
    }

    setupRow(row);
    reindexRows();
    updateControlButtons();
    refreshDownloadAllState();
    updateResultActions(row);
    return row;
  }

  async function loadModels() {
    try {
      const url = chrome.runtime.getURL('models_sb.json');
      const res = await fetch(url);
      if (!res.ok) throw new Error('models not found');
      const list = await res.json();
      storyboardModels = Array.isArray(list) ? list : [];
      modelsLoaded = true;
      rows.forEach((row) => {
        populateRowModels(row);
        renderFields(row);
      });
    } catch (err) {
      console.error('Failed to load models_sb.json', err);
      rows.forEach((row) => setStatus(row, 'モデル定義の読み込みに失敗しました。', 'error'));
    }
  }

  refreshDownloadAllState();
  downloadAllBtn?.addEventListener('click', () => handleDownloadAll());

  const initialRow = createRow();
  renderFields(initialRow);
  loadModels();
});
