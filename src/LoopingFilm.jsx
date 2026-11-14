import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const clampOpacity = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** RAF-only opacity controller. Every replacement fade begins at the visible value. */
export function createRafFade({
  getValue,
  setValue,
  now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
}) {
  let frame = null, generation = 0;
  const cancel = () => {
    generation += 1;
    if (frame !== null) cancelFrame(frame);
    frame = null;
  };
  return {
    cancel,
    to(target, duration = 250) {
      cancel();
      const version = generation, from = clampOpacity(getValue()), to = clampOpacity(target);
      const started = now(), milliseconds = Math.max(0, duration);
      if (!milliseconds || from === to) { setValue(to); return; }
      const tick = timestamp => {
        if (version !== generation) return;
        const progress = Math.min(1, Math.max(0, (timestamp - started) / milliseconds));
        setValue(from + (to - from) * progress);
        if (progress < 1) frame = requestFrame(tick);
        else frame = null;
      };
      frame = requestFrame(tick);
    },
  };
}

/**
 * Decorative, muted film. Sources are fixed for this component's lifetime;
 * primary and fallback <video> elements remain mounted and never swap src.
 *
 * Ref API:
 * - getVideo(): the current HTMLVideoElement (or null before mounting).
 * - play(): Promise<boolean>; true means the browser accepted playback. Only
 *   onReady confirms a decoded frame. Also permits manual play in reduced mode.
 * - pause(): explicit pause; play() is required to release that user pause.
 *
 * Parent CSS owns layout/crop for .looping-film, .looping-film__poster and
 * .looping-film__video. Opacity is owned exclusively by this component's RAF.
 */
