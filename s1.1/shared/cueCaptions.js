import { prepareStorySubtitles } from './canvasCore.js';

export const CAPTION_HAN_LIMIT = 28;
export const spokenHanCount = text => (text.match(/\p{Script=Han}/gu) ?? []).length;

const graphemes = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
const strongPause = /[。！？；：!?;:]$/u;
const softPause = /[，、,]$|——$/u;
const noLineStart = /^[，。、！？；：”）】》」』、—]/u;
const noLineEnd = /[“（【《「『]$/u;

// Paired clause ends account for translation word order. Each side is still
// sliced from the cue, so subtitles and narration cannot drift in wording.
const pairedPauses = {
  S03: [
    ['麦氏点——', "McBurney's point—"],
    ['临床上将压痛、', 'right ASIS. Tenderness,'],
    ['反跳痛和腹肌紧张', 'with rebound and guarding'],
    ['麦氏点按压疼痛、', 'tenderness alone is not equivalent,'],
  ],
  S07: [['充血水肿而肿胀，', 'congestion and edema;']],
  S12: [
    ['炎症介质释放，', 'prostaglandins, chemokines—'],
    ['被挤出或漏出；', 'so plasma leaks out,'],
    ['黏附，', 'rolling, adhesion,'],
  ],
  S13: [
    ['向肌层与浆膜层蔓延？', 'across the wall?'],
    ['促进纤维素降解，', 'to degrade fibrin'],
    ['局限病灶的纤维素性渗出，', 'dissolving confining exudate'],
  ],
  S14: [
    ['形成大量脓细胞，', 'form pus cells'],
    ['纤维素性脓性渗出物，', 'into a fibrinous-purulent exudate,'],
  ],
  S16: [
    ['浅表糜烂，', 'with superficial erosion,'],
    ['轻度水肿及', 'showing only mild edema and'],
  ],
  S17: [['压迫阑尾壁动脉，', 'compresses mural arteries']],
  S18: [
    ['腐败菌感染形成坏疽，', 'infection of necrotic tissue'],
    ['阑尾才变黑成为急性坏疽性阑尾炎；', 'black acute gangrenous appendicitis.'],
    ['穿孔不一定伴有坏疽，', 'perforation does not require gangrene—'],
  ],
  S19: [
    ['术前如何判断？', 'before surgery?'],
    ['配合体格检查，', 'with physical exam'],
  ],
  S21: [
    ['脂肪清晰；', 'acute simple appendicitis;'],
    ['双环靶征、', 'target sign,'],
    ['阑尾炎伴穿孔时，', 'fat stranding in acute suppurative;'],
  ],
  S22: [
    ['尽早手术切除为主；', 'with prompt appendectomy;'],
    ['须尽快外科评估，', 'needs urgent surgical review—'],
  ],
  S23: [
    ['反复拉锯转为慢性阑尾炎：', 'into chronic appendicitis,'],
    ['炎症刺激导致的增生，', 'where inflammation-induced proliferation'],
  ],
  S24: [
    ['穿插分隔平滑肌层，', 'bundles separating smooth muscle,'],
    ['淋巴细胞与浆细胞浸润；', 'lymphocytes with plasma cells;'],
    ['缓解期择期切除，', 'favors interval elective surgery,'],
  ],
};

function authoredBoundaries(text, anchors) {
  let position = 0;
  const boundaries = [0];
  for (const anchor of anchors) {
    const match = text.indexOf(anchor, position);
    if (match < 0) return null;
    position = match + anchor.length;
    boundaries.push(position);
  }
  return [...boundaries, text.length];
}

function chineseBoundaries(text, highlights) {
  const units = [...graphemes.segment(text)];
  const counts = [0];
  for (const { segment } of units) counts.push(counts.at(-1) + spokenHanCount(segment));
  if (counts.at(-1) <= CAPTION_HAN_LIMIT) return [0, text.length];

  const offsets = [...units.map(({ index }) => index), text.length];
  const totalPages = Math.max(4, Math.ceil(counts.at(-1) / CAPTION_HAN_LIMIT));
  const costs = offsets.map((offset, i) => {
    if (i === 0 || i === units.length) return 0;
    const before = text.slice(0, offset);
    const after = text.slice(offset);
    const insideTerm = highlights.some(term => {
      const from = text.lastIndexOf(term, offset - 1);
      return from >= 0 && from + term.length > offset;
    });
    const cost = strongPause.test(before) ? 0 : softPause.test(before) ? 2 : 38;
    return cost + (insideTerm ? 90 : 0) +
      (noLineStart.test(after) || noLineEnd.test(before) || /[A-Za-z0-9]$/u.test(before) && /^[A-Za-z0-9]/u.test(after) ? 150 : 0);
  });

  const options = offsets.map(() => Array(totalPages + 1).fill(null));
  options[0][0] = { cost: 0, cuts: [0] };
  for (let end = 1; end < offsets.length; end++) {
    for (let start = end - 1; start >= 0; start--) {
      const length = counts[end] - counts[start];
      if (length > CAPTION_HAN_LIMIT) break;
      if (!length) continue;
      for (let pages = 1; pages <= totalPages; pages++) {
        const previous = options[start][pages - 1];
        if (!previous) continue;
        const cost = previous.cost + costs[end] + 5 + .065 * (CAPTION_HAN_LIMIT - length) ** 2;
        if (cost < (options[end][pages]?.cost ?? Infinity)) {
          options[end][pages] = { cost, cuts: [...previous.cuts, offsets[end]] };
        }
      }
    }
  }
  return options.at(-1).filter(Boolean).reduce((best, result) => result.cost < best.cost ? result : best).cuts;
}

function englishBoundaries(text, fractions) {
  const candidates = [0, ...[...text.matchAll(/(?<=\S) +|(?<=\S)—(?=\S)/gu)]
    .map(match => match.index + match[0].length), text.length];
  const cuts = [0];
  for (const [i, fraction] of fractions.slice(0, -1).entries()) {
    let best = cuts.at(-1) + 1;
    let score = Infinity;
    for (let j = best; j < candidates.length - (fractions.length - i - 1); j++) {
      const at = candidates[j];
      const punctuation = /[,.!?;:—]$/u.test(text.slice(0, at).trimEnd());
      const cost = Math.abs(at - fraction * text.length) + (punctuation ? 0 : 9);
      if (cost < score) {
        best = j;
        score = cost;
      }
    }
    cuts.push(best);
  }
  return [...cuts.map(i => candidates[i]), text.length];
}

export function prepareProductionSubtitles({ id, zhText, enText, highlightZh = [] }) {
  const paired = pairedPauses[id];
  let chinese = paired && authoredBoundaries(zhText, paired.map(([zh]) => zh));
  let english = paired && authoredBoundaries(enText, paired.map(([, en]) => en));
  if (!chinese || !english || chinese.slice(1).some((end, i) =>
    spokenHanCount(zhText.slice(chinese[i], end)) > CAPTION_HAN_LIMIT)) {
    chinese = chineseBoundaries(zhText, highlightZh);
    english = null;
  }
  const total = spokenHanCount(zhText);
  const pageEnds = chinese.slice(1).map(end => spokenHanCount(zhText.slice(0, end)) / total);
  english ??= englishBoundaries(enText, pageEnds);
  const pages = chinese.slice(1).map((end, i) => {
    const { pages: [page] } = prepareStorySubtitles({
      text: zhText.slice(chinese[i], end), highlights: highlightZh,
    }, enText.slice(english[i], english[i + 1]), { singlePage: true });
    if (!page.en) throw new Error('Missing English subtitle page in ' + id);
    return page;
  });
  return { pages, pageEnds };
}
