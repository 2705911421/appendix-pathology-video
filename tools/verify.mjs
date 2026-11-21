import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditText, textRules} from './check_text.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'out', 'submission.mp4');
const qa = path.join(root, 'qa');
const snapshots = path.join(qa, 'frames');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const json = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const execute = (program, args) => execFileSync(program, args, {encoding: 'utf8', stdio: ['ignore','pipe','pipe'], maxBuffer: 16 << 20});
const probe = file => JSON.parse(execute(ffprobe, ['-v','error','-show_streams','-show_format','-show_chapters','-of','json',file]));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pcm16 = buffer => new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

async function readWav(name, sampleRate) {
  const file = await fs.readFile(path.join(root, 'audio', name));
  assert(file.toString('ascii', 0, 4) === 'RIFF' && file.toString('ascii', 8, 12) === 'WAVE', 'Invalid WAV');
  let position = 12;
  let validFormat = false;
  while (position + 8 <= file.length) {
    const name = file.toString('ascii', position, position + 4);
    const size = file.readUInt32LE(position + 4);
    const start = position + 8;
    assert(start + size <= file.length, 'Incomplete WAV chunk');
    if (name === 'fmt ') {
      validFormat = file.readUInt16LE(start) === 1 && file.readUInt16LE(start + 2) === 1 &&
        file.readUInt32LE(start + 4) === sampleRate && file.readUInt16LE(start + 14) === 16;
    } else if (name === 'data') {
      assert(validFormat && !(size & 1), 'Expected 16-bit mono PCM');
      return pcm16(file.subarray(start, start + size));
    }
    position = start + size + (size & 1);
  }
  throw Error('WAV payload not found');
}

function ffmpegOutput(args, options = {}) {
  const process = spawnSync(ffmpeg, ['-hide_banner','-nostats','-xerror', ...args], {
    maxBuffer: 52 << 20, ...options,
  });
  if (process.status !== 0) throw Error(process.stderr?.toString() || process.error?.message || 'FFmpeg validation failed');
  return process;
}

const source = await json('film/timeline.json');
const canvas = await json('qa/canvas.json');
const timing = await json('qa/audio.json');
const script = (await fs.readFile(path.join(root, 'film', 'script.psv'), 'utf8'))
  .split(/\r?\n/u).filter(line => line && !line.startsWith('#')).map(line => line.split('|'));
const media = probe(output);
const [video, audio] = media.streams;
const duration = Number(media.format.duration);
assert(duration >= 290 && duration <= 315, 'Video duration outside 290–315 seconds');
assert(media.streams.length === 2 && video.codec_type === 'video' && audio.codec_type === 'audio', 'Expected one video stream and one audio stream');
assert(video.width === 1920 && video.height === 1080 && video.r_frame_rate === '30/1' && video.codec_name === 'h264', 'Video spec mismatch');
assert(+video.nb_frames === source.frames && Math.abs(duration - source.frames / source.fps) < 1 / 30, 'Timeline and MP4 durations differ');
assert(Math.abs(+audio.duration - duration) < 1 / 30 && audio.codec_name === 'aac', 'AAC audio out of sync');
const creditsSeconds = (source.frames - source.creditsFrame) / source.fps;
assert(creditsSeconds >= 6 && creditsSeconds <= 8, 'Credits exposure outside six to eight seconds');
assert(timing.totalSeconds === duration && timing.beats.length === source.cues.length, 'Measured beats do not match final MP4');
assert(canvas.simpleMuscle.length === 4 && canvas.deterministicSeek, 'Canvas checks failed');
assert(canvas.storyChecks?.endingHasSidebar === false && canvas.storyChecks.chronic.grey, 'Scene color state failed');
assert(canvas.storyChecks.focus.every((lights,i)=>lights[i+1]>.9 && lights.every((w,k)=>k===i+1 || w<.05)), 'CT stage focus failed');
const {timedCuts, overviewFrames} = canvas.storyChecks;
assert(timedCuts.alarm===64 && timedCuts.rupture===184 && timedCuts.ctOverview===204 &&
  timedCuts.ct0===207 && overviewFrames===90, 'Required shot start or CT overview duration changed');
