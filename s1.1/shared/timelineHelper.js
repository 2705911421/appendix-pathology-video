import { clamp, ease, lerp } from './detail/geometry.js';

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
