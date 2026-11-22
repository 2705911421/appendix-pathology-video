import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import lockfile from 'proper-lockfile';

export async function lockOutput(directory) {
  await mkdir(directory, { recursive: true });
  try {
    return await lockfile.lock(directory, { lockfilePath: path.join(directory, '.render.lock'),
      stale: 30_000, update: 5_000, retries: { retries: 7, factor: 1, minTimeout: 5_000 } });
  } catch (error) {
    if (error.code === 'ELOCKED') throw new Error('同一目录已有构建或配音回填任务运行。', { cause: error });
    throw error;
  }
}
