
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ImageIcon, Wand2, RefreshCw, Upload, Download, Copy, Trash2, Zap, Settings2, Sparkles, Layers, Edit3, Eraser, Check, X, Type as TypeIcon, MousePointer2, Move, Crop, Maximize, Scissors, Box, MoreHorizontal, Clock, Image, Users } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import FancyLoader from './FancyLoader';

interface ImageGenViewProps {
  onBack: () => void;
}

const STYLE_CATEGORIES: Record<string, string[]> = {
  '画风类型': ['写实风格', 'Q版风格', 'SD风格', '像素风格', '超现实主义风格', '摄影写实', '史诗级电影', '好莱坞大片', '胶片电影风', '黏土动画风', '二次元插画风'],
  '中国动漫': ['新风都市', '水墨画风格', '国潮风格', '古风仙侠', '皮影戏风格', '木偶戏风格', '武侠风格', '修仙风格', '年画风格', '京剧脸谱风格', '玄幻风格', '神话风格'],
  '美国动漫': ['迪士尼经典风格', '皮克斯3D风格', '漫威动画风格'],
  '欧洲动漫': ['俄罗斯动画风格', '德国动画风格', '西班牙动画风格', '意大利动画风格', '法国动画风格', '比利时漫画风格', '匈牙利动画风格', '荷兰动画风格', '瑞士动画风格', '希腊动画风格'],
  '日本动漫': ['海贼王风格', '宫崎骏风格', '火影忍者', '新海诚风格', '战国武将风格', '忍者风格', '青年漫画风格', '少女漫画风格', '儿童向风格', '机甲风格', '校园风格', '推理悬疑风格', '恐怖惊悚风格', '神话传说风格', '禅意风格']
};

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    model: string;
    timestamp: number;
}

type EditTool = 'brush' | 'element' | 'text' | 'expand' | 'zoom' | 'removebg' | 'mockup' | 'background' | 'dress' | 'crop';

