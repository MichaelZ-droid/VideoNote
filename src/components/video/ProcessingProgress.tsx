import { motion } from 'framer-motion';
import { Loader2, FileAudio, Upload, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useVideoStore, type ProcessStage } from '@/hooks/useVideoStore';

const stageConfig: Record<ProcessStage, { title: string; description: string; icon: typeof Loader2 }> = {
  upload: { title: '准备中', description: '正在准备处理...', icon: Loader2 },
  extracting: { title: '提取音频', description: '正在从视频中提取音频轨道...', icon: FileAudio },
  uploading: { title: '上传中', description: '正在上传音频文件...', icon: Upload },
  analyzing: { title: '智能分析', description: '正在使用 AI 生成摘要...', icon: Sparkles },
  ready: { title: '完成', description: '摘要已生成', icon: Sparkles },
  error: { title: '错误', description: '处理失败，请重试', icon: Loader2 },
};

export const ProcessingProgress = () => {
  const { stage, progress, errorMessage } = useVideoStore();

  if (stage === 'upload' || stage === 'ready') {
    return null;
  }

  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <Card className="w-full glass-effect border-primary/20">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: stage !== 'error' ? 360 : 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className={`p-3 rounded-full ${
                stage === 'error' ? 'bg-destructive/10' : 'bg-primary/10'
              }`}
            >
              <Icon className={`w-6 h-6 ${stage === 'error' ? 'text-destructive' : 'text-primary'}`} />
            </motion.div>

            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-lg">{config.title}</h4>
              <p className="text-sm text-muted-foreground">
                {stage === 'error' && errorMessage ? errorMessage : config.description}
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
            </div>
          </div>

          <Progress value={progress} className="h-2" />

          {stage === 'extracting' && (
            <p className="text-xs text-muted-foreground text-center">
              这可能需要几分钟时间，请耐心等待...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
