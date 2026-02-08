import { create } from 'zustand';

export interface SummaryItem {
  timestamp: string;
  title: string;
  content: string;
}

interface TranscriptItem {
  text: string;
  start_time: number;
  end_time: number;
}

export type ProcessStage = 'upload' | 'extracting' | 'uploading' | 'analyzing' | 'ready' | 'error';

interface VideoState {
  // 视频相关
  videoFile: File | null;
  videoUrl: string | null;
  videoTitle: string;
  videoDuration: number; // 添加视频时长（秒）
  
  // 音频相关
  audioBlob: Blob | null;
  audioDuration: number; // 添加音频时长（秒）
  
  // 摘要数据
  summary: SummaryItem[] | null;
  transcript: TranscriptItem[] | null;
  
  // 处理状态
  stage: ProcessStage;
  progress: number;
  errorMessage: string | null;
  
  // Actions
  setVideoFile: (file: File) => void;
  setVideoDuration: (duration: number) => void;
  setAudioBlob: (blob: Blob, duration?: number) => void;
  setSummary: (summary: SummaryItem[], transcript: TranscriptItem[]) => void;
  setStage: (stage: ProcessStage) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videoFile: null,
  videoUrl: null,
  videoTitle: '',
  videoDuration: 0,
  audioBlob: null,
  audioDuration: 0,
  summary: null,
  transcript: null,
  stage: 'upload',
  progress: 0,
  errorMessage: null,

  setVideoFile: (file) => {
    const url = URL.createObjectURL(file);
    set({
      videoFile: file,
      videoUrl: url,
      videoTitle: file.name.replace(/\.[^/.]+$/, ''),
      stage: 'extracting',
      progress: 0,
      errorMessage: null,
    });
  },

  setVideoDuration: (duration) => {
    set({ videoDuration: duration });
  },

  setAudioBlob: (blob, duration) => {
    set({ 
      audioBlob: blob, 
      audioDuration: duration || 0,
      stage: 'uploading' 
    });
  },

  setSummary: (summary, transcript) => {
    set({ summary, transcript, stage: 'ready', progress: 100 });
  },

  setStage: (stage) => {
    set({ stage });
  },

  setProgress: (progress) => {
    set({ progress });
  },

  setError: (message) => {
    set({ stage: 'error', errorMessage: message });
  },

  reset: () => {
    const currentUrl = useVideoStore.getState().videoUrl;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    set({
      videoFile: null,
      videoUrl: null,
      videoTitle: '',
      videoDuration: 0,
      audioBlob: null,
      audioDuration: 0,
      summary: null,
      transcript: null,
      stage: 'upload',
      progress: 0,
      errorMessage: null,
    });
  },
}));
