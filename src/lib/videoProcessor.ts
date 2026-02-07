import { supabase } from '@/integrations/supabase/client';
import { SummaryItem } from '@/hooks/useVideoStore';

interface TranscriptItem {
  text: string;
  start_time: number;
  end_time: number;
}

interface ProcessVideoResponse {
  success: boolean;
  summary?: SummaryItem[];
  transcript?: TranscriptItem[];
  error?: string;
}

export const uploadAudioToStorage = async (
  audioBlob: Blob,
  fileName: string
): Promise<string> => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
  const audioFileName = `${sanitizedFileName}_${timestamp}.mp3`;

  const { data, error } = await supabase.storage
    .from('temp-audio')
    .upload(audioFileName, audioBlob, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`上传音频失败: ${error.message}`);
  }

  return data.path;
};

export const processVideoSummary = async (
  audioPath: string,
  audioDuration?: number
): Promise<ProcessVideoResponse> => {
  const { data, error } = await supabase.functions.invoke('process-video-summary', {
    body: { 
      audioPath,
      audioDuration: audioDuration || 0
    },
  });

  if (error) {
    throw new Error(`处理视频摘要失败: ${error.message}`);
  }

  return data;
};

export const parseTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':');
  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
};

export const formatTimestamp = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const exportSummaryAsMarkdown = (
  summary: SummaryItem[],
  videoTitle: string
): string => {
  const lines = [
    `# ${videoTitle}`,
    '',
    '## 视频摘要',
    '',
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    '',
    '---',
    '',
  ];

  summary.forEach((item, index) => {
    lines.push(`### ${index + 1}. [${item.timestamp}] ${item.title}`);
    lines.push('');
    lines.push(item.content);
    lines.push('');
  });

  return lines.join('\n');
};

export const downloadMarkdownFile = (content: string, fileName: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_摘要.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
