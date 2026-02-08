import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';

interface VideoPlayerProps {
  src: string | null;
  className?: string;
}

export interface VideoPlayerRef {
  seekTo: (timeInSeconds: number) => void;
  play: () => void;
  pause: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ src, className = '' }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (timeInSeconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = timeInSeconds;
        }
      },
      play: () => {
        videoRef.current?.play();
      },
      pause: () => {
        videoRef.current?.pause();
      },
    }));

    useEffect(() => {
      // 预加载视频元数据
      if (videoRef.current && src) {
        videoRef.current.load();
      }
    }, [src]);

    if (!src) {
      return null;
    }

    return (
      <Card className={`overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 ${className}`}>
        <div className="aspect-video bg-black">
          <video
            ref={videoRef}
            src={src}
            controls
            preload="metadata"
            className="w-full h-full"
            controlsList="nodownload"
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </Card>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
