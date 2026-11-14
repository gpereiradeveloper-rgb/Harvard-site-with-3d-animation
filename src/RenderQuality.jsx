import { useCallback, useEffect, useMemo, useState } from 'react';

export const RENDER_QUALITY_STORAGE_KEY = 'harvard-render-quality-v1';
export const RENDER_QUALITY_IDS = Object.freeze(['auto', 'high', 'cinema']);

/** Accept only known choices; a broken/old storage entry must not break the scene. */
export function sanitizeStoredQuality(value, fallback = 'auto') {
  const safeFallback = RENDER_QUALITY_IDS.includes(fallback) ? fallback : 'auto';
  if (typeof value !== 'string') return safeFallback;
  let candidate = value.trim().toLowerCase();
  if (candidate.startsWith('"')) {
    try { candidate = JSON.parse(candidate); } catch { return safeFallback; }
  }
  return RENDER_QUALITY_IDS.includes(candidate) ? candidate : safeFallback;
}

const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * The renderer has exactly one source of truth: pass profile.dpr to <Canvas dpr>.
 * This function deliberately accepts no scroll, pointer, velocity, FPS, chapter,
 * reduced-motion or visibility state. A selected manual mode cannot regress when
 * those states change. Its fixed caps protect the drawing buffer, not frame rate.
 */
export function getRenderQualityProfile({
  quality = 'auto',
  width = 1,
  height = 1,
  devicePixelRatio = 1,
  maxDimension = 8192,
} = {}) {
  const selected = sanitizeStoredQuality(quality);
  const w = positive(width, 1), h = positive(height, 1);
  const nativeDpr = Math.min(positive(devicePixelRatio, 1), 4);
  const mobile = w < 760;
  const manual = selected !== 'auto';
  const maxPixels = selected === 'cinema' ? 16_000_000
    : selected === 'high' ? 12_000_000
    : mobile ? 3_000_000 : 7_000_000;
  const preferredDpr = selected === 'cinema' ? Math.max(2.5, nativeDpr)
    : selected === 'high' ? Math.max(2, Math.min(nativeDpr, 2.5))
    : Math.min(nativeDpr, mobile ? 1.5 : 1.75);
  const dimensionLimit = Math.max(1, positive(maxDimension, 8192));
  const dpr = Math.min(preferredDpr, Math.sqrt(maxPixels / (w * h)), dimensionLimit / w, dimensionLimit / h);
  const renderWidth = Math.max(1, Math.floor(w * dpr));
  const renderHeight = Math.max(1, Math.floor(h * dpr));

  return Object.freeze({
    quality: selected,
    manual,
    dpr,
    cssWidth: w,
    cssHeight: h,
    renderWidth,
    renderHeight,
    pixelCount: renderWidth * renderHeight,
    maxPixels,
    maxDimension: dimensionLimit,
  });
}

export function readStoredRenderQuality(storage, key = RENDER_QUALITY_STORAGE_KEY, fallback = 'auto') {
  try { return sanitizeStoredQuality(storage?.getItem(key), fallback); }
  catch { return sanitizeStoredQuality(fallback); }
}

export function writeStoredRenderQuality(storage, quality, key = RENDER_QUALITY_STORAGE_KEY) {
  const safe = sanitizeStoredQuality(quality);
  if (!storage?.setItem) return false;
  try { storage.setItem(key, safe); return true; }
  catch { return false; }
}

function browserStorage() {
  try { return typeof window === 'undefined' ? null : window.localStorage; }
  catch { return null; }
}

/** Preserve the visitor's chosen mode across reloads; storage can be unavailable. */
export function usePersistentRenderQuality(fallback = 'auto', key = RENDER_QUALITY_STORAGE_KEY) {
  const [quality, setValue] = useState(() => readStoredRenderQuality(browserStorage(), key, fallback));
  const setQuality = useCallback(next => {
    setValue(previous => sanitizeStoredQuality(typeof next === 'function' ? next(previous) : next, previous));
  }, []);

  useEffect(() => { writeStoredRenderQuality(browserStorage(), quality, key); }, [quality, key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = event => {
      if (event.key === key) setValue(sanitizeStoredQuality(event.newValue, fallback));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, fallback]);

  return [quality, setQuality];
}

/** Stable numeric DPR for a full-viewport canvas; no imperative setDpr is needed. */
export function useViewportRenderQuality(quality) {
  const readViewport = () => ({
    width: typeof window === 'undefined' ? 1 : window.innerWidth,
    height: typeof window === 'undefined' ? 1 : window.innerHeight,
    devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  });
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let media;
    const sync = () => {
      setViewport(previous => {
        const next = readViewport();
        return previous.width === next.width && previous.height === next.height
          && previous.devicePixelRatio === next.devicePixelRatio ? previous : next;
      });
      media?.removeEventListener('change', sync);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      media.addEventListener('change', sync);
    };
    sync();
    window.addEventListener('resize', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      media?.removeEventListener('change', sync);
    };
  }, []);

  return useMemo(() => getRenderQualityProfile({ quality, ...viewport }),
    [quality, viewport.width, viewport.height, viewport.devicePixelRatio]);
}
