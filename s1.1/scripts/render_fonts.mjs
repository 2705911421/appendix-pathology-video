import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { HAND_FACE, SANS_FACE, SERIF_FACE } from '../shared/fonts.js';

const require = createRequire(import.meta.url);
const sheets = [
  ['sans', '@fontsource-variable/noto-sans-sc/index.css'],
  ['serif', '@fontsource-variable/noto-serif-sc/index.css'],
  ['hand', 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'],
  ['hand', 'lxgw-wenkai-webfont/lxgwwenkai-bold.css'],
];

async function readFonts() {
  const files = new Map();
  const styles = await Promise.all(sheets.map(async ([folder, specifier]) => {
    const file = require.resolve(specifier);
    const css = await readFile(file, 'utf8');
    return css.replace(/url\(['"]?\.\/files\/([\w.-]+\.woff2)['"]?\)/gu, (_, name) => {
      const route = `/fonts/${folder}/${name}`;
      files.set(route, path.join(path.dirname(file), 'files', name));
      return `url(${route})`;
    }).replaceAll('font-display: swap', 'font-display: block');
  }));
  return { css: styles.join('\n'), files, buffers: new Map() };
}

let fontsPromise;
export const renderFonts = () => fontsPromise ??= readFonts();

export function fontPrelude(bundleText, opening) {
  // Preload the actual glyphs before painting to Canvas, where a font swap cannot redraw the pixels.
  const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;?!%/+-’“”·→≈≥≠×⁹℃&[]()';
  const glyphs = [...new Set(symbols + (bundleText.match(/[\p{Script=Han}\u3000-\u303F\uFF00-\uFFEF]/gu) ?? []).join(''))].join('');
  const faces = [`750 46px "${SANS_FACE}"`, `600 42px "${SERIF_FACE}"`];
  if (opening) faces.push(`400 42px "${HAND_FACE}"`, `700 68px "${HAND_FACE}"`);
  return `await Promise.all(${JSON.stringify(faces)}.map(async face => {
    const loaded = await document.fonts.load(face, ${JSON.stringify(glyphs)});
    if (!loaded.length || loaded.some(font => font.status !== 'loaded')) throw new Error('Render font failed to load: ' + face);
  }));\nawait document.fonts.ready;\n`;
}
