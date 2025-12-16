
import React, { useState, useEffect, useRef } from 'react';
import { X, Film, Image as ImageIcon, Type, Clock, Camera, Video, Wand2, Settings2, Zap, Sparkles, Upload, Trash2, Music, Volume2, Clapperboard, Globe, ArrowLeft, ArrowUp, Play, Pause, ArrowRight } from 'lucide-react';
import { Shot } from '../types';

interface VideoGenerationModalProps {
  isOpen: boolean;
  shot: Shot | null;
  previousShotImage?: string | null; // New prop for consistency
  onClose: () => void;
  onGenerate: (shotId: number, params: { prompt: string; firstFrameImage?: string; aspectRatio: string; model: string; lastFrameImage?: string; audioFile?: string; duration: number }) => void;
  defaultAspectRatio: string;
  onNext?: () => void; // New: Handler for next shot
  hasNext?: boolean;   // New: Check if next shot exists
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ 
  isOpen, 
  shot, 
  previousShotImage,
  onClose, 
  onGenerate,
  defaultAspectRatio,
  onNext,
  hasNext
}) => {
  const [prompt, setPrompt] = useState('');
  // Replaced simple useImage boolean with source selection
  const [firstFrameSource, setFirstFrameSource] = useState<'current' | 'prev' | 'none'>('current');
  
  const [aspectRatio, setAspectRatio] = useState(defaultAspectRatio);
  const [lastFrameImage, setLastFrameImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Settings
  const [model, setModel] = useState<'veo3.1-fast' | 'veo3.1-pro' | 'sora-2'>('veo3.1-fast');
  const [duration, setDuration] = useState<number>(5);
  
  // Audio State
  const [audioPrompt, setAudioPrompt] = useState('');
  const [audioFile, setAudioFile] = useState<string | null>(null);

  // Language State for Prompt (Default 'zh' as requested)
  const [promptLang, setPromptLang] = useState<'zh' | 'en'>('zh');

  // Video Preview State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Helper to construct prompt based on language
  const constructPrompt = (lang: 'zh' | 'en', currentShot: Shot) => {
      const isZh = lang === 'zh';
      
      // Select base visual prompt
      let baseText = '';
      if (currentShot.imageUrl) {
          baseText = isZh 
             ? (currentShot.i2vPrompt || currentShot.contentZh)
             : (currentShot.i2vPromptEn || currentShot.contentEn);
      } else {
          baseText = isZh
             ? (currentShot.t2vPrompt || currentShot.contentZh)
             : (currentShot.t2vPromptEn || currentShot.contentEn);
      }
      
      // Append Subtitles and Narration instructions
      if (isZh) {
          baseText += `, 中文字幕`;
          if (currentShot.narrationZh && currentShot.narrationZh !== '...') {
              baseText += `, 包含对白: "${currentShot.narrationZh}"`;
          }
      } else {
          if (currentShot.narrationEn && currentShot.narrationEn !== '...') {
              baseText += `, Narration: "${currentShot.narrationEn}"`;
          }
      }
      
      return baseText || '';
  };

  // Reset state when shot changes
  useEffect(() => {
    if (shot) {
      // Logic: If previous shot image exists, default to it for consistency. Otherwise current.
      if (previousShotImage) {
          setFirstFrameSource('prev');
      } else if (shot.imageUrl) {
          setFirstFrameSource('current');
      } else {
          setFirstFrameSource('none');
      }

      setAspectRatio(defaultAspectRatio);
      setModel('veo3.1-fast'); // Default model
      setDuration(5);
      // Init lastFrame from shot (newly added prop to Shot)
      setLastFrameImage(shot.lastFrameImageUrl || null);
      
      // Audio
      setAudioPrompt(shot.audioPromptEn || shot.audioPromptZh || '');
      setAudioFile(shot.audioFileUrl || null);

      // Prompt Initialization (Default to Chinese)
      setPromptLang('zh');
      setPrompt(constructPrompt('zh', shot));

      // Reset Video Player
      setIsPlaying(false);
      if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
      }
    }
  }, [shot, previousShotImage, defaultAspectRatio]);

  // Adjust duration when model changes
  useEffect(() => {
     if (model === 'sora-2') {
         // Sora supports 5s, 10s, 15s
         if (![5, 10, 15].includes(duration)) setDuration(10);
     } else {
         // Veo supports 5s, 10s
         if (duration !== 5 && duration !== 10) setDuration(5);
     }
  }, [model]);

  const handleLangToggle = () => {
      if (!shot) return;
      const newLang = promptLang === 'zh' ? 'en' : 'zh';
      setPromptLang(newLang);
      setPrompt(constructPrompt(newLang, shot));
  };

  const toggleVideoPlay = () => {
      if (videoRef.current) {
          if (isPlaying) {
              videoRef.current.pause();
          } else {
              videoRef.current.play();
          }
          setIsPlaying(!isPlaying);
      }
  };

  if (!isOpen || !shot) return null;

  // Resolve the actual image string to use
  const getActiveFirstFrame = () => {
      if (firstFrameSource === 'prev') return previousShotImage || undefined;
      if (firstFrameSource === 'current') return shot.imageUrl || undefined;
      return undefined;
  };

  const handleGenerate = () => {
    onGenerate(shot.id, {
      prompt,
      firstFrameImage: getActiveFirstFrame(),
      aspectRatio,
      model,
      lastFrameImage: lastFrameImage || undefined,
      audioFile: audioFile || undefined,
      duration
    });
    // Don't close automatically if next step is desired, but standard UX is to keep it open or close?
    // User asked for a Next button to jump, but Generate usually performs action.
    // We will close, unless user clicks Next.
    onClose();
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLastFrameImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       const reader = new FileReader();
       reader.onloadend = () => {
          setAudioFile(reader.result as string);
       };
       reader.readAsDataURL(file);
    }
  };

  const activeImagePreview = getActiveFirstFrame();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative bg-[#121212] w-full md:max-w-6xl h-full md:h-auto max-h-[100vh] md:max-h-[90vh] border-none md:border border-[#262626] rounded-none md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-gray-400 hover:text-white rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        {/* Left: Visual Preview */}
        <div className="w-full md:w-1/3 bg-[#0a0a0a] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col shrink-0">
           <div className="p-4 border-b border-[#262626] flex items-center gap-2">
              <Film size={18} className="text-cinema-accent" />
              <h3 className="font-bold text-white">镜头预览 #{shot.shotNumber}</h3>
           </div>
           
           <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0a0a] min-h-[200px] md:min-h-0">
              <div className={`relative w-full shadow-2xl border border-[#333] transition-all duration-300 group/preview ${aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[120px] md:max-w-[180px]' : 'aspect-video'}`}>
                  
                  {/* Priority: Video URL > Image Preview > Empty */}
                  {shot.videoUrl ? (
                      <div className="w-full h-full relative bg-black cursor-pointer" onClick={toggleVideoPlay}>
                          <video 
                             ref={videoRef}
                             src={shot.videoUrl} 
                             className="w-full h-full object-cover"
                             loop
                             onEnded={() => setIsPlaying(false)}
                          />
                          {!isPlaying && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] group-hover/preview:bg-black/10 transition-colors">
                                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/50 text-white shadow-xl">
                                      <Play size={20} fill="currentColor" className="ml-1" />
                                  </div>
                              </div>
                          )}
                          {/* Playing indicator */}
                          {isPlaying && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600/80 text-white text-[8px] font-bold rounded animate-pulse">
                                  PREVIEW
                              </div>
                          )}
                      </div>
                  ) : activeImagePreview ? (
                    <img 
                      src={activeImagePreview} 
                      alt="Reference" 
                      className={`w-full h-full object-cover transition-opacity duration-300`} 
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center flex-col gap-2 text-gray-600">
                       <ImageIcon size={32} />
                       <span className="text-xs">纯文本生成模式</span>
                    </div>
                  )}
                  
                  {/* Aspect Ratio Guide Overlay */}
                  <div className="absolute inset-0 border-2 border-white/10 pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-white/30 font-mono tracking-widest">{aspectRatio}</span>
                  </div>
              </div>
              
              {/* Source Indicator */}
              {activeImagePreview && !shot.videoUrl && (
                  <div className="mt-4 px-3 py-1 bg-black/50 rounded-full border border-white/10 text-[10px] text-gray-300 flex items-center gap-2">
                      <ArrowUp size={12} className={firstFrameSource === 'prev' ? 'text-cinema-accent' : 'text-gray-500'} />
                      {firstFrameSource === 'prev' ? '使用上一镜头尾帧' : '使用当前分镜图'}
                  </div>
              )}
              
              {shot.videoUrl && (
                  <div className="mt-4 px-3 py-1 bg-green-900/30 rounded-full border border-green-500/30 text-[10px] text-green-400 flex items-center gap-2">
                      <Film size={12} /> 视频已生成 (点击播放预览)
                  </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2 justify-center w-full px-4">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[10px] text-gray-400">
                     <Camera size={12} /> {shot.shotSize}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#333] rounded text-[10px] text-gray-400">
                     <Video size={12} /> {shot.cameraMovement}
                  </div>
              </div>
           </div>
        </div>

        {/* Right: Settings */}
        <div className="w-full md:w-2/3 p-4 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="mb-4 md:mb-6 flex items-center justify-between">
               <div>
                 <h2 className="text-xl md:text-2xl font-bold text-white mb-1">视频生成配置</h2>
                 <p className="text-gray-500 text-xs">Shot ID: {shot.id}</p>
               </div>
               <div className="flex items-center gap-2">
                 <div className="px-3 py-1 bg-[#1a1a1a] border border-[#333] rounded-full text-xs font-mono text-cinema-accent flex items-center gap-2">
                    {model === 'veo3.1-fast' && <Zap size={12}/>}
                    {model === 'veo3.1-pro' && <Sparkles size={12}/>}
                    {model === 'sora-2' && <Clapperboard size={12}/>}
                    {model}
                 </div>
               </div>
            </div>

            {/* Prompt Input */}
            <div className="mb-6 space-y-2">
               <label className="flex items-center justify-between text-sm font-bold text-gray-300">
                  <div className="flex items-center gap-2">
                     <Type size={16} className="text-cinema-accent" /> 
                     提示词 (Prompt)
                  </div>
                  <button 
                    onClick={handleLangToggle}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#333] text-xs hover:border-cinema-accent transition-colors"
                  >
                     <Globe size={12} />
                     {promptLang === 'zh' ? '中文' : 'English'}
                  </button>
               </label>
               <textarea
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="w-full h-24 bg-[#1a1a1a] border border-[#333] rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-cinema-accent resize-none leading-relaxed"
                 placeholder="Prompt description..."
               />
               <p className="text-[10px] text-gray-500 text-right">
                  {promptLang === 'zh' ? '* 已自动包含“中文字幕”及“对白”指令' : '* English mode selected'}
               </p>
            </div>
            
            <div className="h-px bg-[#222] my-4"></div>

            {/* AUDIO CONFIG SECTION */}
            <div className="mb-6 space-y-3">
               <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <Music size={16} className="text-pink-400" /> 音效/BGM 配置
               </label>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Audio Prompt Display */}
                  <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">AI Audio Suggestion</span>
                      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-xs text-gray-300 h-20 overflow-y-auto italic">
                          {audioPrompt || "No audio suggestion available."}
                      </div>
                  </div>

                  {/* Audio File Upload */}
                  <div className="space-y-1">
                       <span className="text-[10px] text-gray-500 font-bold uppercase">Upload File (Optional)</span>
                       {audioFile ? (
                           <div className="bg-[#1a1a1a] border border-pink-500/30 rounded-lg p-2 h-20 flex flex-col justify-center relative group">
                               <div className="flex items-center gap-2 text-pink-400">
                                   <Volume2 size={16} />
                                   <span className="text-xs font-bold">Audio File Loaded</span>
                               </div>
                               <audio src={audioFile} controls className="w-full h-6 mt-2 opacity-60 hover:opacity-100" />
                               <button 
                                  onClick={() => setAudioFile(null)}
                                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                               >
                                  <Trash2 size={14} />
                               </button>
                           </div>
                       ) : (
                           <div 
                              onClick={() => audioInputRef.current?.click()}
                              className="bg-[#1a1a1a] border border-dashed border-[#333] rounded-lg h-20 flex flex-col items-center justify-center cursor-pointer hover:bg-[#222] hover:border-gray-500 transition-colors"
                           >
                              <Upload size={16} className="text-gray-500 mb-1" />
                              <span className="text-[10px] text-gray-500">Upload .mp3 / .wav</span>
                              <input 
                                  type="file" 
                                  ref={audioInputRef}
                                  className="hidden"
                                  accept="audio/*"
                                  onChange={handleAudioUpload}
                              />
                           </div>
                       )}
                  </div>
               </div>
            </div>

            <div className="h-px bg-[#222] my-4"></div>

            {/* Settings Grid */}
            <div className="space-y-6 mb-8">
               
               {/* 1. Model & Duration */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Settings2 size={12} /> 模型选择
                      </label>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                         <button
                            onClick={() => setModel('veo3.1-fast')}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 min-w-[70px] ${
                               model === 'veo3.1-fast'
                               ? 'bg-cinema-accent/10 border-cinema-accent text-cinema-accent' 
                               : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                            }`}
                         >
                            <Zap size={14} />
                            Fast
                         </button>
                         <button
                            onClick={() => setModel('veo3.1-pro')}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 min-w-[70px] ${
                               model === 'veo3.1-pro'
                               ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                               : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                            }`}
                         >
                            <Sparkles size={14} />
                            Pro
                         </button>
                         <button
                            onClick={() => setModel('sora-2')}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 min-w-[70px] ${
                               model === 'sora-2'
                               ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                               : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                            }`}
                         >
                            <Clapperboard size={14} />
                            Sora
                         </button>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Clock size={12} /> 视频时长
                      </label>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                         {model === 'sora-2' ? (
                            <>
                                <button
                                    onClick={() => setDuration(5)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    duration === 5
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    5s
                                </button>
                                <button
                                    onClick={() => setDuration(10)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    duration === 10
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    10s
                                </button>
                                <button
                                    onClick={() => setDuration(15)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    duration === 15
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    15s
                                </button>
                            </>
                         ) : (
                            <>
                                <button
                                    onClick={() => setDuration(5)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    duration === 5
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    5s
                                </button>
                                <button
                                    onClick={() => setDuration(10)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    duration === 10
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    10s
                                </button>
                            </>
                         )}
                      </div>
                  </div>
               </div>

               {/* 2. Reference Images & Aspect Ratio */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Frame & Last Frame */}
                  <div className="col-span-1 space-y-4">
                      {/* First Frame Config - UPDATED */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                            <ImageIcon size={12} /> 首帧 (First Frame)
                        </label>
                        <div className="flex flex-col gap-2">
                            {/* Option 1: Previous Shot Tail (If available) */}
                            {previousShotImage && (
                                <button
                                    onClick={() => setFirstFrameSource('prev')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left flex items-center justify-between group ${
                                        firstFrameSource === 'prev'
                                        ? 'bg-cinema-accent/10 border-cinema-accent text-cinema-accent' 
                                        : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    <span>上一镜头尾帧 (推荐)</span>
                                    <div className="w-6 h-4 rounded overflow-hidden border border-white/20">
                                        <img src={previousShotImage} className="w-full h-full object-cover" />
                                    </div>
                                </button>
                            )}

                            {/* Option 2: Current Shot Image */}
                            <button
                                onClick={() => setFirstFrameSource('current')}
                                disabled={!shot.imageUrl}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left ${
                                    firstFrameSource === 'current'
                                    ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                } ${!shot.imageUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                使用当前分镜图
                            </button>
                            
                            {/* Option 3: None */}
                            <button
                                onClick={() => setFirstFrameSource('none')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left ${
                                    firstFrameSource === 'none'
                                    ? 'bg-gray-700 text-white border-gray-500' 
                                    : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                                }`}
                            >
                                不使用 (纯文本)
                            </button>
                        </div>
                      </div>

                      {/* Last Frame Config - ALWAYS VISIBLE FOR ALL MODELS */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon size={12} /> 尾帧 (Last Frame) <span className="text-[10px] text-gray-600 bg-[#222] px-1 rounded">OPTIONAL</span>
                            </div>
                            {lastFrameImage && (
                                <button onClick={() => setLastFrameImage(null)} className="text-red-400 hover:text-red-300">
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </label>
                        
                        {lastFrameImage ? (
                            <div className="relative w-full aspect-video bg-[#0a0a0a] rounded-lg border border-[#333] overflow-hidden group">
                                <img src={lastFrameImage} alt="Last Frame" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => setLastFrameImage(null)} className="p-2 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500/40">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-12 bg-[#1a1a1a] border border-dashed border-[#333] rounded-lg flex flex-row items-center justify-center gap-2 cursor-pointer hover:border-gray-500 hover:bg-[#222] transition-colors"
                            >
                                <Upload size={14} className="text-gray-500" />
                                <span className="text-[10px] text-gray-500">上传图片</span>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleLastFrameUpload} 
                                />
                            </div>
                        )}
                      </div>
                  </div>

                  {/* Aspect Ratio Config */}
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Video size={12} /> 视频比例
                      </label>
                      <div className="flex gap-2">
                         <button
                            onClick={() => setAspectRatio('16:9')}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                               aspectRatio === '16:9'
                               ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                               : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                            }`}
                         >
                            16:9
                         </button>
                         <button
                            onClick={() => setAspectRatio('9:16')}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                               aspectRatio === '9:16'
                               ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                               : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'
                            }`}
                         >
                            9:16
                         </button>
                      </div>
                  </div>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto flex gap-4 pt-4 md:pt-0">
               <button 
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-transparent border border-[#333] text-gray-400 font-bold hover:text-white hover:border-gray-500 transition-colors"
               >
                  取消
               </button>
               
               <div className="flex-1 flex gap-2">
                   <button 
                      onClick={handleGenerate}
                      className="flex-1 px-4 md:px-6 py-3 rounded-xl bg-cinema-accent text-black font-bold text-sm hover:bg-yellow-400 transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-cinema-accent/20"
                   >
                      <Wand2 size={18} />
                      生成视频
                   </button>
                   
                   {hasNext && onNext && (
                       <button 
                          onClick={onNext}
                          className="px-4 md:px-6 py-3 rounded-xl bg-[#262626] border border-[#333] text-white font-bold text-sm hover:bg-[#333] transition-colors flex items-center gap-2"
                          title="Jump to next shot"
                       >
                          下一步
                       </button>
                   )}
               </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default VideoGenerationModal;
