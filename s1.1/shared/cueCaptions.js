import { prepareStorySubtitles } from './canvasCore.js';

export const spokenHanCount = text => (text.match(/\p{Script=Han}/gu) ?? []).length;

function splitAfter(text, endings, id) {
  let start = 0;
  const pages = endings.map(ending => {
    const index = text.indexOf(ending, start);
    if (index < 0) throw new Error(`Subtitle break missing for ${id}: ${ending}`);
    const end = index + ending.length;
    const page = text.slice(start, end).trim();
    start = end;
    return page;
  });
  return [...pages, text.slice(start).trim()];
}

// Bilingual page boundaries follow the spoken clauses. Default page times follow their Han counts.
export function prepareCueCaptionPages({ id, zhText, enText, highlightZh }, cuts) {
  const chinese = splitAfter(zhText, cuts.map(([zh]) => zh), id);
  const english = splitAfter(enText, cuts.map(([, en]) => en), id);
  const total = spokenHanCount(zhText);
  let elapsed = 0;
  return chinese.map((text, i) => {
    elapsed += spokenHanCount(text);
    return {
      until: cuts[i]?.[2] ?? (i === chinese.length - 1 ? 1 : elapsed / total),
      caption: prepareStorySubtitles({ text, highlights: highlightZh }, english[i], { singlePage: true }),
    };
  });
}

export function cueCaptionAt(pages, p) {
  return (pages.find(page => p < page.until) ?? pages.at(-1)).caption;
}
