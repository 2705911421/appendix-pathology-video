export const SANS_FACE = 'Noto Sans SC Variable';
export const SERIF_FACE = 'Noto Serif SC Variable';
export const HAND_FACE = 'LXGW WenKai';

const sansFallback = "'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
const serifFallback = "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, 'Microsoft YaHei', serif";
export const SANS_FONT = `'${SANS_FACE}', ${sansFallback}`;
export const SERIF_FONT = `'${SERIF_FACE}', ${serifFallback}`;
export const HAND_FONT = `'${HAND_FACE}', KaiTi, STKaiti, ${SERIF_FONT}`;
export const ENGLISH_FONT = `'${SANS_FACE}', 'Segoe UI', Arial, ${sansFallback}`;
export const NUMERAL_FONT = `'${SERIF_FACE}', Georgia, 'Times New Roman', ${serifFallback}`;
