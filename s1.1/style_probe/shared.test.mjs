import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APPENDIX_TO_CECUM } from '../shared/anatomyWatercolor.js';
import { mulberry32, prepareStorySubtitles, storySubtitleAt } from '../shared/canvasCore.js';
import { validateFilmCues } from '../shared/cues.js';

const text = '可到了傍晚，这股疼突然“搬了家”，死死钉在了右下腹。';
const read = page => page.zh.map(run => run.text).join('');

test('subtitle pages split at punctuation and keep the highlighted text on one line', () => {
  const subtitles = prepareStorySubtitles({ text, highlights: ['右下腹'] },
    ['By evening, the pain had moved,', 'and it wouldn’t let up.']);
  assert.equal(subtitles.pages.length, 2);
  assert.match(read(subtitles.pages[0]), /，$/u);
  assert.equal(subtitles.pages.map(read).join(''), text);
  assert.ok(subtitles.pages[1].zh.some(run => run.highlight && run.text === '右下腹'));
  assert.equal(subtitles.pages[1].en, "and it wouldn't let up.");
  const before = storySubtitleAt(subtitles, subtitles.breakAt - .001);
  const after = storySubtitleAt(subtitles, subtitles.breakAt);
  assert.equal(before.page, subtitles.pages[0]);
  assert.equal(after.page, subtitles.pages[1]);
  assert.equal(before.opacity, 1);
  assert.ok(after.opacity >= .90 && after.offset <= 3);
  assert.equal(storySubtitleAt(subtitles, subtitles.breakAt + .03).offset, 0);
});

test('the subtitle boundary counts Unicode characters and keeps exactly two pages past 22', () => {
  const cjk = '阑'.repeat(22);
  const last = '𠮷';
  assert.equal(prepareStorySubtitles(cjk, 'Appendix').pages.length, 1);
  const longer = prepareStorySubtitles(cjk + last, 'Line one\n line two');
  assert.equal(longer.pages.length, 2);
  assert.equal(longer.pages.map(read).join(''), cjk + last);
  assert.deepEqual(longer.pages.map(page => page.en), ['Line one', 'line two']);
});

test('geometry keeps an anterior appendix of the required length and a repeatable random sequence', () => {
  assert.ok(APPENDIX_TO_CECUM >= 1.5 && APPENDIX_TO_CECUM <= 1.8);
  const sequence = seed => {
    const random = mulberry32(seed);
    return Array.from({ length: 10 }, () => random());
  };
  assert.deepEqual(sequence(203), sequence(203));
  assert.notDeepEqual(sequence(203), sequence(204));
});

function sheets() {
  return Array.from({ length: 6 }, (_, index) => ({
    module: `s1.1-${index + 1}`, duration: 50,
    cues: [{ id: 'S1', start: 0, end: 11 / 30, zh: '镜下所见', en: 'Microscopy' }, { id: 'S2', start: 11 / 30, end: 50 }],
  }));
}

test('six cue sheets accept an elastic duration and still cover every picture frame', () => {
  const input = sheets();
  const film = validateFilmCues(input.toReversed());
  assert.equal(film.duration, 300);
  assert.equal(film.frames, 9000);
  assert.deepEqual(film.sections.at(-1), { module: 's1.1-6', startFrame: 7500, endFrame: 9000 });
  input[0].duration += 1 / 30;
  input[0].cues.push({ id: 'B01', type: 'bridge', start: 50, end: 50 + 1 / 30 });
  assert.equal(validateFilmCues(input).frames, 9001);
  input[0].cues.at(-1).zh = '桥段有字幕';
  assert.throws(() => validateFilmCues(input), /Silent cue/);
  delete input[0].cues.at(-1).zh;
  input[0].cues[1].start += 1 / 30;
  assert.throws(() => validateFilmCues(input), /continuously/);
  input[0].cues[1].start += .001;
  assert.throws(() => validateFilmCues(input), /frame grid/);
});

test('the shared caption and cue entry points reject undisclosed identity fields and audio metadata', () => {
  for (const text of ['\u3010\u5f85\u586b\u3011', '\u4e09\u5ce1\u5927\u5b66', '\u0053tudent ID: 01234']) {
    const input = sheets();
    input[0].cues[0].zh = text;
    assert.throws(() => validateFilmCues(input), /盲审/);
    assert.throws(() => prepareStorySubtitles(text, ''), /盲审/);
  }
  const input = sheets();
  input[0].cues[0].audio = 'voice.wav';
  assert.throws(() => validateFilmCues(input), /visual cue format/);
});
