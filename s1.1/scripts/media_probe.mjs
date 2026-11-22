import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { videoDimensions } from '../shared/renderProfile.js';

const exec = promisify(execFile);

export async function runMedia(tool, args) {
  try {
    return await exec(tool, args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`PATH 中找不到 ${tool}`, { cause: error });
    throw new Error(`${tool} 处理失败\n${error.stderr?.trim() || error.message}`, { cause: error });
  }
}

export async function inspectMedia(file, countFrames = false) {
  const { stdout, stderr } = await runMedia('ffprobe', ['-v', 'error', '-threads', '4', '-err_detect', 'explode',
    ...(countFrames ? ['-count_frames'] : []), '-show_streams', '-show_format', '-of', 'json', file]);
  if (stderr.trim()) throw new Error(`ffprobe 解码失败\n${stderr.trim()}`);
  return JSON.parse(stdout);
}

export function checkVideo(video, profile) {
  const { width, height } = videoDimensions(profile);
  if (video?.width !== width || video.height !== height || video.codec_name !== 'h264'
    || (profile.profile && video.profile?.toLowerCase() !== profile.profile)
    || (profile.level && video.level !== Number(profile.level) * 10) || video.pix_fmt !== profile.pixFmt
    || video.r_frame_rate !== `${profile.fps}/1` || video.avg_frame_rate !== `${profile.fps}/1`) {
    throw new Error(`ffprobe 视频规格不符，预期 ${width}×${height}、${profile.fps} fps、H.264 ${profile.pixFmt}`);
  }
}

export const withinSeconds = (value, expected, tolerance) =>
  Number.isFinite(Number(value)) && Math.abs(Number(value) - expected) <= tolerance;

export async function checkSegment(file, profile, frames) {
  const { streams, format } = await inspectMedia(file, true);
  const [video] = streams;
  checkVideo(video, profile);
  const duration = frames / profile.fps;
  if (streams.length !== 1 || Number(video.nb_frames) !== frames || Number(video.nb_read_frames) !== frames
    || !withinSeconds(video.start_time, 0, .001) || !withinSeconds(video.duration, duration, .001)
    || !withinSeconds(format.duration, duration, .001)) {
    throw new Error(`分段帧数或时长不符，预期 ${frames} 帧、${duration.toFixed(3)} 秒，实际 ${video.nb_read_frames ?? 0} 帧、${video.duration ?? '未知'} 秒`);
  }
}