assert(canvas.annotation.count > 0 && canvas.annotation.minSize>=24 && !canvas.annotation.problems.length,
  'Annotation ink, size or framing failed');
const recap = canvas.storyChecks.recap;
assert(recap.slice(0,3).map(lights=>lights.indexOf(Math.max(...lights))).join() === '0,1,2' &&
  recap[3].every(light=>Math.abs(light-.28)<.01), 'Recap color sequence or settled state failed');
assert(script.length === source.cues.length && canvas.subtitleMetrics.length === script.length, 'Script and caption count differs');
for (const [index, [act, shot, zh, en, spoken = zh]] of script.entries()) {
  const cue = source.cues[index];
  assert(+act === cue.act && shot === cue.shot && zh === cue.zh && en === cue.en, `Script mismatch at cue ${index + 1}`);
  assert(!/[A-Za-z<>]/u.test(spoken.replace(/(?<![A-Za-z])C ?T(?![A-Za-z])/gu,'')), 'Unexpected synthesis markup or wording');
  assert(!/[\u2018\u2019]/u.test(en), 'An English subtitle uses a curly apostrophe');
  const key = createHash('sha256').update(`${timing.voice}|${spoken}`).digest('hex').slice(0,16);
  const cached = await fs.readFile(path.join(root,'audio','sentences',`${key}.mp3`));
  assert(createHash('sha256').update(cached).digest('hex') === timing.beats[index].sha256,
    `Original TTS cue ${index + 1} differs from its build record`);
}

assert(textRules.every(([, term]) => !term.test(JSON.stringify(media))) && media.chapters.length === 0,
  'Unwanted container metadata or chapters');
const allowedTags = new Set(['major_brand','minor_version','compatible_brands','language','vendor_id','handler_name']);
for (const tags of [media.format.tags || {}, ...media.streams.map(stream => stream.tags || {})]) {
  for (const [tag, value] of Object.entries(tags)) {
    assert(allowedTags.has(tag) && (tag !== 'handler_name' || !value || /^(VideoHandler|SoundHandler)$/.test(value)), `Unexpected metadata tag ${tag}`);
  }
}
const text = await auditText();
assert(!text.findings.length, `Text audit failed: ${JSON.stringify(text.findings)}`);
assert(+video.start_time === 0 && +audio.start_time === 0, 'Video and audio must start at sample zero');
const framesPerSecond = source.fps;
const {sampleRate, activeThreshold} = timing;
const frameSamples = sampleRate / framesPerSecond;
assert(Number.isInteger(frameSamples), 'Expected audio samples to align with video frames');
const speech = await readWav('narration.wav', sampleRate);
const mix = await readWav('mix.wav', sampleRate);
const decodedAudio = pcm16(ffmpegOutput(['-v','error','-i',output,'-map','0:a:0','-f','s16le','-']).stdout);
const expectedSamples = source.frames * frameSamples;
assert(speech.length === expectedSamples && mix.length === expectedSamples &&
  decodedAudio.length >= expectedSamples && decodedAudio.length - expectedSamples <= 1024,
'PCM length differs from its video timeline');
let cursor = 0;
let shortestEndGuard = Infinity;
let minAacCorrelation = 1;
source.cues.forEach((cue, index) => {
  assert(cue.startFrame === cursor, `Timeline discontinuity at cue ${index + 1}`);
  assert(cue.endFrame - cue.startFrame - cue.audioFrames === 21 && cue.audioFrames > 0, `Caption hold at cue ${index + 1}`);
  const beat = timing.beats[index];
  assert(beat.audioDuration === cue.audioFrames / framesPerSecond, 'Measured audio duration differs');
  const from = cue.startFrame * frameSamples;
  const speechEnd = from + cue.audioFrames * frameSamples;
  const to = cue.endFrame * frameSamples;
  assert(beat.fittedSamples <= speechEnd - from && beat.lastActiveSample < beat.fittedSamples,
    `Cue ${index + 1} was cropped`);
  let first = -1, last = -1, aa = 0, ab = 0, bb = 0;
  for (let i = from; i < speechEnd; i++) {
    if (Math.abs(speech[i]) > activeThreshold) {
      if (first < 0) first = i - from;
      last = i - from;
    }
    aa += mix[i] * mix[i];
    ab += mix[i] * decodedAudio[i];
    bb += decodedAudio[i] * decodedAudio[i];
  }
  assert(first === beat.firstActiveSample && last === beat.lastActiveSample &&
    beat.fittedSamples - last - 1 >= Math.ceil(.024 * sampleRate),
  `Cue ${index + 1} has the wrong speech boundaries`);
  assert(speech.subarray(speechEnd, to).every(sample => sample === 0), `Cross-cue speech overlap at cue ${index + 1}`);
  shortestEndGuard = Math.min(shortestEndGuard, (speechEnd - 1 - from - last) / sampleRate);
  const correlation = ab / Math.sqrt(aa * bb);
  assert(correlation >= .985, `MP4 audio does not match the approved mix at cue ${index + 1}: ${correlation}`);
  minAacCorrelation = Math.min(minAacCorrelation, correlation);
  cursor = cue.endFrame;
  assert((cue.zh.match(/[\u3400-\u9fff]/gu) || []).length <= 24, `Chinese line too long at cue ${index + 1}`);
  const metrics = canvas.subtitleMetrics[index];
  const inSafeArea = ([left, right]) => Number.isFinite(left + right) && left >= 130 && right <= 1790 && right > left;
  assert(metrics.chinese <= 1660 && metrics.english.length === 1 && metrics.english[0] <= 1660 &&
    inSafeArea(metrics.chineseInkX) && inSafeArea(metrics.englishInkX), `Text outside safe area at cue ${index + 1}`);
});
assert(cursor === source.creditsFrame, 'Subtitle extends into the end card');

