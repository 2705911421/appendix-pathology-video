import fs from 'node:fs';
import path from 'node:path';
const exists = file => { try { return fs.statSync(file).isFile(); } catch { return false; } };
const missing = '没有找到可用的浏览器。请安装 Microsoft Edge 或 Google Chrome（Windows 10/11 自带 Edge），或设置 CHROME_PATH。';
async function candidates() {
  const result = [];
  const add = (name, file) => { if (file && exists(file)) result.push({ name, executablePath: file }); };
  if (process.env.CHROME_PATH) {
    if (!exists(process.env.CHROME_PATH)) console.warn('CHROME_PATH 指定的文件不存在，继续查找系统浏览器。');
    else add('自定义浏览器', process.env.CHROME_PATH);
  }
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const x86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA;
    for (const base of [x86, pf, local]) if (base) add('Microsoft Edge', path.join(base, 'Microsoft/Edge/Application/msedge.exe'));
    for (const base of [pf, x86, local]) if (base) add('Google Chrome', path.join(base, 'Google/Chrome/Application/chrome.exe'));
  } else if (process.platform === 'darwin') {
    add('Microsoft Edge', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    add('Google Chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    for (const name of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
      for (const dir of ['/usr/bin', '/usr/local/bin', '/snap/bin', ...(process.env.PATH || '').split(path.delimiter)]) add(name.startsWith('google') ? 'Google Chrome' : 'Chromium', path.join(dir, name));
    }
    add('Google Chrome', '/opt/google/chrome/chrome');
    add('Chromium', '/opt/chromium/chrome');
  }
  try {
    const { chromium } = await import('playwright');
    if (exists(chromium.executablePath())) result.push({ name: 'Playwright Chromium', executablePath: null });
  } catch { /* installation check reports missing package separately */ }
  return result;
}
export async function detectBrowser() {
  const found = (await candidates())[0];
  if (!found) throw new Error(missing);
  return found;
}
export async function launchBrowser() {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('未安装渲染工具，请重新运行 1-首次安装.bat；macOS 请运行 1-首次安装.command。'); }
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'];
  if (process.platform === 'linux') args.push('--no-sandbox');
  const attempts = (await candidates()).map(b => ({ ...b, options: b.executablePath ? { executablePath: b.executablePath } : {} }));
  attempts.push({ name: 'Microsoft Edge', options: { channel: 'msedge' } }, { name: 'Google Chrome', options: { channel: 'chrome' } });
  for (const attempt of attempts) {
    try {
      const browser = await chromium.launch({ headless: true, args, ...attempt.options });
      console.log('使用浏览器：' + attempt.name);
      return browser;
    } catch { /* try next installed browser */ }
  }
  throw new Error(missing);
}
