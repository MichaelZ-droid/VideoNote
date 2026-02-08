import { motion } from 'framer-motion';
import { Clock, Copy, Download, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SummaryItem } from '@/hooks/useVideoStore';
import { exportSummaryAsMarkdown, downloadMarkdownFile } from '@/lib/videoProcessor';
import { TranscriptViewer } from '@/components/video/TranscriptViewer';
import { toast } from 'sonner';
import { useState } from 'react';

interface TranscriptItem {
  text: string;
  start_time: number;
  end_time: number;
}

interface SummaryPanelProps {
  summary: SummaryItem[];
  transcript?: TranscriptItem[];
  videoTitle: string;
  onTimestampClick: (timestamp: string) => void;
}

export const SummaryPanel = ({ summary, transcript, videoTitle, onTimestampClick }: SummaryPanelProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = exportSummaryAsMarkdown(summary, videoTitle);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success('已复制到剪贴板', {
        description: '摘要已复制为 Markdown 格式',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败', {
        description: '请手动复制内容',
      });
    }
  };

  const handleExport = () => {
    const markdown = exportSummaryAsMarkdown(summary, videoTitle);
    downloadMarkdownFile(markdown, videoTitle);
    toast.success('导出成功', {
      description: '摘要已下载为 Markdown 文件',
    });
  };

  const handleTranscriptTimestampClick = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    onTimestampClick(timestamp);
  };

  return (
    <Card className="h-full flex flex-col glass-effect border-primary/20">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          内容摘要
        </CardTitle>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 transition-smooth"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? '已复制' : '复制'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex-1 transition-smooth"
          >
            <Download className="w-4 h-4 mr-2" />
            导出 MD
          </Button>
        </div>

        {transcript && transcript.length > 0 && (
          <TranscriptViewer 
            transcript={transcript} 
            videoTitle={videoTitle}
            onTimestampClick={handleTranscriptTimestampClick}
          />
        )}

        <Separator />
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-3">
            {summary.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 rounded-xl bg-card/50 hover:bg-accent/10 
                  border border-border/50 hover:border-primary/40
                  cursor-pointer transition-smooth"
                onClick={() => onTimestampClick(item.timestamp)}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-smooth">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-accent">
                        {item.timestamp}
                      </span>
                      <h3 className="font-semibold text-base leading-tight">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-11">
                  {item.content}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// 添加缺失的 Sparkles 图标导入备用
const Sparkles = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
