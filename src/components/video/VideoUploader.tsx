import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Upload, FileVideo } from 'lucide-react';
import { useVideoStore } from '@/hooks/useVideoStore';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export const VideoUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const setVideoFile = useVideoStore((state) => state.setVideoFile);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('文件过大', {
        description: '视频文件不能超过 1GB',
      });
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('不支持的文件格式', {
        description: '请上传 MP4、MOV、AVI 或 WEBM 格式的视频',
      });
      return false;
    }

    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setVideoFile(file);
        toast.success('视频已加载', {
          description: `正在提取音频: ${file.name}`,
        });
      }
    },
    [setVideoFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <motion.div
        className={`relative w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 
          transition-all duration-300 cursor-pointer glass-effect
          ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/60'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('video-input')?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          id="video-input"
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            className="relative"
            animate={{
              scale: isDragging ? 1.1 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-glow" />
            <div className="relative p-8 bg-card rounded-full border-2 border-primary/30">
              {isDragging ? (
                <Upload className="w-16 h-16 text-primary" />
              ) : (
                <Film className="w-16 h-16 text-primary" />
              )}
            </div>
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">
              {isDragging ? '释放以上传视频' : '上传本地视频'}
            </h3>
            <p className="text-muted-foreground">
              拖拽视频文件到此处，或点击选择文件
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4" />
              <span>MP4, MOV, AVI, WEBM</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <span>最大 1GB</span>
          </div>

          <div className="pt-4 text-xs text-muted-foreground max-w-md">
            视频将在本地播放，我们只会上传提取的音频文件用于生成摘要
          </div>
        </div>
      </motion.div>
    </div>
  );
};
