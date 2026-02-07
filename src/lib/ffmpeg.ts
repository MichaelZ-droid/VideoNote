import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

export const loadFFmpeg = async (onProgress?: (progress: number) => void): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  ffmpeg.on('log', ({ message }) => {
    console.log('FFmpeg:', message);
  });

  ffmpeg.on('progress', ({ progress, time }) => {
    const percentage = Math.min(progress * 100, 99);
    console.log(`FFmpeg progress: ${percentage.toFixed(2)}% (time: ${time}μs)`);
    onProgress?.(percentage);
  });

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
};

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await loadFFmpeg(onProgress);

  // 将视频文件写入 FFmpeg 虚拟文件系统
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

  // 提取音频（转换为 MP3 格式，减少文件大小）
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vn', // 不处理视频
    '-acodec', 'libmp3lame', // 使用 MP3 编码
    '-b:a', '128k', // 音频比特率 128kbps
    '-ar', '16000', // 采样率 16kHz（适合语音识别）
    'output.mp3'
  ]);

  // 读取输出文件
  const data = await ffmpeg.readFile('output.mp3');

  // 转换为 Blob
  const audioBlob = new Blob([data], { type: 'audio/mpeg' });

  // 清理文件
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.mp3');

  return audioBlob;
};

export const getFFmpegInstance = (): FFmpeg | null => {
  return ffmpegInstance;
};