const lastSpeech = source.creditsFrame * frameSamples;
assert(mix.subarray(lastSpeech).every(value => value === 0) &&
  decodedAudio.subarray(lastSpeech, expectedSamples).every(value => Math.abs(value) <= 1),
'The end card mix is not silent');
let previousSpeech = 0, maxPause = 0;
for (let index = 0; index < lastSpeech; index++) {
  if (Math.abs(speech[index]) > activeThreshold) {
    maxPause = Math.max(maxPause, index - previousSpeech);
    previousSpeech = index;
  }
}
maxPause = Math.max(maxPause, lastSpeech - previousSpeech) / sampleRate;
assert(maxPause <= 2, 'Unexpected dialogue pause exceeds two seconds');
const mediaLog = ffmpegOutput(['-v','info','-i',output,'-vf','blackdetect=d=0.5:pix_th=0.10:pic_th=0.98',
  '-af','silencedetect=n=-45dB:d=1.5,ebur128=peak=true:framelog=verbose','-f','null','-'], {encoding:'utf8'}).stderr;
const black = [...mediaLog.matchAll(/black_duration:\s*([\d.]+)/gu)].map(m => Number(m[1]));
const audioSilence = [...mediaLog.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/gu)]
  .map(([, end, length]) => ({end: +end, duration: +length}));
assert(black.every(length => length < 2), 'Abnormal black screen');
assert(audioSilence.every(({end, duration: length}) => length < 2 || end >= duration - .05 && length >= 6 && length <= 8),
  'Abnormal audio silence');
const integratedLufs = Number(mediaLog.match(/Integrated loudness:\s*I:\s*(-?[\d.]+)/u)?.[1]);
const truePeakDb = Number(mediaLog.match(/True peak:\s*Peak:\s*(-?[\d.]+)/u)?.[1]);
assert(Number.isFinite(integratedLufs) && Number.isFinite(truePeakDb), 'Missing loudness metrics');

// Sample the illustration, excluding the captions and sidebar. Ignore small codec fluctuations.
const motionWidth=256, motionHeight=156, motionArea=motionWidth*motionHeight;
const motion = ffmpegOutput(['-v','error','-i',output,'-an','-vf',
  'fps=2,crop=1360:834:510:50,scale=256:156:flags=area,format=gray','-f','rawvideo','-pix_fmt','gray','-']).stdout;
