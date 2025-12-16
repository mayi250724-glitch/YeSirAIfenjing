
import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { Loader2 } from 'lucide-react';

type LoaderType = 'analyzing' | 'image' | 'video' | 'processing';

interface FancyLoaderProps {
  type: LoaderType;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 使用更高质量、更流畅的 Lottie 动画资源
const ANIMATION_URLS = {
  // Analyzing: 科技感流体/神经网络 (Creative AI)
  analyzing: 'https://lottie.host/8816c429-195f-4638-825f-15501309f3e4/J8N5tQ6g4f.json',
  // Image: 艺术调色盘/绘画生成 (Artistic Creation)
  image: 'https://lottie.host/17e58428-1111-4043-983e-8f23714b1c2b/o5j1g7x24x.json',
  // Video: 电影胶卷/摄影机 (Cinematic)
  video: 'https://lottie.host/c57c4c95-3037-4d9f-969c-0c326e68007a/4w2X0C2y0B.json',
  // Processing: 通用流体加载 (Fluid Abstract)
  processing: 'https://lottie.host/0205862d-90c0-436d-9860-935108625624/6Yk02h4321.json'
};

const FancyLoader: React.FC<FancyLoaderProps> = ({ type, text, size = 'md', className = '' }) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const url = ANIMATION_URLS[type] || ANIMATION_URLS.processing;

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch animation");
        return response.json();
      })
      .then(data => {
        if (isMounted) {
            setAnimationData(data);
            // 简单的淡入效果
            setTimeout(() => setIsVisible(true), 50);
        }
      })
      .catch(() => {
        if (isMounted) setError(true);
      });

    return () => { isMounted = false; };
  }, [type]);

  const sizeClass = {
    sm: 'w-20 h-20', // 稍微调大一点以便看得清细节
    md: 'w-40 h-40',
    lg: 'w-72 h-72'
  }[size];

  // 根据类型添加不同的光晕颜色
  const glowColor = {
      analyzing: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]', // Amber glow
      image: 'shadow-[0_0_30px_rgba(236,72,153,0.3)]', // Pink glow
      video: 'shadow-[0_0_30px_rgba(147,51,234,0.3)]', // Purple glow
      processing: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]' // Blue glow
  }[type] || 'shadow-[0_0_30px_rgba(255,255,255,0.1)]';

  return (
    <div className={`flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}>
      {animationData && !error ? (
        <div className={`${sizeClass} rounded-full flex items-center justify-center ${glowColor} bg-black/20 backdrop-blur-sm p-2`}>
          <Lottie 
            animationData={animationData} 
            loop={true} 
            className="w-full h-full"
            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
          />
        </div>
      ) : (
        // Fallback or Loading State
        <div className={`${sizeClass} flex items-center justify-center`}>
           <Loader2 className="animate-spin text-cinema-accent opacity-50" size={size === 'sm' ? 24 : size === 'md' ? 48 : 64} />
        </div>
      )}
      
      {text && (
        <div className="mt-6 flex flex-col items-center gap-1">
            <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 animate-pulse tracking-widest uppercase font-mono">
                {text}
            </p>
            {/* 装饰性的小点动画 */}
            <div className="flex gap-1 mt-1">
                <div className="w-1 h-1 bg-cinema-accent rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-1 bg-cinema-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-cinema-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default FancyLoader;
