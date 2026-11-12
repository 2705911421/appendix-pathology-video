// Add microscope ranges here; all anchors resolve against the supplied real cues.
export const MICROSCOPE_RANGES = [
  { scene: 'S10', first: '37', last: '42', enterBefore: 0.45, enterAfter: 0.25, exitHold: 0.8, exitAfter: 1.5 },
  { scene: 'S08', first: '29', last: '34', enterBefore: 0.45, enterAfter: 0.25, exitAfter: 0.7 },
];
export function resolveRanges(cues, ranges = MICROSCOPE_RANGES) {
  return ranges.map(r => {
    const first = cues.find(c => c.id === r.first), last = cues.find(c => c.id === r.last);
    if (!first || !last) throw new Error(`Missing theme anchors: ${r.scene}`);
    return { ...r, enterStart: first.start - r.enterBefore, enterEnd: first.start + r.enterAfter,
      exitStart: last.end + (r.exitHold || 0), exitEnd: last.end + r.exitAfter };
  });
}
export const smooth = x => { x = Math.max(0, Math.min(1, x)); return x*x*(3-2*x); };
export function darkAt(t, cues, ranges = MICROSCOPE_RANGES) {
  return resolveRanges(cues, ranges).reduce((a, r) => Math.max(a,
    smooth((t-r.enterStart)/(r.enterEnd-r.enterStart)) *
    (1-smooth((t-r.exitStart)/(r.exitEnd-r.exitStart)))), 0);
}
