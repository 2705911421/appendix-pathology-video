const identity = /\u4e09[\u5ce1\u5cfd]\u5927[\u5b66\u5b78]|[\u533b\u91ab][\u5b66\u5b78]\u9662|[\u5b66\u5b78][\u53f7\u865f]|\u59d3\u540d|\u73ed[\u7ea7\u7d1a]|\u6307[\u5bfc\u5c0e](?:\u6559|\u8001)[\u5e08\u5e2b]|\b(?:three\x20gorges\x20university|medical (?:college|school)|student\s+(?:id|number)|(?:student|team|author)\s+name|faculty\x20advisor|supervisor)\b/iu;
const placeholder = /\[\s*\u5f85\s*\u586b\s*\]|\{\{\s*(?:name|student_id|school|class|supervisor)\s*\}\}/iu;

export function assertBlindReviewText(text) {
  if (typeof text !== 'string') throw new TypeError('Expected blind-review text');
  const normalized = text.normalize('NFKC').replace(/\p{Cf}/gu, '');
  const compact = normalized.replace(/\s/gu, '').replaceAll('【', '[').replaceAll('】', ']');
  if (identity.test(normalized) || identity.test(compact) || placeholder.test(compact)) {
    throw new Error('画面或时间表含盲审禁用信息');
  }
  return text;
}
