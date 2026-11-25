import { clamp, ease, easeOutCubic, lerp } from './detail/geometry.js';
import { bridgeScale, tempoScale } from './renderProfile.js';

export const CREDITS_TIMING = Object.freeze({ duration: 6.5, fadeIn: .6, fadeOut: .8 });
export const CREDIT_FADE_FRACTION = CREDITS_TIMING.fadeIn / CREDITS_TIMING.duration;
export const RECOVERY_FADE_SECONDS = .7;

export function cueType(cue) {
  const type = cue.type ?? (cue.isCredits || cue.id === 'S26' ? 'credits' : 'speech');
  if (!['speech', 'bridge', 'credits'].includes(type)) throw new TypeError(`Invalid cue type for ${cue.id}`);
  return type;
}

export function cueDurationMs(cue, { defaults = false } = {}) {
  const type = cueType(cue);
  const base = cue.defaultDuration ?? cue.duration ?? (cue.end - cue.start);
  const seconds = (!defaults && cue.effectiveDuration !== undefined) ? cue.effectiveDuration
    : type === 'bridge' ? Math.max(1.3, Number((base * bridgeScale).toFixed(2)))
      : type === 'speech' ? Math.max(2.4, Number((base / tempoScale).toFixed(2))) : base;
  const ms = Math.round(seconds * 1000);
  if (!Number.isSafeInteger(ms) || ms <= 0) throw new RangeError(`Invalid duration for ${cue.id}`);
  return ms;
}

export function timeCueSheet(sheet) {
  let cursor = 0;
  const cues = sheet.cues.map(cue => {
    const type = cueType(cue);
    const ms = cueDurationMs(cue);
    const start = cursor / 1000;
    cursor += ms;
    const defaultDuration = cue.defaultDuration ?? cue.duration ?? (cue.end - cue.start);
    return { ...cue, type, defaultDuration, effectiveDuration: ms / 1000, start, end: cursor / 1000, duration: ms / 1000 };
  });
  return { ...sheet, cues, duration: cursor / 1000 };
}

export function createCueTimeline({ duration, cues }) {
  const byId = new Map(cues.map(cue => [cue.id, cue]));
  return {
    at(seconds) {
      if (!Number.isFinite(seconds)) throw new TypeError('Cue time must be finite');
      const time = clamp(seconds, 0, duration);
      const cue = cues.find(item => time < item.end) ?? cues.at(-1);
      return { cue, p: clamp((time - cue.start) / (cue.end - cue.start)) };
    },
    seek(id, progress) {
      const cue = byId.get(id);
      if (!cue) throw new RangeError(`Unknown cue ${id}`);
      if (!Number.isFinite(progress)) throw new TypeError('Cue progress must be finite');
      return { cue, p: clamp(progress) };
    },
  };
}

export const phase = (p, start, end) => ease((p - start) / (end - start));
export const phaseOut = (p, start, end) => easeOutCubic((p - start) / (end - start));
export const cubicInOut = value => {
  const p = clamp(value);
  return p < .5 ? 4 * p ** 3 : 1 - ((-2 * p + 2) ** 3) / 2;
};

export function pushTo({ x, y }, from, to, progress) {
  const scale = lerp(from, to, clamp(progress));
  const dx = x * (1 - scale);
  const dy = y * (1 - scale);
  return {
    scale,
    transform: `matrix(${scale} 0 0 ${scale} ${dx} ${dy})`,
    project: point => ({ x: point.x * scale + dx, y: point.y * scale + dy }),
  };
}