const LoopingFilm = forwardRef(function LoopingFilm({
  src,
  fallbackSrc,
  poster,
  active = true,
  reducedMotion = false,
  onReady,
  onError,
  onPosterReady,
}, forwardedRef) {
  const sources = useRef([src || '', fallbackSrc || '']);
  const videos = useRef([]), selected = useRef(sources.current[0] ? 0 : 1);
  const options = useRef({ active, reducedMotion });
  const callbacks = useRef({ onReady, onError });
  options.current = { active, reducedMotion };
  callbacks.current = { onReady, onError };

  const mounted = useRef(false), opacity = useRef(0), token = useRef(0);
  const frameMonitor = useRef(null), rafMonitor = useRef(null);
  const loopTimer = useRef(null), firstFrameTimer = useRef(null), pendingSeek = useRef(null);
  const fadingOutRef = useRef(false), decoded = useRef(false), sawPlaying = useRef(false);
  const fallbackFrames = useRef(0), expectingStart = useRef(false);
  const manualRequested = useRef(false), manualPaused = useRef(false);
  const previousReducedMotion = useRef(reducedMotion);
  const readySources = useRef(new Set()), failedSources = useRef(new Set());
  const statusRef = useRef('loading'), [status, setStatus] = useState('loading');
  const controller = useRef(null), fade = useRef(null);

  const getVideo = () => videos.current[selected.current] || null;
  const canRun = () => mounted.current && options.current.active && !document.hidden
    && !manualPaused.current && (!options.current.reducedMotion || manualRequested.current);
  const valid = version => mounted.current && version === token.current && canRun();
  const publish = next => {
    statusRef.current = next;
    if (mounted.current) setStatus(previous => previous === next ? previous : next);
  };
  const setOpacity = value => {
    opacity.current = clampOpacity(value);
    const video = getVideo();
    if (video) video.style.opacity = String(opacity.current);
  };
  if (!fade.current) fade.current = createRafFade({ getValue: () => opacity.current, setValue: value => {
    opacity.current = value;
    const video = videos.current[selected.current];
    if (video) video.style.opacity = String(value);
  } });

  const stopWork = () => {
    token.current += 1;
    fade.current.cancel();
    if (frameMonitor.current) {
      frameMonitor.current.video.cancelVideoFrameCallback?.(frameMonitor.current.id);
      frameMonitor.current = null;
    }
    if (rafMonitor.current !== null) cancelAnimationFrame(rafMonitor.current);
    rafMonitor.current = null;
    clearTimeout(loopTimer.current); loopTimer.current = null;
    clearTimeout(firstFrameTimer.current); firstFrameTimer.current = null;
    pendingSeek.current?.abort(); pendingSeek.current = null;
    for (const video of videos.current) video?.pause();
  };

  const checkRemaining = video => {
    if (fadingOutRef.current || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (video.duration - video.currentTime <= .55) {
      fadingOutRef.current = true;
      fade.current.to(0, 250);
    }
  };

  const markDecoded = (video, version, mediaTime) => {
    if (!valid(version) || video !== getVideo() || video.readyState < 2 || video.seeking) return;
    if (expectingStart.current && mediaTime > .5) return;
    if (!decoded.current) {
      decoded.current = true;
      clearTimeout(firstFrameTimer.current); firstFrameTimer.current = null;
      publish('playing');
      if (!readySources.current.has(selected.current)) {
        readySources.current.add(selected.current);
        callbacks.current.onReady?.({ video, source: sources.current[selected.current], fallback: selected.current === 1 });
      }
      if (Number.isFinite(video.duration) && video.duration - video.currentTime <= .55) checkRemaining(video);
      else fade.current.to(1, 250);
    }
    checkRemaining(video);
  };

  const monitor = (video, version) => {
    if (!valid(version)) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      const id = video.requestVideoFrameCallback((_, metadata) => {
        frameMonitor.current = null;
        if (!valid(version)) return;
        markDecoded(video, version, metadata.mediaTime);
        monitor(video, version);
      });
      frameMonitor.current = { video, id };
    } else {
      rafMonitor.current = requestAnimationFrame(() => {
        rafMonitor.current = null;
        if (!valid(version)) return;
        if (sawPlaying.current) fallbackFrames.current += 1;
        // The fallback requires playing + checked readiness + two painted ticks.
        // A timer alone is never evidence that a video frame was decoded.
        if (sawPlaying.current && fallbackFrames.current >= 2 && !video.paused) markDecoded(video, version, video.currentTime);
        monitor(video, version);
      });
    }
  };

  const startCurrent = async (fromLoop = false) => {
    if (!canRun()) return false;
    const video = getVideo();
    if (!video || !sources.current[selected.current]) { controller.current.failSource('missing-source'); return false; }
    stopWork();
    const version = token.current;
    decoded.current = false; sawPlaying.current = false; fallbackFrames.current = 0;
    fadingOutRef.current = false; expectingStart.current = fromLoop || video.currentTime <= .001;
    publish('loading');
    // Register the first-frame monitor BEFORE play, including cached videos.
    monitor(video, version);
    firstFrameTimer.current = setTimeout(() => {
      if (!valid(version) || decoded.current) return;
      stopWork();
      publish('blocked');
    }, 12000);
    try {
      await video.play();
      return valid(version);
    } catch (error) {
      if (!valid(version)) return false;
      if (error?.name === 'NotAllowedError' || error?.name === 'AbortError') {
        stopWork(); publish('blocked');
      } else controller.current.failSource(error?.message || 'playback-failed');
      return false;
    }
  };

  const seekToStart = video => new Promise((resolve, reject) => {
    if (video.currentTime <= .001 && !video.seeking) { resolve(); return; }
    let deadline;
    const clean = () => { clearTimeout(deadline); video.removeEventListener('seeked', done); if (pendingSeek.current?.video === video) pendingSeek.current = null; };
    const done = () => { if (video.seeking || video.currentTime > .05) return; clean(); resolve(); };
    pendingSeek.current = { video, abort: () => { clean(); reject(new Error('cancelled')); } };
    video.addEventListener('seeked', done);
    deadline = setTimeout(() => { clean(); reject(new Error('seek-timeout')); }, 6000);
    try { video.currentTime = 0; } catch (error) { clean(); reject(error); }
  });

  const queueLoop = video => {
    if (!canRun() || video !== getVideo() || loopTimer.current !== null) return;
    fade.current.cancel(); setOpacity(0);
    const version = token.current;
    loopTimer.current = setTimeout(async () => {
      loopTimer.current = null;
      if (!valid(version)) return;
      try {
        await seekToStart(video);
        if (valid(version)) controller.current.startCurrent(true);
      } catch {
        if (valid(version)) { stopWork(); publish('blocked'); }
      }
    }, 100);
  };

  const failSource = reason => {
    const index = selected.current;
    if (failedSources.current.has(index)) return;
    failedSources.current.add(index);
    stopWork();
    for (const video of videos.current) if (video) video.style.opacity = '0';
    opacity.current = 0;
    if (index === 0 && sources.current[1] && !failedSources.current.has(1)) {
      selected.current = 1;
      publish('loading');
      if (canRun()) controller.current.startCurrent();
    } else {
      publish('error');
      callbacks.current.onError?.({ code: 'film-unavailable', message: reason, source: sources.current[index], terminal: true });
    }
  };

  const play = () => {
    manualRequested.current = true; manualPaused.current = false;
    if (statusRef.current === 'error') {
      failedSources.current.clear(); selected.current = sources.current[0] ? 0 : 1;
      getVideo()?.load();
    }
    const video = getVideo();
    if (video && Number.isFinite(video.duration) && video.currentTime >= video.duration - .02) {
      if (!canRun()) return Promise.resolve(false);
      queueLoop(video); return Promise.resolve(true);
    }
    return startCurrent();
  };

  const pause = () => { manualPaused.current = true; stopWork(); publish('paused'); };
  const reconcile = () => {
    if (!canRun()) {
      stopWork();
      if (options.current.reducedMotion && !manualRequested.current) setOpacity(0);
      publish('paused');
      return;
    }
    const video = getVideo();
    if (video && Number.isFinite(video.duration) && video.currentTime >= video.duration - .02) queueLoop(video);
    else startCurrent();
  };
  controller.current = { play, pause, startCurrent, failSource, reconcile };

  useImperativeHandle(forwardedRef, () => ({
    getVideo: () => videos.current[selected.current] || null,
    play: () => controller.current.play(),
    pause: () => controller.current.pause(),
  }), []);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => controller.current.reconcile();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', visibility);
      stopWork();
    };
  }, []);

  useEffect(() => {
    if (previousReducedMotion.current !== reducedMotion) {
      manualRequested.current = false;
      previousReducedMotion.current = reducedMotion;
    }
    controller.current.reconcile();
  }, [active, reducedMotion]);

  return <div className="looping-film" data-film-status={status} data-film-source={selected.current === 1 ? 'fallback' : 'primary'}>
    {poster && <img className="looping-film__poster" src={poster} alt="" aria-hidden="true" draggable="false" onLoad={onPosterReady} style={{ transition: 'none' }} />}
    {sources.current.map((source, index) => source && <video
      key={index}
      ref={element => { videos.current[index] = element; }}
      className="looping-film__video"
      src={source}
      poster={poster}
      muted
      playsInline
      preload={index === 0 ? 'auto' : 'metadata'}
      aria-hidden="true"
      tabIndex={-1}
      style={{ opacity: 0, transition: 'none' }}
      onPlaying={event => { if (event.currentTarget === getVideo()) sawPlaying.current = true; }}
      onTimeUpdate={event => { if (event.currentTarget === getVideo() && canRun()) checkRemaining(event.currentTarget); }}
      onEnded={event => queueLoop(event.currentTarget)}
      onError={event => { if (event.currentTarget === getVideo() && mounted.current) controller.current.failSource(event.currentTarget.error?.message || 'media-error'); }}
    />)}
    {(status === 'blocked' || status === 'error') && <div className="looping-film__notice" role="status">
      <button type="button" onClick={() => controller.current.play()} style={{ pointerEvents: 'auto' }}>
        {status === 'error' ? 'Tentar reproduzir novamente' : 'Reproduzir animação'}
      </button>
    </div>}
  </div>;
});

export default LoopingFilm;
