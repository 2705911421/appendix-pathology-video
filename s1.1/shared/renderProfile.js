export const renderProfile = Object.freeze({
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
  reloadIntervalFrames: 360,
});

export const masterWidth = renderProfile.logicalWidth * renderProfile.deviceScaleFactor;
export const masterHeight = renderProfile.logicalHeight * renderProfile.deviceScaleFactor;

export function displayDensity() {
  const density = globalThis.devicePixelRatio;
  return Number.isFinite(density) && density > 0 ? density : 1;
}

export function inkTick(t) {
  return Math.floor(t * 5);
}
