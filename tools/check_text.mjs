import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const rules = JSON.parse(await fs.readFile(new URL('./audit_terms.json', import.meta.url), 'utf8'));
export const textRules = Object.entries(rules).map(([name, patterns]) => [name, new RegExp(patterns.join('|'), 'iu')]);
const dependenciesAndTemp = new Set(['.git', '.venv', 'node_modules', '__pycache__', '_audit_frames', '_audit_v2']);
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.srt', '.vtt', '.txt', '.psv', '.html', '.py', '.ps1', '.md']);

export async function auditText(directory = root) {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  let files = 0;
  const findings = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && !dependenciesAndTemp.has(entry.name)) {
      const result = await auditText(file);
      files += result.files;
      findings.push(...result.findings);
    } else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      files++;
      const lines = (await fs.readFile(file, 'utf8')).split(/\r?\n/u);
      for (const [index, line] of lines.entries()) {
        for (const [rule, pattern] of textRules) {
          if (pattern.test(line)) findings.push({file: path.relative(root, file), line: index + 1, rule});
        }
      }
    }
  }
  return {files, findings};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await auditText();
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
