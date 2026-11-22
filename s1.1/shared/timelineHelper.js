import { clamp, ease, easeOutCubic, lerp } from './detail/geometry.js';
import { bridgeScale } from './renderProfile.js';

export const CREDIT_FADE_FRACTION = .08;

export function cueType(cue) {
  const type = cue.type ?? (cue.isCredits || cue.id === 'S26' ? 'credits' : 'speech');
  if (!['speech', 'bridge', 'credits'].includes(type)) throw new TypeError(`Invalid cue type for ${cue.id}`);
  return type;
}

export function cueDurationMs(cue, { defaults = false } = {}) {
  const type = cueType(cue);
  const base = cue.defaultDuration ?? cue.duration ?? (cue.end - cue.start);
  const seconds = type === 'bridge' ? base * bridgeScale : type === 'speech' && !defaults ? cue.duration ?? base : base;
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
    const base = type === 'bridge' ? { defaultDuration: cue.defaultDuration ?? cue.duration } : {};
    return { ...cue, ...base, type, start, end: cursor / 1000, duration: ms / 1000 };
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
