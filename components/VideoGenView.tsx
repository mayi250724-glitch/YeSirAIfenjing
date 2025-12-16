
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Video, Wand2, Upload, Download, Trash2, Zap, Settings2, Sparkles, Image as ImageIcon, Clapperboard, Clock, Play, Pause, Film, FileVideo, Edit2 } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import FancyLoader from './FancyLoader';

interface VideoGenViewProps {
  onBack: () => void;
  onEnterEditor?: (videoUrl: string, prompt: string) => void;
}

interface GeneratedVideo {
    id: string;
    url: string;
    prompt: string;
    model: string;
    timestamp: number;
}

const VideoGenView: React.FC<VideoGenViewProps> = ({ onBack }) => {
  // Config State
  const [mode, setMode] = useState<'text2video' | 'img2video' | 'multimodal'>('text2video');
  const [prompt, setPrompt] = useState('');
  // Initialize from global config
  const [model, setModel] = useState(GeminiService.getApiConfig().videoModel || 'veo3.1-fast');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);
  
  // Images
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [sourceVideo, setSourceVideo] = useState<string | null>(null); // For Multimodal
  const [subjectImage, setSubjectImage] = useState<string | null>(null); // For Multimodal
  
  // App State
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sync model with config when view loads
  useEffect(() => {
    const config = GeminiService.getApiConfig();
    if (config.videoModel) {
        setModel(config.videoModel);
    }
  }, []);

  // Mode switching logic for model defaults
  useEffect(() => {
      if (mode === 'multimodal') {
          setModel('kling-video-o1');
          // 确保在多模态模式下使用T8Star平台，因为kling-video-o1只支持T8Star
          const t8starConfig = GeminiService.getAllApiConfigs()['t8star'];
          if (t8starConfig) {
              console.log('切换到T8Star平台以支持kling-video-o1模型');
              GeminiService.setApiConfig(t8starConfig);
          }
      } else {
          // Revert to config default or keep current if valid
          if (model === 'kling-video-o1') {
              const config = GeminiService.getApiConfig();
              setModel(config.videoModel || 'veo3.1-fast');
          }
      }
  }, [mode]);

  const handleGenerate = async () => {
      if (!prompt.trim()) return;
      if (mode === 'img2video' && !firstFrame) {
          setErrorMsg("图生视频模式必须上传参考图 (First Frame)");
          return;
      }
      if (mode === 'multimodal' && !sourceVideo) {
          setErrorMsg("多模态编辑必须上传原视频素材 (Source Video)");
          return;
      }

      setIsGenerating(true);
      setErrorMsg(null);
      setProgress(0);
      setStatus('Queued');
      
      try {
          const videoUrl = await GeminiService.generateVideo(
              prompt, 
              (mode === 'img2video' || mode === 'multimodal') ? (firstFrame || undefined) : undefined,
              aspectRatio, 
              model,
              (prog, stat) => {
                  setProgress(prog);
                  setStatus(stat);
              },
              lastFrame || undefined,
              duration,
              sourceVideo || undefined,
              subjectImage || undefined
          );
          
          const newVideo: GeneratedVideo = {
              id: Date.now().toString(),
              url: videoUrl,
              prompt: prompt,
              model: model,
              timestamp: Date.now()
          };
          
          setCurrentVideo(newVideo);
          setHistory(prev => [newVideo, ...prev]);

      } catch (e: any) {
          setErrorMsg(e.message || "生成失败");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>, type: 'first' | 'last' | 'subject') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (type === 'first') setFirstFrame(reader.result as string);
              else if (type === 'last') setLastFrame(reader.result as string);
              else if (type === 'subject') setSubjectImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // In real app, might need to upload to server first to get URL, or use Base64 if small.
          // Using Base64 for now as per current service capability assumption.
          const reader = new FileReader();
          reader.onloadend = () => {
              setSourceVideo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const selectHistoryItem = (item: GeneratedVideo) => {
      setCurrentVideo(item);
      setIsPlaying(false);
  };

  const togglePlay = () => {
      if (videoRef.current) {
          if (isPlaying) videoRef.current.pause();
          else videoRef.current.play();
          setIsPlaying(!isPlaying);
      }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="h-16 border-b border-[#262626] bg-[#141414] px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <Video className="text-rose-500" /> <span className="hidden sm:inline">神笔马良 · </span>视频生成
                </h2>
            </div>
        </div>

        {/* 3-Column Layout: Config | Preview | History */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* COLUMN 1: Configuration (Left) */}
            <div className="w-full md:w-80 bg-[#111] border-b md:border-b-0 md:border-r border-[#262626] flex flex-col p-4 md:p-6 overflow-y-auto custom-scrollbar md:h-full shrink-0 z-10">
                
                {/* Tabs */}
                <div className="flex bg-[#1a1a1a] p-1 rounded-lg mb-6 border border-[#333]">
                    <button 
                        onClick={() => setMode('text2video')}
                        className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${mode === 'text2video' ? 'bg-[#333] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        文生视频
                    </button>
                    <button 
                         onClick={() => setMode('img2video')}
                         className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${mode === 'img2video' ? 'bg-[#333] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        图生视频
                    </button>
                    <button 
                         onClick={() => setMode('multimodal')}
                         className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${mode === 'multimodal' ? 'bg-[#333] text-rose-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        多模态编辑
                    </button>
                </div>

                {/* Prompt Section */}
                <div className="mb-6 space-y-2 relative">
                    <label className="text-sm font-bold text-gray-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clapperboard size={14} className="text-rose-500" />
                            视频创意 (Prompt)
                        </div>
                    </label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-24 md:h-32 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 resize-none placeholder-gray-600 leading-relaxed"
                        placeholder="描述视频内容，例如：一只赛博朋克风格的猫在霓虹灯街道上奔跑..."
                    />
                </div>

                {/* Multimodal Uploads */}
                {mode === 'multimodal' && (
                    <div className="mb-6 grid grid-cols-3 gap-2">
                        {/* Video Upload */}
                        <div 
                            className="aspect-square bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 hover:bg-[#222] transition-all relative overflow-hidden group"
                            onClick={() => videoInputRef.current?.click()}
                        >
                            {sourceVideo ? (
                                <>
                                    <video src={sourceVideo} className="w-full h-full object-cover opacity-60" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px]">更换</div>
                                </>
                            ) : (
                                <>
                                    <FileVideo className="text-gray-500 mb-1" size={20} />
                                    <span className="text-[10px] text-gray-500 font-bold">视频(必填)</span>
                                    <span className="text-[8px] text-gray-600">3-10s</span>
                                </>
                            )}
                            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleUploadVideo} />
                        </div>

                        {/* Image Upload */}
                        <div 
                            className="aspect-square bg-[#1a1a1a] border border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-[#222] transition-all relative overflow-hidden"
                            onClick={() => firstFrameInputRef.current?.click()}
                        >
                            {firstFrame ? (
                                <img src={firstFrame} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <ImageIcon className="text-gray-500 mb-1" size={20} />
                                    <span className="text-[10px] text-gray-500">图片参考</span>
                                </>
                            )}
                            <input type="file" ref={firstFrameInputRef} className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'first')} />
                        </div>

                        {/* Subject Upload */}
                        <div 
                            className="aspect-square bg-[#1a1a1a] border border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 hover:bg-[#222] transition-all relative overflow-hidden"
                            onClick={() => subjectInputRef.current?.click()}
                        >
                            {subjectImage ? (
                                <img src={subjectImage} className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Upload className="text-gray-500 mb-1" size={20} />
                                    <span className="text-[10px] text-gray-500">主体参考</span>
                                </>
                            )}
                            <input type="file" ref={subjectInputRef} className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'subject')} />
                        </div>
                        
                        <div className="col-span-3 text-[10px] text-gray-500 leading-tight mt-1">
                            上传 3-10s 视频素材，输入文字、图片或主体，轻松对原视频进行内容修改编辑、景别视角切换、风格重绘等。
                        </div>
                    </div>
                )}

                {/* Image Uploads (Original Img2Video) */}
                {mode === 'img2video' && (
                    <div className="mb-6 space-y-4">
                        {/* First Frame */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300 flex justify-between">
                                首帧 (First Frame) <span className="text-rose-500 text-[10px]">*Required</span>
                            </label>
                            <div 
                                onClick={() => firstFrameInputRef.current?.click()}
                                className="w-full h-24 bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 hover:bg-[#222] transition-all relative overflow-hidden group"
                            >
                                {firstFrame ? (
                                    <>
                                        <img src={firstFrame} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                        <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 font-bold text-xs">
                                            点击更换
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="text-gray-600 mb-2" size={24} />
                                        <span className="text-xs text-gray-500">上传参考图</span>
                                    </>
                                )}
                                <input type="file" ref={firstFrameInputRef} className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'first')} />
                            </div>
                        </div>
                        
                        {/* Last Frame */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-300 flex justify-between">
                                尾帧 (Last Frame) <span className="text-gray-500 text-[10px] bg-[#222] px-1 rounded">Optional</span>
                            </label>
                            {lastFrame ? (
                                <div className="relative w-full aspect-video bg-[#1a1a1a] rounded-xl border border-[#333] overflow-hidden group">
                                    <img src={lastFrame} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setLastFrame(null)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => lastFrameInputRef.current?.click()}
                                    className="w-full h-12 bg-[#1a1a1a] border border-dashed border-[#333] rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-[#222] hover:border-gray-500 transition-colors"
                                >
                                    <Upload size={14} className="text-gray-500" />
                                    <span className="text-xs text-gray-500">上传尾帧</span>
                                    <input type="file" ref={lastFrameInputRef} className="hidden" accept="image/*" onChange={(e) => handleUploadImage(e, 'last')} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings */}
                <div className="mb-6 space-y-4">
                     {/* Model Selection */}
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            <Settings2 size={14} className="text-yellow-500" />
                            生成模型
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className={`w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono ${mode === 'multimodal' ? 'text-rose-400 font-bold' : ''}`}
                                placeholder="e.g. sora-2, veo3.1-fast"
                                readOnly={mode === 'multimodal'}
                            />
                            {/* API Platform Selector with Real-time Display */}
                            <div className="absolute right-2 top-2 flex items-center gap-1">
                                <select 
                                    onChange={(e) => {
                                        const provider = e.target.value;
                                        const config = GeminiService.getAllApiConfigs()[provider];
                                        if (config) {
                                            GeminiService.setApiConfig(config);
                                            // 更新模型为当前平台支持的视频模型
                                            setModel(config.videoModel);
                                        }
                                    }}
                                    className="text-[10px] bg-[#1a1a1a] text-white border border-[#333] rounded px-2 py-1 focus:outline-none"
                                    value={GeminiService.getApiConfig().provider}
                                    disabled={mode === 'multimodal'}
                                >
                                    {Object.keys(GeminiService.getAllApiConfigs()).map(provider => (
                                        <option key={provider} value={provider}>
                                            {provider === 'gemini' ? 'Gemini/Dakka' : 
                                             provider === 't8star' ? 't8star' : 
                                             provider === 'tuzi' ? 'tuzhi' : 
                                             provider === 'yunwu' ? 'Yunwu/OpenAI' : 
                                             provider === 'openai' ? 'OpenAI' : 
                                             provider === 'dalle' ? 'DALL-E' : provider}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {mode !== 'multimodal' && (
                            <div className="flex gap-2">
                                <button onClick={() => setModel('veo3.1-fast')} className="flex-1 text-[10px] bg-[#222] py-1.5 rounded text-gray-400 hover:text-white border border-transparent hover:border-rose-500/50 transition-all">Veo Fast</button>
                                <button onClick={() => setModel('sora-2')} className="flex-1 text-[10px] bg-[#222] py-1.5 rounded text-gray-400 hover:text-white border border-transparent hover:border-rose-500/50 transition-all">Sora 2</button>
                            </div>
                        )}
                        {mode === 'multimodal' && (
                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Sparkles size={10} className="text-rose-500" /> 此模式强制使用 T8Star (New) kling-video-o1
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300">比例</label>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setAspectRatio('16:9')}
                                    className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors ${aspectRatio === '16:9' ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    16:9 横屏
                                </button>
                                <button
                                    onClick={() => setAspectRatio('9:16')}
                                    className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors ${aspectRatio === '9:16' ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    9:16 竖屏
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300">时长</label>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setDuration(5)}
                                    className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors ${duration === 5 ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                >
                                    5 秒
                                </button>
                                {(model === 'sora-2' || model.includes('kling')) && (
                                    <button
                                        onClick={() => setDuration(10)}
                                        className={`w-full py-1.5 rounded-lg text-xs font-bold border transition-colors ${duration === 10 ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                    >
                                        10 秒
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mt-auto pt-6 border-t border-[#262626]">
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim() || (mode === 'img2video' && !firstFrame) || (mode === 'multimodal' && !sourceVideo)}
                        className={`w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                            mode === 'multimodal' 
                            ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-rose-600/20'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                        }`}
                    >
                        {isGenerating ? <Clock className="animate-spin" /> : <Wand2 />}
                        {isGenerating ? "生成中..." : (mode === 'multimodal' ? "开始多模态编辑" : "开始生成视频")}
                    </button>
                </div>
            </div>

            {/* COLUMN 2: Result Preview (Center, Flex-1) */}
            <div className="flex-1 bg-[#0a0a0a] flex flex-col relative overflow-hidden">
                <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#0a0a0a] relative overflow-hidden">
                    
                    {currentVideo ? (
                        <div className="relative shadow-2xl rounded-xl overflow-hidden border border-[#333] group max-h-full max-w-full inline-block bg-black animate-fade-in-up">
                             <video 
                                ref={videoRef}
                                src={currentVideo.url} 
                                className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain block" 
                                controls={false}
                                loop
                                onClick={togglePlay}
                             />
                             {!isPlaying && (
                                 <div 
                                    className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer group-hover:bg-black/40 transition-colors"
                                    onClick={togglePlay}
                                 >
                                     <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/50 text-white shadow-2xl hover:scale-110 transition-transform">
                                         <Play size={40} fill="currentColor" className="ml-1" />
                                     </div>
                                 </div>
                             )}
                             
                             <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onEnterEditor) {
                                            onEnterEditor(currentVideo.url, currentVideo.prompt);
                                        }
                                    }}
                                    className="p-2.5 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-sm transition-transform hover:scale-105"
                                    title="编辑视频"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <a 
                                    href={currentVideo.url} 
                                    download={`video-${currentVideo.id}.mp4`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-sm transition-transform hover:scale-105"
                                    title="Download"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={20} />
                                </a>
                             </div>

                             {/* Info Overlay at bottom */}
                             <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <p className="text-white text-sm font-medium line-clamp-1">{currentVideo.prompt}</p>
                                <p className="text-xs text-gray-400 font-mono mt-1">{currentVideo.model} • {new Date(currentVideo.timestamp).toLocaleTimeString()}</p>
                             </div>
                        </div>
                    ) : isGenerating ? (
                        <div className="flex flex-col items-center gap-6">
                            <FancyLoader type="video" size="lg" text={status || "AI IS DREAMING..."} />
                            <div className="w-80 space-y-2">
                                <div className="h-1.5 bg-[#333] rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs font-mono text-gray-500">
                                    <span>{status}</span>
                                    <span>{progress}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-600 flex flex-col items-center gap-4 opacity-50">
                            <div className="w-32 h-32 bg-[#111] rounded-3xl flex items-center justify-center border border-[#222]">
                                <Film size={64} className="opacity-20" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-500">预览区域</h3>
                                <p className="text-sm mt-1">配置左侧参数并点击生成</p>
                            </div>
                        </div>
                    )}
                    
                    {errorMsg && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-8 py-4 rounded-xl border border-red-500/50 backdrop-blur-md flex items-center gap-3 shadow-2xl z-50 whitespace-nowrap">
                            <div className="bg-red-500/20 p-1 rounded-full"><Trash2 size={20} className="text-red-400"/></div>
                            <div>
                                <h4 className="font-bold text-sm">生成失败</h4>
                                <p className="text-xs text-red-200">{errorMsg}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUMN 3: History Sidebar (Right) */}
            <div className="w-full md:w-80 bg-[#0d0d0d] border-t md:border-t-0 md:border-l border-[#262626] flex flex-col shrink-0 md:h-full z-10">
                <div className="h-14 border-b border-[#262626] flex items-center px-6 gap-2 bg-[#141414]">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm font-bold text-white">历史记录 ({history.length})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                             <Video size={32} className="opacity-20" />
                             <span className="text-xs">暂无历史记录</span>
                        </div>
                    ) : (
                        history.map(vid => (
                            <div 
                                key={vid.id}
                                onClick={() => selectHistoryItem(vid)}
                                className={`group bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer border hover:border-rose-500/50 transition-all relative ${currentVideo?.id === vid.id ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#333]'}`}
                            >
                                <div className="aspect-video relative bg-black">
                                    <video src={vid.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <Play size={24} className="text-white drop-shadow-lg" fill="currentColor" />
                                    </div>
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 text-[10px] text-white rounded font-mono backdrop-blur-sm">
                                        {vid.model === 'sora-2' ? 'SORA' : 'VEO'}
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-2">{vid.prompt}</p>
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                        <span>{new Date(vid.timestamp).toLocaleTimeString()}</span>
                                        <button className="hover:text-white transition-colors"><Download size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default VideoGenView;
