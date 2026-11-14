export const FILM_RANGE = Object.freeze({ from: .425, to: .85 });

export function filmTimeForProgress(progress, start, end) {
  const fraction = Math.max(0, Math.min(1, (progress - FILM_RANGE.from) / (FILM_RANGE.to - FILM_RANGE.from)));
  return start + fraction * (end - start);
}

// A paused player need not emit another PAUSED event after seeking. Confirm the
// requested time instead, and retain only the visitor's latest destination.
export function createScrollSeekDriver({ readTime, readState, seek, pause, now, start, end }) {
  let pending;
  return {
    tick(progress, active) {
      const time = readTime(), clock = now();
      const target = filmTimeForProgress(progress, start, end);
      if (readState() === 1) pause();
      if (pending && Math.abs(time - pending.target) < .10) pending = undefined;
      if (!active || Math.abs(time - target) < .035) return { time, target };
      if (pending && clock - pending.at < 400) return { time, target };
      pending = { target, at: clock };
      seek(target);
      pause();
      return { time, target };
    },
  };
}
