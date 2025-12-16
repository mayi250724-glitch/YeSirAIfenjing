
import React, { useState, useEffect, useRef } from 'react';
import { EditorClip, EditorTrack, TrackType } from '../types';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Video, Type, Music, Sparkles, 
  Settings2, Scissors, Copy, Clipboard, Trash2, ZoomIn, ZoomOut, ArrowLeft, ArrowRight, Download, 
  Layers, Palette, Type as TypeIcon, Image as ImageIcon, Box, Monitor, 
  Undo2, Redo2, Camera, RefreshCw, Gauge, EyeOff, Upload, SlidersHorizontal
} from 'lucide-react';
import FancyLoader from './FancyLoader';

interface VideoEditorViewProps {
  initialResources: { id: string; url: string; type: TrackType; name: string; thumbnail?: string }[];
  onBack: () => void;
}

const VideoEditorView: React.FC<VideoEditorViewProps> = ({ initialResources, onBack }) => {
  // --- STATE ---
  const [tracks, setTracks] = useState<EditorTrack[]>([
    { id: 'track-video', type: TrackType.VIDEO, clips: [] },
    { id: 'track-audio', type: TrackType.AUDIO, clips: [] },
    { id: 'track-text', type: TrackType.TEXT, clips: [] }
  ]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(10); // pixels per second
  const [resources, setResources] = useState(initialResources);
  
  // 剪映风格的三个主要模块
  const [activeModule, setActiveModule] = useState<'add' | 'edit' | 'adjust'>('add');
  
  // 左侧面板激活标签
  const [activeTab, setActiveTab] = useState<'media' | 'stickers' | 'music' | 'soundEffects' | 'text' | 'filters' | 'transitions' | 'effects'>('media');
  
  // 导出状态管理
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportSettings, setShowExportSettings] = useState(false);
  
  // 导出设置
  const [exportSettings, setExportSettings] = useState({
      resolution: '1920x1080',
      frameRate: 30,
      bitrate: '8M',
      format: 'mp4'
  });
  
  // 时间线编辑状态
  const [copiedClip, setCopiedClip] = useState<EditorClip | null>(null);
  const [history, setHistory] = useState<EditorTrack[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // 添加到历史记录
  const addToHistory = (newTracks: EditorTrack[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTracks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  // 切割片段
  const handleSplit = () => {
    if (!selectedClipId) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => {
      const clipIndex = track.clips.findIndex(clip => clip.id === selectedClipId);
      if (clipIndex === -1) return track;
      
      const clip = track.clips[clipIndex];
      
      // 检查当前时间是否在片段范围内
      if (currentTime <= clip.startOffset || currentTime >= clip.startOffset + clip.duration) {
        return track;
      }
      
      // 计算两个新片段的持续时间
      const firstDuration = currentTime - clip.startOffset;
      const secondDuration = clip.duration - firstDuration;
      
      // 创建两个新片段
      const firstClip = {
        ...clip,
        duration: firstDuration
      };
      
      const secondClip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startOffset: currentTime,
        srcStart: clip.srcStart + firstDuration,
        duration: secondDuration
      };
      
      // 替换原来的片段为两个新片段
      const newClips = [...track.clips];
      newClips.splice(clipIndex, 1, firstClip, secondClip);
      
      return {
        ...track,
        clips: newClips
      };
    });
    
    setTracks(newTracks);
  };
  
  // 删除片段
  const handleDelete = () => {
    if (!selectedClipId) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== selectedClipId)
    }));
    
    setTracks(newTracks);
    setSelectedClipId(null);
  };
  
  // 复制片段
  const handleCopy = () => {
    if (!selectedClipId) return;
    
    const clip = tracks.flatMap(track => track.clips).find(clip => clip.id === selectedClipId);
    if (clip) {
      setCopiedClip(clip);
    }
  };
  
  // 粘贴片段
  const handlePaste = () => {
    if (!copiedClip) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newClip: EditorClip = {
      ...copiedClip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startOffset: currentTime
    };
    
    const newTracks = tracks.map(track => {
      if (track.type === newClip.type) {
        return {
          ...track,
          clips: [...track.clips, newClip]
        };
      }
      return track;
    });
    
    setTracks(newTracks);
  };
  
  // 撤销操作
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTracks(history[newIndex]);
    }
  };
  
  // 重做操作
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTracks(history[newIndex]);
    }
  };
  
  // 倒放片段
  const handleReverse = () => {
    if (!selectedClipId) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        if (clip.id === selectedClipId) {
          return {
            ...clip,
            properties: {
              ...clip.properties,
              reversed: !clip.properties?.reversed
            }
          };
        }
        return clip;
      })
    }));
    
    setTracks(newTracks);
  };
  
  // 定格片段
  const handleFreezeFrame = () => {
    if (!selectedClipId) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        if (clip.id === selectedClipId) {
          return {
            ...clip,
            properties: {
              ...clip.properties,
              frozen: !clip.properties?.frozen
            }
          };
        }
        return clip;
      })
    }));
    
    setTracks(newTracks);
  };
  
  // 镜像片段
  const handleMirror = () => {
    if (!selectedClipId) return;
    
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        if (clip.id === selectedClipId) {
          return {
            ...clip,
            properties: {
              ...clip.properties,
              mirrored: !clip.properties?.mirrored
            }
          };
        }
        return clip;
      })
    }));
    
    setTracks(newTracks);
  };
  
  // 速度调节
  const handleSpeedAdjust = () => {
    if (!selectedClipId) return;
    
    const newSpeed = prompt("Enter new speed (0.1x - 10x):");
    const speed = parseFloat(newSpeed || '1');
    
    if (isNaN(speed) || speed < 0.1 || speed > 10) {
      alert("Please enter a valid speed between 0.1x and 10x");
      return;
    }
    
    // 更新剪辑属性
    updateClipProperty(selectedClipId, 'speed', speed);
  };
  
  // 更新剪辑属性的通用函数
  const updateClipProperty = (clipId: string, property: string, value: any) => {
    // 保存当前状态到历史记录
    addToHistory(tracks);
    
    const newTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip => {
        if (clip.id === clipId) {
          // 处理特殊属性，如速度会影响持续时间
          if (property === 'speed') {
            const originalDuration = clip.duration / (clip.properties?.speed || 1);
            return {
              ...clip,
              duration: originalDuration / value,
              properties: {
                ...clip.properties,
                [property]: value
              }
            };
          }
          
          // 其他属性直接更新
          return {
            ...clip,
            properties: {
              ...clip.properties,
              [property]: value
            }
          };
        }
        return clip;
      })
    }));
    
    setTracks(newTracks);
  };

  // Auto-import resources to timeline
  useEffect(() => {
    // If timeline is empty, auto populate with video resources
    const videoTrack = tracks.find(t => t.type === TrackType.VIDEO);
    if (videoTrack && videoTrack.clips.length === 0 && initialResources.length > 0) {
        let currentTimeOffset = 0;
        const newClips: EditorClip[] = [];
        
        initialResources.filter(r => r.type === TrackType.VIDEO).forEach((res) => {
             // Mock duration of 5s for preview purposes if not loaded
             const duration = 5; 
             newClips.push({
                 id: `clip-${Date.now()}-${Math.random()}`,
                 resourceId: res.id,
                 startOffset: currentTimeOffset,
                 duration: duration,
                 srcStart: 0,
                 type: TrackType.VIDEO,
                 name: res.name
             });
             currentTimeOffset += duration;
        });

        setTracks(prev => prev.map(t => t.id === 'track-video' ? { ...t, clips: newClips } : t));
    }
  }, []);

  // Playback Loop
  useEffect(() => {
      let interval: any;
      if (isPlaying) {
          interval = setInterval(() => {
              setCurrentTime(prev => prev + 0.1);
          }, 100);
      }
      return () => clearInterval(interval);
  }, [isPlaying]);

  // Sync Player with Timeline Cursor and Apply Real-time Effects
  useEffect(() => {
     // Find active video clip at current time
     const videoTrack = tracks.find(t => t.type === TrackType.VIDEO);
     const activeClip = videoTrack?.clips.find(c => currentTime >= c.startOffset && currentTime < c.startOffset + c.duration);
     
     if (playerRef.current) {
         if (activeClip) {
             const resource = resources.find(r => r.id === activeClip.resourceId);
             if (resource) {
                 // Optimization: Only change src if different to avoid flickering
                 const srcUrl = resource.url;
                 if (!playerRef.current.src.includes(srcUrl)) {
                     playerRef.current.src = srcUrl;
                 }
                 
                 // Apply clip properties for real-time preview
                 const video = playerRef.current;
                 
                 // 1. Speed adjustment
                 const speed = activeClip.properties?.speed || 1;
                 video.playbackRate = speed;
                 
                 // 2. Mirror effect
                 if (activeClip.properties?.mirrored) {
                     video.style.transform = 'scaleX(-1)';
                 } else {
                     video.style.transform = 'scaleX(1)';
                 }
                 
                 // 3. Calculate video time based on properties
                 let relativeTime = currentTime - activeClip.startOffset + activeClip.srcStart;
                 
                 // Handle reversed playback
                 if (activeClip.properties?.reversed) {
                     const clipEnd = activeClip.srcStart + activeClip.duration / (speed || 1);
                     relativeTime = clipEnd - relativeTime;
                 }
                 
                 // Handle frozen frame
                 if (activeClip.properties?.frozen) {
                     relativeTime = activeClip.srcStart; // Freeze at the start of the clip
                 }
                 
                 // Allow a small drift to prevent stuttering updates
                 if (Math.abs(video.currentTime - relativeTime) > 0.5) {
                     video.currentTime = relativeTime;
                 }
                 
                 if (isPlaying) {
                     video.play().catch(() => {});
                 } else {
                     video.pause();
                 }
             }
         } else {
             // Blank screen if no clip
             playerRef.current.pause();
         }
     }
     
     // Auto stop at end
     const totalDuration = Math.max(...tracks.flatMap(t => t.clips.map(c => c.startOffset + c.duration)), 0);
     if (currentTime > totalDuration && isPlaying) {
         setIsPlaying(false);
         setCurrentTime(0);
     }

  }, [currentTime, tracks, isPlaying, resources]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 100);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
  };

  const handleClipClick = (e: React.MouseEvent, clipId: string) => {
      e.stopPropagation();
      setSelectedClipId(clipId);
  };

  // 媒体导入功能
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      
      Array.from(files).forEach((file) => {
          // 创建临时 URL 用于预览
          const url = URL.createObjectURL(file);
          
          // 确定媒体类型
          let type: TrackType;
          if (file.type.startsWith('video/')) {
              type = TrackType.VIDEO;
          } else if (file.type.startsWith('audio/')) {
              type = TrackType.AUDIO;
          } else if (file.type.startsWith('image/')) {
              type = TrackType.VIDEO; // 图片也作为视频轨道的素材
          } else {
              return; // 不支持的文件类型
          }
          
          // 创建资源对象
          const newResource = {
              id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: url,
              type: type,
              name: file.name,
              thumbnail: file.type.startsWith('image/') ? url : undefined
          };
          
          // 添加到资源列表
          setResources(prev => [...prev, newResource]);
      });
      
      // 清空文件输入，允许重复选择相同文件
      e.target.value = '';
  };

  // 添加效果到时间线
  const handleAddEffect = (effectId: string, effectName: string) => {
      // 保存当前状态到历史记录
      addToHistory(tracks);
      
      // 创建新的效果片段
      const newClip: EditorClip = {
          id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          resourceId: effectId,
          startOffset: currentTime,
          duration: 3, // 默认效果持续时间
          srcStart: 0,
          type: TrackType.EFFECT, // 使用EFFECT类型
          name: effectName
      };
      
      // 检查是否已有效果轨道，没有则创建
      let newTracks = [...tracks];
      let effectTrack = newTracks.find(track => track.type === TrackType.EFFECT);
      
      if (!effectTrack) {
          // 创建新的效果轨道
          effectTrack = {
              id: `track-effect-${Date.now()}`,
              type: TrackType.EFFECT,
              clips: []
          };
          newTracks.push(effectTrack);
      } else {
          // 更新现有效果轨道
          effectTrack = {
              ...effectTrack,
              clips: [...effectTrack.clips, newClip]
          };
          newTracks = newTracks.map(track => 
              track.type === TrackType.EFFECT ? effectTrack! : track
          );
      }
      
      setTracks(newTracks);
  };
  
  // 添加转场到时间线
  const handleAddTransition = (transitionId: string, transitionName: string) => {
      // 保存当前状态到历史记录
      addToHistory(tracks);
      
      // 查找当前时间点前后的片段，添加转场
      const videoTrack = tracks.find(track => track.type === TrackType.VIDEO);
      if (!videoTrack) return;
      
      // 查找当前时间点之前的片段
      const prevClip = videoTrack.clips
          .filter(clip => clip.startOffset + clip.duration <= currentTime)
          .sort((a, b) => b.startOffset - a.startOffset)[0];
      
      // 查找当前时间点之后的片段
      const nextClip = videoTrack.clips
          .filter(clip => clip.startOffset >= currentTime)
          .sort((a, b) => a.startOffset - b.startOffset)[0];
      
      if (prevClip && nextClip) {
          // 在两个片段之间添加转场标记（实际实现中可能需要更复杂的逻辑）
          alert(`${transitionName} transition added between clips`);
      } else {
          alert("Please place the cursor between two clips to add a transition");
      }
  };
  
  // 显示导出设置对话框
  const handleShowExportSettings = () => {
      setShowExportSettings(true);
  };
  
  // 关闭导出设置对话框
  const handleCloseExportSettings = () => {
      setShowExportSettings(false);
  };
  
  // 更新导出设置
  const handleUpdateExportSettings = (key: string, value: string) => {
      setExportSettings(prev => ({
          ...prev,
          [key]: value
      }));
  };
  
  // 开始导出
  const handleStartExport = () => {
      setShowExportSettings(false);
      setIsExporting(true);
      setExportProgress(0);
      
      // 模拟导出进度
      const interval = setInterval(() => {
          setExportProgress(prev => {
              if (prev >= 100) {
                  clearInterval(interval);
                  setTimeout(() => {
                      setIsExporting(false);
                      alert("导出完成！视频已保存到本地设备。");
                  }, 500);
                  return 100;
              }
              return prev + Math.random() * 10;
          });
      }, 300);
  };
  
  // 导出功能入口
  const handleExport = () => {
      handleShowExportSettings();
  };

  // Sidebar Items with Complete Categories from Mind Map
  const sidebarItems = {
      media: resources,
      stickers: [
          { id: 's1', name: 'Emoji', type: 'sticker', category: '表情' },
          { id: 's2', name: 'Heart', type: 'sticker', category: '形状' },
          { id: 's3', name: 'Star', type: 'sticker', category: '形状' },
          { id: 's4', name: 'Arrow', type: 'sticker', category: '箭头' },
          { id: 's5', name: 'Icon', type: 'sticker', category: '图标' },
      ],
      music: [
          { id: 'm1', name: 'Cinematic Build', type: 'music', category: '电影' },
          { id: 'm2', name: 'Ambient Space', type: 'music', category: '环境' },
          { id: 'm3', name: 'Action Hit', type: 'music', category: '动作' },
          { id: 'm4', name: 'Happy Ukulele', type: 'music', category: '欢快' },
          { id: 'm5', name: 'Sad Piano', type: 'music', category: '悲伤' },
      ],
      soundEffects: [
          { id: 'se1', name: 'Applause', type: 'sound', category: '人群' },
          { id: 'se2', name: 'Explosion', type: 'sound', category: '特效' },
          { id: 'se3', name: 'Birds', type: 'sound', category: '自然' },
          { id: 'se4', name: 'Rain', type: 'sound', category: '自然' },
          { id: 'se5', name: 'Wind', type: 'sound', category: '自然' },
          { id: 'se6', name: 'Laugh', type: 'sound', category: '人声' },
      ],
      text: [
          { id: 't1', name: '默认文字', type: 'text', category: '基础' },
          { id: 't2', name: '标题擦拭', type: 'text', category: '动画' },
          { id: 't3', name: '字幕预设', type: 'text', category: '字幕' },
          { id: 't4', name: '下三分之一', type: 'text', category: '信息' },
          { id: 't5', name: '倒计时', type: 'text', category: '动画' },
          { id: 't6', name: '花字样式', type: 'text', category: '花字' },
      ],
      filters: [
          { id: 'f1', name: 'Vintage', type: 'filter', category: '复古' },
          { id: 'f2', name: 'Black & White', type: 'filter', category: '黑白' },
          { id: 'f3', name: 'Sepia', type: 'filter', category: '复古' },
          { id: 'f4', name: 'Cool', type: 'filter', category: '色彩' },
          { id: 'f5', name: 'Warm', type: 'filter', category: '色彩' },
          { id: 'f6', name: 'Vibrant', type: 'filter', category: '增强' },
      ],
      transitions: [
          { id: 'tr1', name: 'Fade', type: 'transition', category: '淡入淡出' },
          { id: 'tr2', name: 'Slide', type: 'transition', category: '滑动' },
          { id: 'tr3', name: 'Wipe', type: 'transition', category: '擦拭' },
          { id: 'tr4', name: 'Zoom', type: 'transition', category: '缩放' },
          { id: 'tr5', name: 'Spin', type: 'transition', category: '旋转' },
      ],
      effects: [
          { id: 'e1', name: 'Film Grain', type: 'effect', category: '电影' },
          { id: 'e2', name: 'VHS Glitch', type: 'effect', category: '故障' },
          { id: 'e3', name: 'Lens Flare', type: 'effect', category: '光效' },
          { id: 'e4', name: 'Rainbow', type: 'effect', category: '色彩' },
          { id: 'e5', name: 'Mirror', type: 'effect', category: '变形' },
          { id: 'e6', name: 'Blur', type: 'effect', category: '模糊' },
      ]
  };

  return (
    <div className="h-screen w-screen bg-[#0f0f0f] text-gray-200 flex flex-col overflow-hidden font-sans">
        
        {/* TOP HEADER */}
        <div className="h-12 border-b border-[#262626] flex items-center justify-between px-4 bg-[#141414] shrink-0 z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                     <Video size={16} className="text-cyan-500" />
                     <span className="font-bold text-sm">映剪专业版</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 <span className="text-xs text-gray-500">{formatTime(currentTime)} / {formatTime(Math.max(...tracks.flatMap(t => t.clips.map(c => c.startOffset + c.duration)), 0))}</span>
                 <button 
                    onClick={handleExport}
                    className="px-6 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full hover:brightness-110 flex items-center gap-2"
                 >
                    <Download size={14} /> 导出
                 </button>
            </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* 1. LEFT SIDEBAR (Resources) */}
            <div className="w-80 flex flex-col border-r border-[#262626] bg-[#111]">
                 {/* 剪映风格的三个主要模块导航 */}
                 <div className="flex h-12 border-b border-[#262626] bg-[#141414]">
                     <button 
                        onClick={() => setActiveModule('add')}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium ${
                            activeModule === 'add' 
                            ? 'text-white bg-[#1a1a1a] border-b-2 border-cyan-500' 
                            : 'text-gray-500 hover:text-white'}`}
                     >
                         <Upload size={16} />
                         添加
                     </button>
                     <button 
                        onClick={() => setActiveModule('edit')}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium ${
                            activeModule === 'edit' 
                            ? 'text-white bg-[#1a1a1a] border-b-2 border-cyan-500' 
                            : 'text-gray-500 hover:text-white'}`}
                     >
                         <Scissors size={16} />
                         剪辑
                     </button>
                     <button 
                        onClick={() => setActiveModule('adjust')}
                        className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium ${
                            activeModule === 'adjust' 
                            ? 'text-white bg-[#1a1a1a] border-b-2 border-cyan-500' 
                            : 'text-gray-500 hover:text-white'}`}
                     >
                         <SlidersHorizontal size={16} />
                         调节
                     </button>
                 </div>
                 
                 {/* 模块内容 */}
                 <div className="flex-1 overflow-hidden flex flex-col">
                     {/* 添加模块 */}
                     {activeModule === 'add' && (
                         <>
                             {/* Tabs */}
                             <div className="flex h-10 border-b border-[#262626] overflow-x-auto scrollbar-hide">
                                 <button onClick={() => setActiveTab('media')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'media' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <ImageIcon size={16} /> 媒体
                                 </button>
                                 <button onClick={() => setActiveTab('music')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'music' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <Music size={16} /> 音频
                                 </button>
                                 <button onClick={() => setActiveTab('soundEffects')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'soundEffects' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <Music size={16} className="text-orange-500" /> 音效
                                 </button>
                                 <button onClick={() => setActiveTab('text')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'text' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <TypeIcon size={16} /> 文字
                                 </button>
                                 <button onClick={() => setActiveTab('stickers')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'stickers' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <Sparkles size={16} /> 贴纸
                                 </button>
                             </div>
                              
                             {/* List */}
                             <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                                 {/* Media Import Button */}
                                 {activeTab === 'media' && (
                                     <div className="col-span-2 aspect-video bg-[#1a1a1a] border border-dashed border-[#333] rounded overflow-hidden relative group cursor-pointer hover:border-cyan-500 flex items-center justify-center">
                                         <input 
                                             type="file" 
                                             multiple 
                                             accept="video/*,audio/*,image/*" 
                                             onChange={handleFileImport} 
                                             className="absolute inset-0 opacity-0 cursor-pointer"
                                         />
                                         <div className="flex flex-col items-center gap-2">
                                             <Upload size={24} className="text-cyan-500" />
                                             <span className="text-sm">导入媒体</span>
                                         </div>
                                     </div>
                                 )}
                                 
                                 {/* Media */}
                                 {activeTab === 'media' && resources.map(res => {
                                     const handleAddToTimeline = () => {
                                         // 创建新的片段
                                         const newClip: EditorClip = {
                                             id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                             resourceId: res.id,
                                             startOffset: currentTime,
                                             duration: 5, // 默认持续时间，实际应用中应从媒体文件获取
                                             srcStart: 0,
                                             type: res.type,
                                             name: res.name
                                         };
                                          
                                         // 添加到相应轨道
                                         setTracks(prev => prev.map(track => {
                                             if (track.type === res.type) {
                                                 return { ...track, clips: [...track.clips, newClip] };
                                             }
                                             return track;
                                         }));
                                     };
                                      
                                     return (
                                         <div 
                                             key={res.id} 
                                             className="aspect-video bg-[#000] border border-[#333] rounded overflow-hidden relative group cursor-pointer hover:border-cyan-500"
                                             onClick={handleAddToTimeline}
                                         >
                                             <img src={res.thumbnail || res.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" />
                                             <span className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1 rounded text-white truncate max-w-full">{res.name}</span>
                                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40">
                                                 <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold">+</div>
                                             </div>
                                         </div>
                                     );
                                 })}

                                 {/* Stickers */}
                                 {activeTab === 'stickers' && sidebarItems.stickers.map(item => {
                                     const handleAddSticker = () => {
                                         // 创建新的贴纸片段
                                         const newClip: EditorClip = {
                                             id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                             resourceId: item.id,
                                             startOffset: currentTime,
                                             duration: 5, // 默认持续时间
                                             srcStart: 0,
                                             type: TrackType.EFFECT, // 使用EFFECT类型
                                             name: item.name,
                                             properties: {
                                                 scale: 100,
                                                 opacity: 100,
                                                 rotation: 0
                                             }
                                         };
                                          
                                         // 检查是否已有效果轨道，没有则创建
                                         let newTracks = [...tracks];
                                         let effectTrack = newTracks.find(track => track.type === TrackType.EFFECT);
                                          
                                         if (!effectTrack) {
                                             // 创建新的效果轨道
                                             effectTrack = {
                                                 id: `track-effect-${Date.now()}`,
                                                 type: TrackType.EFFECT,
                                                 clips: []
                                             };
                                             newTracks.push(effectTrack);
                                         }
                                          
                                         // 添加贴纸到效果轨道
                                         effectTrack = {
                                             ...effectTrack,
                                             clips: [...effectTrack.clips, newClip]
                                         };
                                         newTracks = newTracks.map(track => 
                                             track.type === TrackType.EFFECT ? effectTrack! : track
                                         );
                                          
                                         setTracks(newTracks);
                                     };
                                     
                                     return (
                                         <div 
                                             key={item.id} 
                                             className="aspect-square bg-[#1a1a1a] border border-[#333] rounded flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#222] hover:border-cyan-500 transition-all"
                                             onClick={handleAddSticker}
                                         >
                                             <Sparkles size={24} className="text-yellow-500" />
                                             <span className="text-xs">{item.name}</span>
                                         </div>
                                     );
                                 })}

                                 {/* Music */}
                                 {activeTab === 'music' && sidebarItems.music.map(item => {
                                     const handleAddMusic = () => {
                                         // 创建新的音乐片段
                                         const newClip: EditorClip = {
                                             id: `music-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                             resourceId: item.id,
                                             startOffset: currentTime,
                                             duration: 30, // 默认持续时间
                                             srcStart: 0,
                                             type: TrackType.AUDIO,
                                             name: item.name
                                         };
                                          
                                         // 添加到音频轨道
                                         setTracks(prev => prev.map(track => {
                                             if (track.type === TrackType.AUDIO) {
                                                 return { ...track, clips: [...track.clips, newClip] };
                                             }
                                             return track;
                                         }));
                                     };
                                     
                                     return (
                                         <div 
                                             key={item.id} 
                                             className="col-span-2 h-10 bg-[#1a1a1a] border border-[#333] rounded flex items-center px-3 cursor-pointer hover:bg-[#222] hover:border-cyan-500 transition-all"
                                             onClick={handleAddMusic}
                                         >
                                             <Music size={14} className="text-green-500 mr-3" />
                                             <span className="text-xs">{item.name}</span>
                                             <span className="ml-auto text-[10px] text-gray-600">03:00</span>
                                         </div>
                                     );
                                 })}

                                 {/* Text */}
                                 {activeTab === 'text' && sidebarItems.text.map(item => {
                                     const handleAddText = () => {
                                         // 创建新的文字片段
                                         const newClip: EditorClip = {
                                             id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                             resourceId: item.id,
                                             startOffset: currentTime,
                                             duration: 5, // 默认持续时间
                                             srcStart: 0,
                                             type: TrackType.TEXT,
                                             name: item.name,
                                             properties: {
                                                 textContent: item.name === '默认文字' ? '这是一段文字' : item.name,
                                                 fontSize: 24,
                                                 color: '#ffffff',
                                                 fontWeight: 'bold'
                                             }
                                         };
                                          
                                         // 添加到文字轨道
                                         setTracks(prev => prev.map(track => {
                                             if (track.type === TrackType.TEXT) {
                                                 return { ...track, clips: [...track.clips, newClip] };
                                             }
                                             return track;
                                         }));
                                     };
                                     
                                     return (
                                         <div 
                                             key={item.id} 
                                             className="col-span-2 h-12 bg-[#1a1a1a] border border-[#333] rounded flex items-center justify-center cursor-pointer hover:bg-[#222] hover:border-cyan-500 transition-all"
                                             onClick={handleAddText}
                                         >
                                             <span className="text-lg font-bold text-white font-serif">{item.name}</span>
                                         </div>
                                     );
                                 })}
                                 
                                 {/* Sound Effects */}
                                 {activeTab === 'soundEffects' && sidebarItems.soundEffects.map(item => {
                                     const handleAddSoundEffect = () => {
                                         // 创建新的音效片段
                                         const newClip: EditorClip = {
                                             id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                             resourceId: item.id,
                                             startOffset: currentTime,
                                             duration: 3, // 默认持续时间
                                             srcStart: 0,
                                             type: TrackType.AUDIO,
                                             name: item.name
                                         };
                                          
                                         // 添加到音频轨道
                                         setTracks(prev => prev.map(track => {
                                             if (track.type === TrackType.AUDIO) {
                                                 return { ...track, clips: [...track.clips, newClip] };
                                             }
                                             return track;
                                         }));
                                     };
                                     
                                     return (
                                         <div 
                                             key={item.id} 
                                             className="col-span-2 h-10 bg-[#1a1a1a] border border-[#333] rounded flex items-center px-3 cursor-pointer hover:bg-[#222] hover:border-cyan-500 transition-all"
                                             onClick={handleAddSoundEffect}
                                         >
                                             <Music size={14} className="text-orange-500 mr-3" />
                                             <span className="text-xs">{item.name}</span>
                                             <span className="ml-auto text-[10px] text-gray-600">00:03</span>
                                         </div>
                                     );
                                 })}
                             </div>
                         </>
                     )}
                     
                     {/* 剪辑模块 */}
                     {activeModule === 'edit' && (
                         <>
                             {/* Tabs */}
                             <div className="flex h-10 border-b border-[#262626] overflow-x-auto scrollbar-hide">
                                 <button onClick={() => setActiveTab('transitions')} className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'transitions' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <ArrowRight size={16} /> 转场
                                 </button>
                                 <button onClick={() => setActiveTab('effects')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'effects' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <Sparkles size={16} /> 特效
                                 </button>
                             </div>
                              
                             {/* List */}
                             <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                                 {/* Transitions */}
                                 {activeTab === 'transitions' && sidebarItems.transitions.map(item => (
                                     <div 
                                         key={item.id} 
                                         className="col-span-2 h-12 bg-[#1a1a1a] border border-[#333] rounded flex items-center justify-center cursor-pointer hover:bg-[#222]"
                                         onClick={() => handleAddTransition(item.id, item.name)}
                                     >
                                         <ArrowRight size={16} className="text-purple-500 mr-2" />
                                         <span className="text-xs">{item.name}</span>
                                     </div>
                                 ))}

                                 {/* Effects */}
                                 {activeTab === 'effects' && sidebarItems.effects.map(item => (
                                     <div 
                                         key={item.id} 
                                         className="aspect-square bg-[#1a1a1a] border border-[#333] rounded flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#222] hover:border-cyan-500" 
                                         onClick={() => handleAddEffect(item.id, item.name)}
                                     >
                                         <Sparkles size={24} className="text-purple-500" />
                                         <span className="text-xs">{item.name}</span>
                                     </div>
                                 ))}
                             </div>
                         </>
                     )}
                     
                     {/* 调节模块 */}
                     {activeModule === 'adjust' && (
                         <>
                             {/* Tabs */}
                             <div className="flex h-10 border-b border-[#262626] overflow-x-auto scrollbar-hide">
                                 <button onClick={() => setActiveTab('filters')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'filters' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <Palette size={16} /> 滤镜
                                 </button>
                                 <button onClick={() => setActiveTab('adjust')} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center gap-1 text-[10px] ${activeTab === 'adjust' ? 'text-cyan-500 bg-[#1a1a1a]' : 'text-gray-500 hover:text-white'}`}>
                                     <SlidersHorizontal size={16} /> 调节
                                 </button>
                             </div>
                              
                             {/* List */}
                             <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                                 {/* Filters */}
                                 {activeTab === 'filters' && sidebarItems.filters.map(item => (
                                     <div key={item.id} className="aspect-square bg-[#1a1a1a] border border-[#333] rounded overflow-hidden relative group cursor-pointer hover:border-cyan-500">
                                         <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 opacity-60 group-hover:opacity-80"></div>
                                         <span className="absolute bottom-1 left-1 text-[8px] bg-black/60 px-1 rounded text-white truncate max-w-full">{item.name}</span>
                                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40">
                                             <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-black font-bold">+</div>
                                         </div>
                                     </div>
                                 ))}
                                 
                                 {/* Adjust Settings */}
                                 {activeTab === 'adjust' && (
                                     <div className="col-span-2 space-y-4 p-2">
                                         <div className="space-y-2">
                                             <label className="text-sm font-medium text-gray-400">亮度</label>
                                             <input type="range" className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-medium text-gray-400">对比度</label>
                                             <input type="range" className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-medium text-gray-400">饱和度</label>
                                             <input type="range" className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-medium text-gray-400">色调</label>
                                             <input type="range" className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-sm font-medium text-gray-400">锐化</label>
                                             <input type="range" className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" />
                                         </div>
                                     </div>
                                 )}
                             </div>
                         </>
                     )}
                 </div>
            </div>

            {/* 2. CENTER PREVIEW */}
            <div className="flex-1 flex flex-col bg-[#050505]">
                {/* Player */}
                <div className="flex-1 relative flex items-center justify-center p-4">
                     <div className="aspect-video h-full max-h-[60vh] bg-black shadow-2xl relative border border-[#222]">
                         <video 
                            ref={playerRef}
                            className="w-full h-full object-contain"
                            playsInline
                            muted={false} // Allow sound
                         />
                         {/* Text Overlay Mock */}
                         <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-8">
                             {/* Only show if text track has clip at current time */}
                             {tracks.find(t => t.type === TrackType.TEXT)?.clips.some(c => currentTime >= c.startOffset && currentTime < c.startOffset + c.duration) && (
                                 <h2 className="text-4xl font-bold text-white drop-shadow-lg stroke-black" style={{ textShadow: '2px 2px 0 #000' }}>
                                     这是一个字幕示例
                                 </h2>
                             )}
                         </div>
                     </div>
                </div>

                {/* Toolbar */}
                <div className="h-10 bg-[#141414] border-t border-[#262626] flex items-center justify-center gap-6">
                     <button onClick={() => setCurrentTime(0)} className="text-gray-400 hover:text-white"><SkipBack size={18} /></button>
                     <button onClick={togglePlay} className="text-white hover:text-cyan-500">
                         {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                     </button>
                     <button className="text-gray-400 hover:text-white"><SkipForward size={18} /></button>
                </div>
            </div>

            {/* 3. RIGHT INSPECTOR */}
            <div className="w-64 bg-[#111] border-l border-[#262626] flex flex-col">
                 <div className="h-10 border-b border-[#262626] flex items-center px-4 font-bold text-xs uppercase tracking-wider text-gray-500">
                     {selectedClipId ? '属性编辑' : '剪映专业版'}
                 </div>
                 <div className="flex-1 p-4 space-y-6">
                     {selectedClipId ? (
                         <>
                            {/* 获取当前选中的片段 */}
                            {(() => {
                                const selectedClip = tracks.flatMap(track => track.clips).find(clip => clip.id === selectedClipId);
                                if (!selectedClip) return null;
                                
                                return (
                                    <>
                                        {/* 基础属性 */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">基础属性</h3>
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-400">缩放</label>
                                                <input 
                                                    type="range" 
                                                    className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                    min="0" 
                                                    max="200" 
                                                    defaultValue={selectedClip.properties?.scale || 100}
                                                    onChange={(e) => updateClipProperty(selectedClip.id, 'scale', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-400">不透明度</label>
                                                <input 
                                                    type="range" 
                                                    className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                    min="0" 
                                                    max="100" 
                                                    defaultValue={selectedClip.properties?.opacity || 100}
                                                    onChange={(e) => updateClipProperty(selectedClip.id, 'opacity', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-400">旋转</label>
                                                <input 
                                                    type="range" 
                                                    className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                    min="-360" 
                                                    max="360" 
                                                    defaultValue={selectedClip.properties?.rotation || 0}
                                                    onChange={(e) => updateClipProperty(selectedClip.id, 'rotation', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* 视频/音频特定属性 */}
                                        {(selectedClip.type === TrackType.VIDEO || selectedClip.type === TrackType.AUDIO) && (
                                            <div className="space-y-4 pt-4 border-t border-[#333]">
                                                {/* 色彩调节 (仅视频) */}
                                                {selectedClip.type === TrackType.VIDEO && (
                                                    <>
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">色彩调节</h3>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">亮度</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="-100" 
                                                                max="100" 
                                                                defaultValue={selectedClip.properties?.brightness || 0}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'brightness', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">对比度</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="-100" 
                                                                max="100" 
                                                                defaultValue={selectedClip.properties?.contrast || 0}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'contrast', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">饱和度</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="-100" 
                                                                max="100" 
                                                                defaultValue={selectedClip.properties?.saturation || 0}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'saturation', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">色调</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="-180" 
                                                                max="180" 
                                                                defaultValue={selectedClip.properties?.hue || 0}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'hue', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">锐化</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="0" 
                                                                max="100" 
                                                                defaultValue={selectedClip.properties?.sharpness || 0}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'sharpness', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {/* 音频调节 (仅音频和视频) */}
                                                {(selectedClip.type === TrackType.AUDIO || selectedClip.type === TrackType.VIDEO) && (
                                                    <>
                                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mt-4">音频调节</h3>
                                                        
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-gray-400">音量</label>
                                                            <input 
                                                                type="range" 
                                                                className="w-full accent-cyan-500 h-1 bg-[#333] rounded-lg appearance-none" 
                                                                min="0" 
                                                                max="200" 
                                                                defaultValue={selectedClip.properties?.volume || 100}
                                                                onChange={(e) => updateClipProperty(selectedClip.id, 'volume', parseFloat(e.target.value))}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* 删除按钮 */}
                                        <div className="pt-4 border-t border-[#333] space-y-2">
                                            <button 
                                                className="w-full py-1.5 bg-[#222] hover:bg-red-900/50 text-red-400 text-xs rounded flex items-center justify-center gap-2"
                                                onClick={handleDelete}
                                            >
                                                <Trash2 size={12} /> 删除片段
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                         </>
                     ) : (
                         <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                             <Video size={32} />
                             <p className="text-xs text-center">选择一个片段进行编辑</p>
                         </div>
                     )}
                 </div>
            </div>

        </div>

        {/* BOTTOM TIMELINE */}
        <div className="h-64 bg-[#0a0a0a] border-t border-[#262626] flex flex-col shrink-0 relative">
            
            {/* Timeline Tools - Complete Editing Functions from Mind Map */}
            <div className="h-8 bg-[#141414] border-b border-[#222] flex items-center justify-between px-2 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2">
                    {/* Basic Editing Tools */}
                    <button onClick={handleCopy} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="复制 (Ctrl+C)"><Copy size={14} /></button>
                    <button onClick={handlePaste} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="粘贴 (Ctrl+V)"><Clipboard size={14} /></button>
                    <button onClick={handleSplit} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="分离 (Ctrl+D)"><Scissors size={14} /></button>
                    <button onClick={handleDelete} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="删除 (Delete)"><Trash2 size={14} /></button>
                    <button onClick={handleUndo} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="撤销 (Ctrl+Z)"><Undo2 size={14} /></button>
                    <button onClick={handleRedo} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="重做 (Ctrl+Shift+Z)"><Redo2 size={14} /></button>
                    <div className="w-px h-4 bg-[#333] mx-1"></div>
                    
                    {/* Advanced Editing Tools */}
                    <button onClick={handleFreezeFrame} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="定格 (Freeze Frame)"><Camera size={14} /></button>
                    <button onClick={handleReverse} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="倒放 (Reverse)"><RefreshCw size={14} /></button>
                    <button onClick={handleSpeedAdjust} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="倍速 (Speed)"><Gauge size={14} /></button>
                    <button className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="音量 (Volume)"><Volume2 size={14} /></button>
                    <button onClick={handleMirror} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="镜像 (Mirror)"><ArrowLeft size={14} className="transform scale-x-[-1]" /></button>
                    <div className="w-px h-4 bg-[#333] mx-1"></div>
                    
                    {/* Layer Control Tools */}
                    <button className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="关闭视频图层"><EyeOff size={14} /></button>
                    <button className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white" title="关闭音频图层"><VolumeX size={14} /></button>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-2 pr-2 whitespace-nowrap">
                    <button onClick={() => setZoomLevel(Math.max(5, zoomLevel - 5))} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"><ZoomOut size={14} /></button>
                    <input type="range" min="5" max="50" value={zoomLevel} onChange={e => setZoomLevel(parseInt(e.target.value))} className="w-24 accent-cyan-500 h-1" />
                    <button onClick={() => setZoomLevel(Math.min(100, zoomLevel + 5))} className="p-1 hover:bg-[#222] rounded text-gray-400 hover:text-white"><ZoomIn size={14} /></button>
                </div>
            </div>

            {/* Timeline Tracks */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar" ref={timelineRef}>
                <div className="min-w-full h-full relative" style={{ width: '2000px' /* Dynamic in real app */ }}>
                    
                    {/* Time Ruler */}
                    <div className="h-6 bg-[#111] border-b border-[#222] sticky top-0 z-10 flex items-end">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} className="absolute bottom-0 h-2 border-l border-gray-600 text-[8px] text-gray-500 pl-1" style={{ left: i * zoomLevel * 5 }}>
                                {i * 5}s
                            </div>
                        ))}
                    </div>

                    {/* Cursor */}
                    <div 
                        className="absolute top-0 bottom-0 w-px bg-white z-30 pointer-events-none"
                        style={{ left: currentTime * zoomLevel }}
                    >
                        <div className="absolute -top-0 -translate-x-1/2 text-cyan-500">▼</div>
                    </div>

                    {/* Tracks Render */}
                    <div className="p-2 space-y-2">
                        {tracks.map(track => (
                            <div key={track.id} className="h-16 bg-[#111] border border-[#222] rounded relative flex items-center group">
                                <div className="absolute left-0 top-0 bottom-0 w-24 bg-[#1a1a1a] border-r border-[#222] z-10 flex items-center justify-center text-xs font-bold text-gray-500 sticky left-0 uppercase">
                                    {track.type}
                                </div>
                                <div className="pl-24 w-full h-full relative">
                                    {track.clips.map(clip => (
                                        <div
                                            key={clip.id}
                                            onClick={(e) => handleClipClick(e, clip.id)}
                                            className={`absolute top-1 bottom-1 rounded border overflow-hidden cursor-pointer select-none transition-all ${
                                                selectedClipId === clip.id 
                                                ? 'border-cyan-500 ring-1 ring-cyan-500 z-20' 
                                                : 'border-transparent hover:border-white/50'
                                            } ${
                                                track.type === TrackType.VIDEO ? 'bg-blue-900/40' :
                                                track.type === TrackType.AUDIO ? 'bg-green-900/40' :
                                                'bg-purple-900/40'
                                            }`}
                                            style={{
                                                left: clip.startOffset * zoomLevel,
                                                width: clip.duration * zoomLevel
                                            }}
                                        >
                                            <div className="px-2 py-1 text-[10px] text-white/80 font-mono truncate">
                                                {clip.name}
                                            </div>
                                            {/* Mock Waveform/Thumbnails */}
                                            {track.type === TrackType.VIDEO && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1/2 flex opacity-30">
                                                    {Array.from({ length: Math.ceil(clip.duration) }).map((_, i) => (
                                                        <div key={i} className="flex-1 border-r border-white/20 bg-white/10"></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>

        {/* Export Settings Dialog */}
        {showExportSettings && (
            <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333] shadow-2xl w-[400px] max-w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-white">导出设置</h2>
                        <button 
                            onClick={handleCloseExportSettings} 
                            className="text-gray-400 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        {/* 分辨率 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">分辨率</label>
                            <select 
                                className="w-full bg-[#222] border border-[#333] rounded px-3 py-2 text-white text-sm"
                                value={exportSettings.resolution}
                                onChange={(e) => handleUpdateExportSettings('resolution', e.target.value)}
                            >
                                <option value="1920x1080">1920x1080 (1080p)</option>
                                <option value="1280x720">1280x720 (720p)</option>
                                <option value="3840x2160">3840x2160 (4K)</option>
                            </select>
                        </div>
                        
                        {/* 帧率 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">帧率</label>
                            <select 
                                className="w-full bg-[#222] border border-[#333] rounded px-3 py-2 text-white text-sm"
                                value={exportSettings.frameRate}
                                onChange={(e) => handleUpdateExportSettings('frameRate', e.target.value)}
                            >
                                <option value={24}>24 fps</option>
                                <option value={30}>30 fps</option>
                                <option value={60}>60 fps</option>
                            </select>
                        </div>
                        
                        {/* 比特率 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">比特率</label>
                            <select 
                                className="w-full bg-[#222] border border-[#333] rounded px-3 py-2 text-white text-sm"
                                value={exportSettings.bitrate}
                                onChange={(e) => handleUpdateExportSettings('bitrate', e.target.value)}
                            >
                                <option value="4M">4 Mbps</option>
                                <option value="8M">8 Mbps</option>
                                <option value="16M">16 Mbps</option>
                            </select>
                        </div>
                        
                        {/* 格式 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">格式</label>
                            <select 
                                className="w-full bg-[#222] border border-[#333] rounded px-3 py-2 text-white text-sm"
                                value={exportSettings.format}
                                onChange={(e) => handleUpdateExportSettings('format', e.target.value)}
                            >
                                <option value="mp4">MP4</option>
                                <option value="mov">MOV</option>
                                <option value="webm">WebM</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6">
                        <button 
                            onClick={handleCloseExportSettings}
                            className="px-4 py-2 bg-[#222] text-gray-300 rounded hover:bg-[#333] text-sm"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleStartExport}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded hover:brightness-110 text-sm"
                        >
                            导出
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Export Progress Overlay */}
        {isExporting && (
             <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
                 <div className="bg-[#1a1a1a] p-8 rounded-2xl flex flex-col items-center gap-4 border border-[#333] shadow-2xl animate-fade-in-up">
                      <FancyLoader type="video" size="md" />
                      <h2 className="text-xl font-bold text-white">正在导出...</h2>
                      <p className="text-gray-400 text-sm">正在处理 {tracks.flatMap(t => t.clips).length} 个片段</p>
                      <div className="w-64 h-2 bg-[#333] rounded-full overflow-hidden mt-2">
                          <div 
                              className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                              style={{ width: `${exportProgress}%` }}
                          ></div>
                      </div>
                      <p className="text-gray-500 text-xs">{Math.round(exportProgress)}%</p>
                 </div>
             </div>
        )}

    </div>
  );
}

export default VideoEditorView;
