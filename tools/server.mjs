import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.woff2':'font/woff2', '.tsv':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.css':'text/css', '.svg':'image/svg+xml' };
export async function serveFilm() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('无效路径');
      const alias = ['lib','fonts','vendor'].find(dir => pathname.startsWith('/'+dir+'/'));
      const base = path.join(root, alias ? 'engine/'+alias : 'film');
      const relative = alias ? pathname.slice(alias.length+2) : pathname.slice(1) || 'index.html';
      const file = path.resolve(base, relative);
      if (!file.startsWith(base+path.sep)) throw new Error('路径越界');
      // Also reject symlinks escaping the selected service root.
      const real = await fs.realpath(file);
      const realBase = await fs.realpath(base);
      if (!real.startsWith(realBase+path.sep)) throw new Error('路径越界');
      const body = await fs.readFile(real);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404); res.end('文件不存在或路径无效'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
