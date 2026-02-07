import { useState } from 'react';
import { FileText, X, Copy, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface TranscriptItem {
  text: string;
  start_time: number;
  end_time: number;
}

interface TranscriptViewerProps {
  transcript: TranscriptItem[];
  videoTitle: string;
  onTimestampClick?: (timeInSeconds: number) => void;
}

export const TranscriptViewer = ({ transcript, videoTitle, onTimestampClick }: TranscriptViewerProps) => {
  const [copied, setCopied] = useState(false);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCopy = async () => {
    const text = transcript
      .map(item => `[${formatTime(item.start_time)}] ${item.text}`)
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  const handleExport = () => {
    const text = transcript
      .map(item => `[${formatTime(item.start_time)}] ${item.text}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoTitle}_文字稿.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('文字稿已下载');
  };

  const totalDuration = transcript.length > 0 
    ? formatTime(transcript[transcript.length - 1].end_time)
    : '00:00';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          查看完整文字稿
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            完整文字稿
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">
            共 {transcript.length} 段 · 总时长 {totalDuration}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  复制
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出 TXT
            </Button>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2 py-4">
            {transcript.map((item, index) => (
              <div
                key={index}
                className="flex gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <button
                  onClick={() => onTimestampClick?.(item.start_time / 1000)}
                  className="flex-shrink-0 font-mono text-sm text-primary hover:underline cursor-pointer"
                >
                  {formatTime(item.start_time)}
                </button>
                <p className="flex-1 text-sm leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ 当前为模拟数据 · 集成阿里云 Paraformer 后将显示真实的语音识别结果
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
