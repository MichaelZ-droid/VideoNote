/**
 * 获取音频文件的时长（秒）
 */
export const getAudioDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取音频时长'));
    });
    
    audio.src = url;
  });
};

/**
 * 获取视频文件的时长（秒）
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    });
    
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取视频时长'));
    });
    
    video.src = url;
  });
};