const ImageGenView: React.FC<ImageGenViewProps> = ({ onBack }) => {
  // Config State
  const [mode, setMode] = useState<'text2img' | 'img2img'>('text2img');
  const [prompt, setPrompt] = useState('');
  // Initialize model from global config to respect provider settings (e.g. dall-e-3 for Yunwu)
  const [model, setModel] = useState(GeminiService.getApiConfig().imageModel || 'nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [generateCount, setGenerateCount] = useState(1);
  const [refImage, setRefImage] = useState<string | null>(null);
  
  // App State
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [activeTool, setActiveTool] = useState<EditTool>('brush');
  const [editPrompt, setEditPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const [editCanvasRef, setEditCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync model with config when view loads
  useEffect(() => {
      const config = GeminiService.getApiConfig();
      if (config.imageModel) {
          setModel(config.imageModel);
      }
  }, []);

  const handleGenerate = async () => {
      if (!prompt.trim()) return;
      setIsGenerating(true);
      setErrorMsg(null);
      
      try {
          const finalPrompt = selectedStyle ? `${selectedStyle}, ${prompt}` : prompt;
          
          // Generate N images
          const promises = Array.from({ length: generateCount }).map(() => 
              GeminiService.generateImage(finalPrompt, aspectRatio, model, 1, refImage || undefined)
          );

          const results = await Promise.all(promises);
          
          const newImages: GeneratedImage[] = results.map(url => ({
              id: Date.now().toString() + Math.random(),
              url,
              prompt: finalPrompt,
              model,
              timestamp: Date.now()
          }));
          
          if (newImages.length > 0) {
              setCurrentImage(newImages[0]);
              setHistory(prev => [...newImages, ...prev]);
          }

      } catch (e: any) {
          setErrorMsg(e.message || "生成失败");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleOptimizePrompt = async () => {
      if (!prompt.trim()) return;
      setIsOptimizing(true);
      try {
          const optimized = await GeminiService.optimizeImagePrompt(prompt);
          setPrompt(optimized);
      } catch (e) {
          console.error(e);
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleUploadRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setRefImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const selectHistoryItem = (item: GeneratedImage) => {
      setCurrentImage(item);
      setIsEditing(false); // Reset edit mode on switch
      setEditPrompt('');
  };

  // --- EDITOR LOGIC ---
  
  const startEditing = () => {
      setIsEditing(true);
      setActiveTool('brush');
      setEditPrompt('');
      // Wait for DOM render of canvas
      setTimeout(() => initCanvas(), 100);
  };

  const initCanvas = () => {
      const canvas = document.getElementById('paint-canvas') as HTMLCanvasElement;
      if (!canvas || !canvasContainerRef.current) return;
      
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // White mask for visual
          ctx.lineWidth = brushSize;
      }
      setEditCanvasRef(canvas);
  };

  const handleDraw = (e: React.MouseEvent) => {
      if (!isEditing || !editCanvasRef || e.buttons !== 1) return;
      // 只在需要绘图的工具中执行绘图操作
      if (['expand', 'zoom', 'removebg', 'mockup', 'background', 'dress', 'crop'].includes(activeTool)) return;

      const ctx = editCanvasRef.getContext('2d');
      if (!ctx) return;

      const rect = editCanvasRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineWidth = brushSize;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; 
      ctx.globalCompositeOperation = 'source-over'; 

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
  };

  const startDraw = (e: React.MouseEvent) => {
      if (!editCanvasRef) return;
      // 只在需要绘图的工具中执行绘图操作
      if (['expand', 'zoom', 'removebg', 'mockup', 'background', 'dress', 'crop'].includes(activeTool)) return;

      const ctx = editCanvasRef.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      const rect = editCanvasRef.getBoundingClientRect();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSubmitEdit = async () => {
      if (!currentImage || !editCanvasRef) return;
      
      // 1. Get Mask Data URL if needed
      let maskDataUrl: string | undefined;
      
      // 只在需要掩码的工具中生成掩码
      if (['brush', 'element', 'text', 'expand'].includes(activeTool)) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = editCanvasRef.width;
          tempCanvas.height = editCanvasRef.height;
          const tCtx = tempCanvas.getContext('2d');
          if (!tCtx) return;

          // Fill black (unmasked)
          tCtx.fillStyle = 'black';
          tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          // Draw the strokes from edit canvas
          tCtx.globalCompositeOperation = 'source-over';
          tCtx.drawImage(editCanvasRef, 0, 0);
          
          // Boost to white
          tCtx.globalCompositeOperation = 'lighter';
          tCtx.drawImage(editCanvasRef, 0, 0);
          
          maskDataUrl = tempCanvas.toDataURL('image/png');
      }
      
      setIsGenerating(true);
      setIsEditing(false);

      try {
          // Construct prompt based on tool + input
          let finalEditPrompt = editPrompt.trim();
          
          if (!finalEditPrompt) {
              // Fallback logic based on active tool
              switch (activeTool) {
                  case 'brush':
                      finalEditPrompt = "移除指定区域的内容，保持背景一致";
                      break;
                  case 'element':
                      finalEditPrompt = "修改指定元素";
                      break;
                  case 'text':
                      finalEditPrompt = "在指定区域添加或修改文字";
                      break;
                  case 'expand':
                      finalEditPrompt = "扩展图像，保持风格一致";
                      break;
                  case 'background':
                      finalEditPrompt = "更换背景，保持主体不变";
                      break;
                  case 'dress':
                      finalEditPrompt = "更换服装，保持主体不变";
                      break;
                  case 'mockup':
                      finalEditPrompt = "生成产品展示mockup";
                      break;
                  case 'crop':
                      finalEditPrompt = "裁剪图像";
                      break;
                  default:
                      finalEditPrompt = currentImage.prompt;
              }
          }
          
          // 确保使用nano-banana-pro模型进行编辑
          const editingModel = 'nano-banana-pro';
          console.log("Submitting Edit:", { prompt: finalEditPrompt, model: editingModel, tool: activeTool });

          // Call Edit API with nano-banana-pro model
          const newUrl = await GeminiService.generateImage(
              finalEditPrompt, 
              aspectRatio, 
              editingModel, 
              1, 
              currentImage.url, // Init image is current image
              maskDataUrl // Mask (if needed)
          );
          
          const newImage: GeneratedImage = {
              id: Date.now().toString(),
              url: newUrl,
              prompt: finalEditPrompt,
              model: editingModel,
              timestamp: Date.now()
          };
          setCurrentImage(newImage);
          setHistory(prev => [newImage, ...prev]);
      } catch (e: any) {
          setErrorMsg(e.message || "编辑失败");
      } finally {
          setIsGenerating(false);
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
                    <ImageIcon className="text-emerald-500" /> <span className="hidden sm:inline">神笔马良 · </span>图片生成
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
                        onClick={() => setMode('text2img')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'text2img' ? 'bg-[#333] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        文生图 (T2I)
                    </button>
                    <button 
                         onClick={() => setMode('img2img')}
                         className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'img2img' ? 'bg-[#333] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        图生图 (I2I)
                    </button>
                </div>

                {/* Prompt Section */}
                <div className="mb-6 space-y-2 relative">
                    <label className="text-sm font-bold text-gray-300 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Upload size={14} className="text-emerald-500" />
                            图片创意 (Prompt)
                        </div>
                        <button 
                            onClick={handleOptimizePrompt}
                            disabled={isOptimizing || !prompt}
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                            title="AI Optimize Prompt"
                        >
                            <Wand2 size={12} className={isOptimizing ? 'animate-spin' : ''} /> 优化
                        </button>
                    </label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 md:h-40 bg-[#1a1a1a] border border-[#333] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none placeholder-gray-600 leading-relaxed"
                        placeholder={mode === 'img2img' ? "描述你想如何修改参考图..." : "描述你想要的画面..."}
                    />
                </div>

                {/* Ref Image Upload for I2I */}
                {mode === 'img2img' && (
                    <div className="mb-6 space-y-2">
                        <label className="text-sm font-bold text-gray-300">参考图 (Reference)</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-[#222] transition-all relative overflow-hidden group"
                        >
                            {refImage ? (
                                <>
                                    <img src={refImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                    <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 font-bold text-xs">
                                        点击更换
                                    </div>
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="text-gray-600 mb-2" size={24} />
                                    <span className="text-xs text-gray-500">点击上传参考图</span>
                                </>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadRefImage} />
                        </div>
                    </div>
                )}

                <div className="mb-6 space-y-2">
                    <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500" />
                        生成模型
                    </label>
                    {/* Allow user to type model name freely as requested, but provide quick options */}
                    <div className="relative">
                        <input 
                            type="text" 
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                            placeholder="e.g. dall-e-3, nano-banana-pro"
                        />
                        {/* API Platform Selector with Real-time Display */}
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                            <select 
                                onChange={(e) => {
                                    const provider = e.target.value;
                                    const config = GeminiService.getAllApiConfigs()[provider];
                                    if (config) {
                                        GeminiService.setApiConfig(config);
                                        // 更新模型为当前平台支持的模型
                                        setModel(config.imageModel);
                                    }
                                }}
                                className="text-[10px] bg-[#1a1a1a] text-white border border-[#333] rounded px-2 py-1 focus:outline-none"
                                value={GeminiService.getApiConfig().provider}
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
                    {/* Quick Select Buttons */}
                    <div className="flex gap-2 mt-1 overflow-x-auto no-scrollbar">
                         <button onClick={() => setModel('nano-banana-pro')} className="text-[10px] bg-[#222] px-2 py-1 rounded text-gray-400 hover:text-white whitespace-nowrap">Banana</button>
                         <button onClick={() => setModel('dall-e-3')} className="text-[10px] bg-[#222] px-2 py-1 rounded text-gray-400 hover:text-white whitespace-nowrap">DALL-E 3</button>
                    </div>
                </div>

                {/* Additional Settings Group */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300">生成数量: <span className="text-emerald-500">{generateCount}</span></label>
                        <div className="flex items-center gap-4 bg-[#1a1a1a] p-2 rounded-lg border border-[#333]">
                             <input 
                                type="range" 
                                min="1" 
                                max="4" 
                                value={generateCount} 
                                onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                                className="w-full accent-emerald-500 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer" 
                             />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-300">风格</label>
                        <select 
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none"
                        >
                            <option value="">Default</option>
                            {Object.entries(STYLE_CATEGORIES).map(([category, styles]) => (
                                <optgroup key={category} label={category}>
                                    {styles.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-6 space-y-2">
                    <label className="text-sm font-bold text-gray-300">图片比例</label>
                    <div className="grid grid-cols-5 gap-2">
                        {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${aspectRatio === ratio ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 mt-auto pt-6 border-t border-[#262626]">
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim() || (mode === 'img2img' && !refImage)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40"
                    >
                        {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                        {isGenerating ? "生成中..." : `生成图片 (x${generateCount})`}
                    </button>
                </div>
            </div>

            {/* COLUMN 2: Result Preview (Center, Flex-1) */}
            <div className="flex-1 bg-[#0a0a0a] flex flex-col relative overflow-hidden">
                
                {/* Main Viewport */}
                <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-[#0a0a0a] relative overflow-y-auto" ref={canvasContainerRef}>
                    
                    {currentImage ? (
                        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-[#333] group max-h-full max-w-full inline-block animate-fade-in-up">
                             <img 
                                src={currentImage.url} 
                                alt="Generated" 
                                className="max-w-full max-h-full object-contain block" 
                                style={{ opacity: isEditing ? 0.9 : 1, filter: isEditing ? 'grayscale(10%)' : 'none', transition: 'all 0.3s' }}
                             />
                             
                             {/* EDITOR CANVAS */}
                             {isEditing && (
                                 <canvas
                                    id="paint-canvas"
                                    className={`absolute inset-0 touch-none ${activeTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
                                    onMouseDown={startDraw}
                                    onMouseMove={handleDraw}
                                    onMouseUp={() => {}}
                                    onMouseLeave={() => {}}
                                 />
                             )}

                             {/* Hover Actions (Disable when editing) */}
                             {!isEditing && (
                                <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <a 
                                        href={currentImage.url} 
                                        download={`generated-${currentImage.id}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 bg-black/60 text-white rounded-lg hover:bg-black/80 backdrop-blur-sm hover:scale-105 transition-transform"
                                        title="Download"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Download size={20} />
                                    </a>
                                    <button 
                                        onClick={startEditing}
                                        className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 backdrop-blur-sm shadow-lg hover:scale-105 transition-transform"
                                        title="Edit Image"
                                    >
                                        <Edit3 size={20} />
                                    </button>
                                </div>
                             )}
                        </div>
                    ) : isGenerating ? (
                        <div className="flex flex-col items-center gap-4">
                            <FancyLoader type="image" size="lg" text="GENERATING..." />
                        </div>
                    ) : (
                        <div className="text-center text-gray-600 flex flex-col items-center">
                            <div className="w-32 h-32 bg-[#111] rounded-3xl flex items-center justify-center mb-6 border border-[#222]">
                                <Image size={64} className="opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-500">画布区域</h3>
                            <p className="text-sm mt-2">在左侧配置参数并点击生成</p>
                        </div>
                    )}

                    {/* PHOTOSHOP-LIKE TOOLBAR OVERLAY (Desktop only or horizontal scroll on mobile) */}
                    {isEditing && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white rounded-lg px-2 py-1.5 flex items-center gap-1 shadow-2xl animate-fade-in-up z-20 text-gray-800 border border-gray-200 overflow-x-auto max-w-[90%] no-scrollbar">
                             <button 
                                onClick={() => setActiveTool('zoom')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'zoom' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Maximize size={14} /> 放大
                             </button>
                             <button 
                                onClick={async () => {
                                    if (!currentImage) return;
                                    setIsGenerating(true);
                                    setIsEditing(false);
                                    try {
                                        // 使用nano-banana-pro模型移除背景
                                        const newUrl = await GeminiService.generateImage(
                                            "移除背景，保持主体不变",
                                            aspectRatio,
                                            'nano-banana-pro',
                                            1,
                                            currentImage.url
                                        );
                                        const newImage = {
                                            id: Date.now().toString(),
                                            url: newUrl,
                                            prompt: "移除背景",
                                            model: 'nano-banana-pro',
                                            timestamp: Date.now()
                                        };
                                        setCurrentImage(newImage);
                                        setHistory(prev => [newImage, ...prev]);
                                    } catch (e: any) {
                                        setErrorMsg(e.message || "移除背景失败");
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 whitespace-nowrap"
                             >
                                <Scissors size={14} /> 移除背景
                             </button>
                             <button 
                                onClick={() => {
                                    setActiveTool('background');
                                    setEditPrompt('描述你想要的背景...');
                                }}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'background' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Layers size={14} /> 一键换背景
                             </button>
                             <button 
                                onClick={() => setActiveTool('brush')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'brush' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Eraser size={14} /> 擦除
                             </button>
                             <button 
                                onClick={() => setActiveTool('text')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'text' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                 <TypeIcon size={14} /> 编辑文字
                             </button>
                             <button 
                                onClick={() => setActiveTool('element')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'element' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                 <Layers size={14} /> 编辑元素
                             </button>
                             <button 
                                onClick={() => setActiveTool('expand')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'expand' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                 <Crop size={14} /> 扩展
                             </button>
                             <button 
                                onClick={() => setActiveTool('crop')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'crop' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Crop size={14} /> 裁剪
                             </button>
                             <button 
                                onClick={() => {
                                    setActiveTool('dress');
                                    setEditPrompt('描述你想要的服装...');
                                }}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'dress' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Users size={14} /> 换装
                             </button>
                             <button 
                                onClick={() => {
                                    setActiveTool('mockup');
                                    setEditPrompt('生成产品展示mockup...');
                                }}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap ${activeTool === 'mockup' ? 'bg-blue-50 text-blue-600 font-bold' : 'hover:bg-gray-100 text-gray-600'}`}
                             >
                                <Box size={14} /> Mockup
                             </button>
                             <div className="w-px h-4 bg-gray-300 mx-1"></div>
                             <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium text-blue-600 font-bold whitespace-nowrap">
                                <Sparkles size={14} /> New
                             </button>
                             <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 whitespace-nowrap">
                                <MoreHorizontal size={14} /> 扩展
                             </button>
                             <button className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 whitespace-nowrap">
                                <Download size={14} /> 下载
                             </button>
                              
                             <button 
                                onClick={() => setIsEditing(false)} 
                                className="ml-2 p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md"
                             >
                                 <X size={16} />
                             </button>
                        </div>
                    )}

                    {/* PROMPT OVERLAY FOR EDITING (Responsive Width) */}
                    {isEditing && (
                        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] rounded-2xl p-2 w-[90%] md:w-[550px] shadow-2xl animate-fade-in-up flex items-center gap-3 z-30">
                            <div className="p-2 bg-[#333] rounded-xl text-gray-300 shrink-0">
                                {activeTool === 'text' ? <TypeIcon size={18}/> : 
                                 activeTool === 'element' ? <Layers size={18}/> :
                                 activeTool === 'expand' ? <Crop size={18}/> :
                                 <Eraser size={18}/>
                                }
                            </div>
                            
                            <div className="flex-1 flex flex-col min-w-0">
                                <input 
                                    type="text"
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder="输入修改描述..."
                                    className="w-full bg-transparent border-none outline-none text-white text-sm placeholder-gray-500"
                                />
                            </div>
                            
                            <button 
                                onClick={handleSubmitEdit} 
                                className="px-3 md:px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-gray-200 flex items-center gap-2 transition-colors shrink-0"
                            >
                                <Sparkles size={14} className="text-purple-600" />
                                <span className="hidden sm:inline">生成填充</span>
                            </button>
                        </div>
                    )}
                    
                    {errorMsg && (
                        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-6 py-3 rounded-lg border border-red-500 backdrop-blur-md flex items-center gap-2 shadow-xl z-50 whitespace-nowrap">
                            <Trash2 size={16} /> {errorMsg}
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
                             <ImageIcon size={32} className="opacity-20" />
                             <span className="text-xs">暂无历史记录</span>
                        </div>
                    ) : (
                        history.map(img => (
                            <div 
                                key={img.id}
                                onClick={() => selectHistoryItem(img)}
                                className={`group bg-[#1a1a1a] rounded-xl overflow-hidden cursor-pointer border hover:border-emerald-500/50 transition-all relative ${currentImage?.id === img.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-[#333]'}`}
                            >
                                <div className="aspect-video relative bg-black">
                                    <img src={img.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="p-3">
                                    <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-2">{img.prompt}</p>
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                        <span>{new Date(img.timestamp).toLocaleTimeString()}</span>
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

export default ImageGenView;
