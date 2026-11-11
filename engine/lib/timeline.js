// Data-driven timing. Source priority: audio/narration.json (real TTS) > data/sentences.tsv (estimate).
// Beats are keyed as at(i, off) = start of sentence i + off seconds, or frac(i, f) = point f∈[0,1] inside sentence i.
export async function loadTimeline() {
  let S = null;
  try { const r = await fetch('audio/narration.json'); if (r.ok) { const j = await r.json();
    const segs = j.segments || [];
    // narration.json ids are expected as "<ch>-<n>" (e.g. "01-2"); fall back to TSV chapter mapping by order
    S = segs.map((s, i) => ({ i, ch: (s.ch || String(s.id || '').split('-')[0] || ''), start: +s.start, end: +s.end, text: s.text })); } } catch (e) {}
  const tsv = await (await fetch('data/sentences.tsv')).text();
  const rows = tsv.trim().split('\n').slice(1).map(l => l.split('\t')).map((c, i) => ({ i, ch: c[0].trim(), start: +c[1], end: +c[2], text: c[4].trim() }));
  if (S && S.length === rows.length) S.forEach((s, i) => { if (!/^\d\d$/.test(s.ch)) s.ch = rows[i].ch; });
  else S = rows;
  const CH = {};
  S.forEach(s => { const c = CH[s.ch] || (CH[s.ch] = { id: s.ch, start: s.start, end: s.end, idx: [] }); c.end = Math.max(c.end, s.end); c.idx.push(s.i); });
  const DUR_CONTENT = S[S.length - 1].end;
  const at = (i, off = 0) => S[i].start + off;
  const end = (i, off = 0) => S[i].end + off;
  const frac = (i, f) => S[i].start + (S[i].end - S[i].start) * f;
  return { S, CH, DUR_CONTENT, at, end, frac, source: S === rows ? 'tsv' : 'narration.json' };
}