const motionFrames=motion.length/motionArea;
assert(Number.isInteger(motionFrames) && motionFrames === Math.round(duration*2), 'Incomplete motion samples');
let previousMove=0, longestMotionGap=0;
for (let i=1;i<motionFrames;i++) {
  const offset=i*motionArea, previous=previousMove*motionArea;
  let changed=0;
  for (let pixel=0;pixel<motionArea;pixel++) {
    if (Math.abs(motion[offset+pixel]-motion[previous+pixel])>=3) changed++;
  }
  if (changed >= motionArea*.0012) {
    longestMotionGap=Math.max(longestMotionGap,(i-previousMove)/2);
    previousMove=i;
  }
}
longestMotionGap=Math.max(longestMotionGap,(motionFrames-previousMove)/2);
assert(longestMotionGap<=4, 'The main illustration holds without visible change for more than four seconds');

await fs.mkdir(snapshots,{recursive:true});
const times = Array.from({length: Math.ceil(duration / 15)}, (_, i) => 15 * i);
execute(ffmpeg, ['-hide_banner','-v','error','-xerror','-y','-i',output,'-vf','select=not(mod(n\\,450))',
  '-fps_mode','vfr','-q:v','2','-start_number','0',path.join(snapshots,'every-15s-%03d.jpg')]);
const directed = [
  ['arm-joints', cue => cue.act === 2 && cue.shot === 'target'],
  ['simple-four-cells', cue => cue.shot === 'simple'],
  ['phlegmon-muscle', cue => cue.shot === 'phlegmon'],
  ['fibrin-pus', cue => cue.shot === 'serosa'],
  ['CT-comparison', cue => cue.shot === 'ct2'],
  ['chronic-fibrosis', cue => cue.shot === 'fibrosis'],
  ['end-card', null],
];
for (const [label, filter] of directed) {
  const cue = filter && source.cues.find(filter);
  const t = cue ? (cue.startFrame + Math.round(cue.audioFrames * .75)) / source.fps : (source.creditsFrame + 25) / source.fps;
  execute(ffmpeg, ['-hide_banner','-v','error','-xerror','-y','-ss',t.toFixed(4),'-i',output,
    '-frames:v','1','-q:v','2',path.join(snapshots,`${label}.jpg`)]);
}
const count = (await fs.readdir(snapshots)).filter(file => /^every-15s-\d{3}\.jpg$/.test(file)).length;
assert(count === times.length, 'The 15-second frame sequence is incomplete');

const hash = createHash('sha256');
for await (const chunk of createReadStream(output)) hash.update(chunk);
const result = {
  durationSeconds: duration, resolution: [video.width,video.height], frameRate: 30,
  videoFrames: source.frames, codecs: [video.codec_name,audio.codec_name],
  sourceTtsSeconds: timing.ttsSourceSeconds, fittedNarrationSeconds: timing.fittedSpeechSeconds,
  sentenceGapSeconds: .7, totalGapSeconds: timing.bufferSeconds,
  creditsSeconds, timedCuts, overviewFrames, canvasAnnotations: canvas.annotation,
  maxChineseWidth: Math.max(...canvas.subtitleMetrics.map(x => x.chinese)),
  maxEnglishWidth: Math.max(...canvas.subtitleMetrics.flatMap(x => x.english)),
  simpleMuscleNeutrophils: canvas.simpleMuscle.length, extractedSeconds: times,
  chapterCount: media.chapters.length, metadata: media.format.tags, silentCredits: true,
  checkedTextFiles: text.files, subtitleCueCount: source.cues.length,
  minCaptionInkX: Math.min(...canvas.subtitleMetrics.flatMap(x => [x.chineseInkX[0], x.englishInkX[0]])),
  maxCaptionInkX: Math.max(...canvas.subtitleMetrics.flatMap(x => [x.chineseInkX[1], x.englishInkX[1]])),
  shortestEndGuardSeconds: shortestEndGuard, maxDialoguePauseSeconds: maxPause,
  minAacCorrelation, integratedLufs, truePeakDb, blackDetectedSeconds: black, audioSilence,
  checkedMotionFrames: motionFrames, maxIllustrationMotionGapSeconds: longestMotionGap,
  sha256: hash.digest('hex'),
};
await fs.writeFile(path.join(qa,'final.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
