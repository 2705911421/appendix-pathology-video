export const DEFAULT_PROFILE = 'master';
export const tempoScale = 1.15;
export const bridgeScale = .80;

const master = Object.freeze({
  logicalWidth: 1920,
  logicalHeight: 1080,
  deviceScaleFactor: 2,
  fps: 60,
  videoCodec: 'libx264',
  profile: 'high',
  level: '5.2',
  pixFmt: 'yuv420p',
  crf: 17,
  preset: 'medium',
  maxBitrate: 60,
  reloadIntervalFrames: 360,
  segmentSuffix: '_video',
  tempoScale,
  bridgeScale,
});

const review = Object.freeze({
  logicalWidth: 1920,
  logicalHeight: 1080,
  deviceScaleFactor: 0.5,
  outputWidth: 854,
  outputHeight: 480,
  fps: 12,
  videoCodec: 'libx264',
  pixFmt: 'yuv420p',
  crf: 26,
  preset: 'veryfast',
  reloadIntervalFrames: 240,
  segmentSuffix: '_review_480p',
  tempoScale,
  bridgeScale,
});

const review15 = Object.freeze({
  ...review,
  fps: 15,
  segmentSuffix: '_review_480p_15fps',
});

export const renderProfiles = Object.freeze({ master, review, review15 });
export const renderProfile = renderProfiles[DEFAULT_PROFILE];

export function getRenderProfile(name = DEFAULT_PROFILE) {
  if (!Object.hasOwn(renderProfiles, name)) throw new Error(`未知渲染档位 ${name}（可选 master、review 或 review15）`);
  return renderProfiles[name];
}

export function videoDimensions(profile) {
  return {
    width: profile.outputWidth ?? profile.logicalWidth * profile.deviceScaleFactor,
    height: profile.outputHeight ?? profile.logicalHeight * profile.deviceScaleFactor,
  };
}

export const masterWidth = renderProfile.logicalWidth * renderProfile.deviceScaleFactor;
export const masterHeight = renderProfile.logicalHeight * renderProfile.deviceScaleFactor;

export function displayDensity() {
  const density = globalThis.devicePixelRatio;
  return Number.isFinite(density) && density > 0 ? density : 1;
}

export function inkTick(t) {
  return Math.floor(t * 5);
}
