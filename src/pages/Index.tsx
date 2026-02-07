import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Moon, Sun, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VideoUploader } from '@/components/video/VideoUploader';
import { VideoPlayer, VideoPlayerRef } from '@/components/video/VideoPlayer';
import { ProcessingProgress } from '@/components/video/ProcessingProgress';
import { SummaryPanel } from '@/components/video/SummaryPanel';
import { useVideoStore } from '@/hooks/useVideoStore';
import { extractAudioFromVideo } from '@/lib/ffmpeg';
import { uploadAudioToStorage, processVideoSummary, parseTimestamp } from '@/lib/videoProcessor';
import { getAudioDuration, getVideoDuration } from '@/lib/audioUtils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const Index = () => {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  
  const {
    videoFile,
    videoUrl,
    videoTitle,
    audioDuration,
    stage,
    summary,
    setAudioBlob,
    setVideoDuration,
    setSummary,
    setStage,
    setProgress,
    setError,
    reset,
  } = useVideoStore();

  useEffect(() => {
    const processVideo = async () => {
      if (!videoFile || stage !== 'extracting') return;

      try {
        setProgress(0);
        
        // 获取视频时长
        console.log('正在读取视频时长...');
        const videoDuration = await getVideoDuration(videoFile);
        setVideoDuration(videoDuration);
        console.log(`视频时长: ${videoDuration.toFixed(2)} 秒`);
        
        // 提取音频
        const audioBlob = await extractAudioFromVideo(videoFile, (progress) => {
          setProgress(progress);
        });

        // 获取音频时长
        const audioDurationValue = await getAudioDuration(audioBlob);
        console.log(`音频时长: ${audioDurationValue.toFixed(2)} 秒`);
        
        setAudioBlob(audioBlob, audioDurationValue);
        setStage('uploading');
        setProgress(100);

        toast.success('音频提取完成', {
          description: '正在上传并生成摘要...',
        });

        const audioPath = await uploadAudioToStorage(audioBlob, videoTitle);
        
        setStage('analyzing');
        setProgress(0);

        // 传递音频时长给后端，用于生成匹配的摘要
        const response = await processVideoSummary(audioPath, audioDurationValue);

        if (response.success && response.summary && response.transcript) {
          setSummary(response.summary, response.transcript);
          toast.success('摘要生成成功', {
            description: '您现在可以点击时间戳快速跳转',
          });
        } else {
          throw new Error(response.error || '生成摘要失败');
        }
      } catch (error) {
        console.error('处理视频失败:', error);
        const message = error instanceof Error ? error.message : '未知错误';
        setError(message);
        toast.error('处理失败', {
          description: message,
        });
      }
    };

    processVideo();
  }, [videoFile, stage, setAudioBlob, setVideoDuration, setStage, setProgress, setSummary, setError, videoTitle]);

  const handleTimestampClick = (timestamp: string) => {
    const seconds = parseTimestamp(timestamp);
    videoPlayerRef.current?.seekTo(seconds);
    videoPlayerRef.current?.play();
    
    toast.success('已跳转', {
      description: `播放位置: ${timestamp}`,
      duration: 1500,
    });
  };

  const handleClearVideo = () => {
    setShowClearDialog(true);
  };

  const confirmClear = () => {
    reset();
    setShowClearDialog(false);
    toast.success('已清除', {
      description: '您可以上传新的视频',
    });
  };

  const isProcessing = stage === 'extracting' || stage === 'uploading' || stage === 'analyzing';
  const showSummary = stage === 'ready' && summary;
  const canClear = stage !== 'upload' && !isProcessing;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-effect">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Film className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">VideoNote</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                智能视频摘要生成器
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canClear && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearVideo}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">清除视频</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {stage === 'upload' ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <VideoUploader />
            </motion.div>
          ) : (
            <motion.div
              key="processor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Desktop Layout */}
              {!isMobile ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Left: Video Player (60%) */}
                  <div className="lg:col-span-3 space-y-4">
                    <VideoPlayer ref={videoPlayerRef} src={videoUrl} />
                    {isProcessing && <ProcessingProgress />}
                  </div>

                  {/* Right: Summary Panel (40%) */}
                  <div className="lg:col-span-2">
                    {showSummary && (
                      <SummaryPanel
                        summary={summary}
                        videoTitle={videoTitle}
                        onTimestampClick={handleTimestampClick}
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Mobile Layout */
                <div className="space-y-4">
                  <VideoPlayer ref={videoPlayerRef} src={videoUrl} />
                  {isProcessing && <ProcessingProgress />}
                  
                  {showSummary && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button className="w-full" size="lg">
                          查看内容摘要
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[85vh] p-0">
                        <SheetHeader className="p-6 pb-4">
                          <SheetTitle className="text-xl">内容摘要</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100%-80px)] px-6">
                          <div className="space-y-3 pb-6">
                            {summary.map((item, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-4 rounded-xl bg-card border border-border cursor-pointer hover:border-primary/60 transition-smooth"
                                onClick={() => handleTimestampClick(item.timestamp)}
                              >
                                <div className="flex items-baseline gap-2 mb-2">
                                  <span className="font-mono text-sm font-semibold text-accent">
                                    {item.timestamp}
                                  </span>
                                  <h3 className="font-semibold text-base">
                                    {item.title}
                                  </h3>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {item.content}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </ScrollArea>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-muted-foreground border-t border-border/40">
        <p>由 阿里云百炼 AI 驱动 · 视频本地播放，仅上传音频</p>
      </footer>

      {/* 清除确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清除视频？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将清除当前视频和生成的摘要，您将需要重新上传视频。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClear} className="bg-destructive hover:bg-destructive/90">
              确认清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
