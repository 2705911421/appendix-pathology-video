import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const cache = new Map();
const exists = file => { try { return typeof file === 'string' && fs.statSync(file).isFile(); } catch { return false; } };
export const binarySources = new Map();
async function resolveBin(name, envName, dependency) {
  if (exists(process.env[envName])) { binarySources.set(name, envName); return process.env[envName]; }
  if (process.env[envName]) console.warn(`${envName} 指定的文件不存在，继续查找 ${name}。`);
  if (cache.has(name)) return cache.get(name);
  let brokenPackage = false;
  try { require.resolve(dependency); brokenPackage = true; } catch { /* package absent */ }
  try {
    const module = await import(dependency);
    const candidate = name === 'ffprobe' ? module.default?.path : module.default;
    if (exists(candidate)) { cache.set(name, candidate); binarySources.set(name, dependency); return candidate; }
    brokenPackage = true;
  } catch { /* optional dependency unavailable */ }
  const extensions = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of extensions) {
      const candidate = path.resolve(dir, name + ext);
      try {
        fs.accessSync(candidate, process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
        if (!exists(candidate)) continue;
        cache.set(name, candidate); binarySources.set(name, '系统 PATH'); return candidate;
      } catch { /* continue */ }
    }
  }
  if (name === 'ffprobe') return null;
  throw new Error(`找不到 ffmpeg。${brokenPackage ? 'ffmpeg-static 的二进制文件下载失败。' : ''}请重新运行 1-首次安装.bat；macOS 请运行 1-首次安装.command，或设置 FFMPEG_PATH。`);
}
export const ffmpegPath = () => resolveBin('ffmpeg', 'FFMPEG_PATH', 'ffmpeg-static');
export const ffprobeOptional = () => resolveBin('ffprobe', 'FFPROBE_PATH', '@ffprobe-installer/ffprobe');
export async function ffprobePath() {
  const binary = await ffprobeOptional();
  if (!binary) throw new Error('此合成步骤需要 ffprobe。请重新运行首次安装文件，或安装 ffprobe 并设置 FFPROBE_PATH。样张和预览不需要单独安装 ffprobe。');
  return binary;
}
