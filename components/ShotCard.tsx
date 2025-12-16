
import React, { useRef, useState, useEffect } from 'react';
import { Shot } from '../types';
import { Camera, Video, Mic, Image as ImageIcon, Clock, RefreshCw, Copy, Film, Music, Upload, Trash2, ArrowRight, AlertTriangle, CheckCheck, Edit2, ChevronDown } from 'lucide-react';
import FancyLoader from './FancyLoader';

interface ShotCardProps {
  shot: Shot;
  onRegenerateImage: (shotId: number, prompt: string) => void;
  onGenerateVideo: (shotId: number) => void;
  onImageClick: (imageUrl: string) => void;
  onUpdateShot: (shotId: number, updates: Partial<Shot>) => void;
}

const CAMERA_MOVEMENTS = [
    "Push In (推镜头)",
    "Pull Out (拉镜头)",
    "Pan Left (左摇)",
    "Pan Right (右摇)",
    "Tilt Up (上摇)",
    "Tilt Down (下摇)",
    "Zoom In (变焦推进)",
    "Zoom Out (变焦拉远)",
    "Tracking (跟拍)",
    "Handheld (手持)",
    "Static (固定)",
    "Arc (环绕)",
    "Crane Up (升降上升)",
    "Crane Down (升降下降)",
    "Drone (无人机)"
];

const ShotCard: React.FC<ShotCardProps> = ({ shot, onRegenerateImage, onGenerateVideo, onImageClick, onUpdateShot }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingMovement, setIsEditingMovement] = useState(false);
  const movementInputRef = useRef<HTMLInputElement>(null);
  
  // 编辑状态管理
  const [editingField, setEditingField] = useState<{type: string, lang: string} | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditingMovement && movementInputRef.current && !movementInputRef.current.parentElement?.contains(event.target as Node)) {
        setIsEditingMovement(false);
      }
      // 关闭编辑模式
      if (editingField && editInputRef.current && !editInputRef.current.parentElement?.contains(event.target as Node)) {
        handleSaveEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingMovement, editingField]);
  
  // 聚焦到编辑输入框
  useEffect(() => {
    if (editingField && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingField]);
  
  // 开始编辑
  const handleStartEdit = (type: string, lang: string, value: string) => {
    setEditingField({ type, lang });
    setEditingValue(value);
  };
  
  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingField) return;
    
    const { type, lang } = editingField;
    const fieldName = `${type}${lang === 'zh' ? 'Zh' : 'En'}` as keyof Shot;
    
    onUpdateShot(shot.id, { [fieldName]: editingValue });
    setEditingField(null);
    setEditingValue('');
  };
  
  // 处理编辑输入变化
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditingValue(e.target.value);
  };
  
  // 处理回车键保存
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyText = (e: React.MouseEvent, text: string, fieldId: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (shot.imageUrl) {
        onImageClick(shot.imageUrl);
    }
  };

  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    // Prefer English prompt if available for better generation, otherwise Chinese
    onRegenerateImage(shot.id, shot.t2iPromptEn || shot.t2iPrompt);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateVideo(shot.id);
  };

  const handleLastFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateShot(shot.id, { lastFrameImageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLastFrame = (e: React.MouseEvent) => {
      e.stopPropagation();
      onUpdateShot(shot.id, { lastFrameImageUrl: undefined });
  };

  const handleUpdateMovement = (newVal: string) => {
      onUpdateShot(shot.id, { cameraMovement: newVal });
      setIsEditingMovement(false);
  };

  // Helper to parse "English (Chinese)" format roughly if needed, otherwise just display
  const formatBilingual = (text?: string) => {
      if (!text) return { en: '-', zh: '' };
      
      // Assuming text is like "Close-up (特写)"
      const match = text.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
          return { en: match[1], zh: match[2] };
      }
      return { en: text, zh: '' };
  };

  const shotSize = formatBilingual(shot.shotSize);
  const movement = formatBilingual(shot.cameraMovement);

  return (
    // Responsive Layout: Flex Col on mobile, Row on tablet/desktop
    <div className={`bg-[#1a1a1a] border rounded-xl flex flex-col md:flex-row shadow-lg mb-8 transition-colors duration-300 group ${shot.error && !shot.videoUrl ? 'border-red-900/50' : 'border-[#333] hover:border-cinema-accent/50'}`}>
      
      {/* Visual Section: Full width on mobile, Fixed width on desktop */}
      <div 
        className={`w-full md:w-96 relative aspect-video bg-black flex-shrink-0 border-b md:border-b-0 md:border-r border-[#333] rounded-t-xl md:rounded-l-xl md:rounded-r-none overflow-hidden ${shot.imageUrl ? 'cursor-zoom-in' : ''}`}
        onClick={handleImageClick}
      >
        {shot.videoUrl ? (
           // Video Player
           <video 
             src={shot.videoUrl} 
             controls 
             className="w-full h-full object-cover" 
             onClick={(e) => e.stopPropagation()} 
           />
        ) : shot.imageUrl ? (
          // Image View
          <img 
            src={shot.imageUrl} 
            alt={`Shot ${shot.shotNumber}`} 
            className="w-full h-full object-cover"
          />
        ) : shot.isGeneratingImage ? (
          // Image Loading with Lottie
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f0f]">
             <FancyLoader type="image" size="sm" text="RENDERING..." />
          </div>
        ) : shot.error ? (
          // Error State
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/10 text-red-500 p-4 text-center">
             <AlertTriangle className="w-8 h-8 mb-2" />
             <span className="text-xs font-bold mb-2">IMAGE GENERATION FAILED</span>
             <p className="text-[10px] opacity-70 mb-3">{shot.error}</p>
             <button 
                onClick={handleRegenerateClick}
                className="bg-red-800 hover:bg-red-700 text-white px-3 py-1 rounded text-xs flex items-center gap-2"
             >
                <RefreshCw size={12} /> Retry
             </button>
          </div>
        ) : shot.isGeneratingVideo ? (
           // Video Loading with Lottie
           <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f0f] relative overflow-hidden">
             {/* Progress Background */}
             <div className="absolute inset-0 bg-purple-900/10 z-0"></div>
             
             <div className="z-10 flex flex-col items-center">
                 <FancyLoader type="video" size="sm" />
                 <span className="text-xs tracking-widest uppercase font-mono mt-2 mb-1">GENERATING VIDEO...</span>
                 {shot.generationProgress !== undefined && (
                     <span className="text-xs font-bold font-mono text-purple-400">{shot.generationProgress}%</span>
                 )}
             </div>
           </div>
        ) : (
          // Empty State
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-[#0f0f0f]">
             <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
             <span className="text-xs font-mono">NO SIGNAL</span>
          </div>
        )}
        
        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white border border-white/10 shadow-sm font-mono z-10 pointer-events-none">
          SHOT {shot.shotNumber.toString().padStart(2, '0')}
        </div>
        
        {/* Last Frame Preview (Mini) */}
        {shot.lastFrameImageUrl && !shot.videoUrl && (
            <div 
                className="absolute bottom-3 right-3 w-16 h-9 rounded border border-white/30 overflow-hidden shadow-lg z-20 group/lastframe bg-black cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => { e.stopPropagation(); onImageClick(shot.lastFrameImageUrl!); }}
                title="Last Frame (尾帧)"
            >
                <img src={shot.lastFrameImageUrl} alt="Last" className="w-full h-full object-cover opacity-80" />
                <button 
                    onClick={handleRemoveLastFrame}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/lastframe:opacity-100 transition-opacity"
                >
                    <Trash2 size={10} className="text-red-400" />
                </button>
            </div>
        )}

        {/* Hover Actions (Only show if not loading and not error state) */}
        {!shot.isGeneratingImage && !shot.isGeneratingVideo && !shot.error && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-none rounded-t-xl md:rounded-l-xl md:rounded-r-none">
                <div className="pointer-events-auto flex flex-col gap-2">
                    <div className="flex gap-3">
                        <button 
                            onClick={handleRegenerateClick}
                            className="bg-[#262626] border border-[#444] text-white px-3 py-2 rounded-full font-bold text-xs hover:bg-[#333] flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg"
                        >
                            <RefreshCw size={14} /> 图片
                        </button>
                        
                        {shot.imageUrl && (
                            <button 
                                onClick={handleVideoClick}
                                className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold text-xs hover:bg-purple-500 flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg border border-purple-400/50"
                            >
                                <Film size={14} /> 生成视频
                            </button>
                        )}
                    </div>
                    
                    {/* Upload Last Frame Action */}
                    <div className="flex justify-center">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleLastFrameUpload} 
                        />
                        <button 
                             onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                             className="bg-black/50 backdrop-blur-md border border-white/20 text-gray-300 px-3 py-1.5 rounded-full text-[10px] hover:bg-black/70 flex items-center gap-2 hover:text-white transition-colors"
                        >
                            <Upload size={10} /> 
                            {shot.lastFrameImageUrl ? "更换尾帧" : "上传尾帧 (Sora)"}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-1 flex flex-col min-w-0 md:rounded-r-xl rounded-b-xl overflow-visible">
        
        {/* Shot Specs Header - BILINGUAL UNDER ICON */}
        <div className="p-4 border-b border-[#262626] bg-[#1a1a1a] flex flex-wrap gap-4 justify-between md:justify-start md:rounded-tr-xl relative z-30">
           <SpecItem 
                icon={<Camera size={16} />} 
                labelZh="景别" 
                labelEn="Shot Size" 
                valueZh={shotSize.zh} 
                valueEn={shotSize.en}
                colorClass="text-blue-400" 
           />
           
           {/* Editable Movement Spec */}
           <div className="relative group/movement">
              <div 
                onClick={() => setIsEditingMovement(!isEditingMovement)} 
                className="cursor-pointer hover:bg-[#252525] rounded-md transition-colors relative"
              >
                  <SpecItem 
                        icon={<Video size={16} />} 
                        labelZh="运镜" 
                        labelEn="Movement" 
                        valueZh={movement.zh} 
                        valueEn={movement.en}
                        colorClass="text-purple-400" 
                   />
                   <div className="absolute -top-1 -right-1 opacity-0 group-hover/movement:opacity-100 transition-opacity bg-[#333] rounded-full p-0.5 border border-[#444]">
                        <Edit2 size={8} className="text-gray-400" />
                   </div>
              </div>

              {/* Dropdown Popover */}
              {isEditingMovement && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl p-2 flex flex-col gap-2 animate-fade-in ring-1 ring-purple-900/50 z-50">
                      <input 
                          ref={movementInputRef}
                          defaultValue={shot.cameraMovement}
                          autoFocus
                          className="w-full bg-black border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-purple-500 outline-none placeholder-gray-600"
                          placeholder="Type custom movement..."
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  handleUpdateMovement(e.currentTarget.value);
                              }
                          }}
                      />
                      <div className="h-px bg-[#262626]"></div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                          {CAMERA_MOVEMENTS.map(m => (
                              <button 
                                  key={m}
                                  onClick={() => handleUpdateMovement(m)}
                                  className={`w-full text-left px-2 py-1.5 hover:bg-[#262626] rounded text-xs transition-colors flex items-center justify-between group/item ${shot.cameraMovement === m ? 'text-purple-400 font-bold bg-[#262626]' : 'text-gray-400'}`}
                              >
                                  <span>{m}</span>
                                  {shot.cameraMovement === m && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
           </div>

           <SpecItem 
                icon={<Clock size={16} />} 
                labelZh="时长" 
                labelEn="Duration" 
                valueZh="" 
                valueEn={shot.duration}
                colorClass="text-green-400" 
           />
           <SpecItem 
                icon={<Music size={16} />} 
                labelZh="音效" 
                labelEn="Sound/BGM" 
                valueZh={shot.audioPromptZh} 
                valueEn={shot.audioPromptEn}
                colorClass="text-pink-400"
                fullWidth={true}
           />
        </div>

        <div className="p-5 space-y-5">
             {/* Content / Script with Click-to-Copy */}
             <div>
                <div 
                    className="relative group/zh cursor-pointer rounded -ml-2 pl-2 p-1 transition-colors hover:bg-[#222]"
                    onClick={(e) => handleCopyText(e, shot.contentZh, `zh-${shot.id}`)}
                    title="Click to copy"
                >
                    <h3 className="text-lg font-bold text-gray-100 leading-snug mb-1">
                      {shot.contentZh}
                    </h3>
                    {copiedField === `zh-${shot.id}` && (
                        <span className="absolute right-2 top-2 bg-green-900/80 text-green-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in shadow-lg">
                            <CheckCheck size={10} /> Copied!
                        </span>
                    )}
                </div>

                <div 
                    className="relative group/en cursor-pointer rounded -ml-2 pl-2 p-1 transition-colors hover:bg-[#222]"
                    onClick={(e) => handleCopyText(e, shot.contentEn, `en-${shot.id}`)}
                    title="Click to copy"
                >
                    <p className="text-sm text-gray-500 font-light italic font-serif">
                      {shot.contentEn}
                    </p>
                    {copiedField === `en-${shot.id}` && (
                        <span className="absolute right-2 top-2 bg-green-900/80 text-green-300 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in shadow-lg">
                            <CheckCheck size={10} /> Copied!
                        </span>
                    )}
                </div>
             </div>
             
             {/* Visual Description */}
             <div className="pl-3 border-l-2 border-[#333]">
                <p className="text-sm text-gray-300 mb-1">{shot.visualDescriptionZh}</p>
                <p className="text-xs text-gray-600">{shot.visualDescriptionEn}</p>
             </div>

             {/* Narration - BILINGUAL CONTRAST */}
             <div className="bg-[#111] p-3 rounded-lg border border-[#262626] relative">
                 <div className="absolute left-0 top-3 w-1 h-8 bg-cinema-accent rounded-r"></div>
                 <div className="flex items-center gap-2 text-cinema-accent/80 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Mic className="w-3 h-3" /> 对白 / NARRATION
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                     {/* 中文旁白 - 可编辑 */}
                     <div className="group/zh relative">
                         {editingField?.type === 'narration' && editingField?.lang === 'zh' ? (
                             <div className="bg-[#222] rounded p-2 border border-cinema-accent/50">
                                 <textarea
                                     ref={editInputRef}
                                     value={editingValue}
                                     onChange={handleEditChange}
                                     onKeyDown={handleEditKeyDown}
                                     onBlur={handleSaveEdit}
                                     className="w-full bg-transparent border-none text-gray-200 text-sm font-medium resize-none outline-none min-h-[40px]"
                                     placeholder="输入中文旁白..."
                                 />
                             </div>
                         ) : (
                             <p 
                                 className="text-gray-200 text-sm font-medium border-b border-[#222] pb-2 cursor-pointer hover:bg-[#222]/30 p-2 -m-2 rounded transition-colors"
                                 onClick={() => handleStartEdit('narration', 'zh', shot.narrationZh || '')}
                             >
                                {shot.narrationZh || "..."}
                             </p>
                         )}
                     </div>
                     
                     {/* 英文旁白 - 可编辑 */}
                     <div className="group/en relative">
                         {editingField?.type === 'narration' && editingField?.lang === 'en' ? (
                             <div className="bg-[#222] rounded p-2 border border-cinema-accent/50">
                                 <textarea
                                     ref={editInputRef}
                                     value={editingValue}
                                     onChange={handleEditChange}
                                     onKeyDown={handleEditKeyDown}
                                     onBlur={handleSaveEdit}
                                     className="w-full bg-transparent border-none text-gray-500 text-xs italic resize-none outline-none min-h-[40px]"
                                     placeholder="Enter English narration..."
                                 />
                             </div>
                         ) : (
                             <p 
                                 className="text-gray-500 text-xs italic cursor-pointer hover:bg-[#222]/30 p-2 -m-2 rounded transition-colors"
                                 onClick={() => handleStartEdit('narration', 'en', shot.narrationEn || '')}
                             >
                                {shot.narrationEn || "..."}
                             </p>
                         )}
                     </div>
                 </div>
             </div>
        </div>

        {/* Technical Prompts Grid - BILINGUAL CONTRAST MODE */}
        <div className="bg-[#111] p-4 text-xs space-y-3 border-t border-[#262626] md:rounded-br-xl">
            
            {/* T2I */}
            <BilingualPromptBlock 
                titleZh="文生图" 
                titleEn="T2I Prompt" 
                color="text-cinema-accent"
                textZh={shot.t2iPrompt}
                textEn={shot.t2iPromptEn}
                onCopy={() => copyToClipboard(`${shot.t2iPrompt}\n${shot.t2iPromptEn}`)}
                shotId={shot.id}
                onUpdateShot={onUpdateShot}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {/* I2V */}
                 <BilingualPromptBlock 
                    titleZh="图生视" 
                    titleEn="I2V Prompt" 
                    color="text-purple-400"
                    textZh={shot.i2vPrompt}
                    textEn={shot.i2vPromptEn}
                    onCopy={() => copyToClipboard(`${shot.i2vPrompt}\n${shot.i2vPromptEn}`)}
                    shotId={shot.id}
                    onUpdateShot={onUpdateShot}
                />
                {/* T2V */}
                 <BilingualPromptBlock 
                    titleZh="文生视" 
                    titleEn="T2V Prompt" 
                    color="text-blue-400"
                    textZh={shot.t2vPrompt}
                    textEn={shot.t2vPromptEn}
                    onCopy={() => copyToClipboard(`${shot.t2vPrompt}\n${shot.t2vPromptEn}`)}
                    shotId={shot.id}
                    onUpdateShot={onUpdateShot}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const SpecItem = ({ icon, labelZh, labelEn, valueZh, valueEn, colorClass, fullWidth }: any) => (
    <div className={`flex items-start gap-3 min-w-[100px] ${fullWidth ? 'w-full md:w-auto' : ''}`}>
        <div className={`mt-0.5 p-1.5 bg-[#252525] rounded-md ${colorClass}`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase leading-none">{labelEn}</span>
                <span className="text-xs text-gray-600 leading-none mt-0.5">{labelZh}</span>
            </div>
            <div className={`text-xs font-bold text-gray-200 truncate`}>
                {valueEn || "-"}
                {valueZh && <span className="block text-[10px] font-normal text-gray-500 truncate">{valueZh}</span>}
            </div>
        </div>
    </div>
);

const BilingualPromptBlock = ({ titleZh, titleEn, color, textZh, textEn, onCopy, shotId, onUpdateShot }: any) => {
    // 确定提示词类型 (t2i, i2v, t2v)
    const promptType = titleEn.toLowerCase().includes('t2i') ? 't2iPrompt' : 
                      titleEn.toLowerCase().includes('i2v') ? 'i2vPrompt' : 't2vPrompt';
    
    return (
        <div className="group/prompt relative">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
                <div className="flex items-baseline gap-2">
                    <span className={`font-mono font-bold text-[10px] uppercase ${color}`}>{titleEn}</span>
                    <span className="text-[10px] text-gray-600 border-l border-[#333] pl-2">{titleZh}</span>
                </div>
                <button onClick={onCopy} className="hover:text-white transition-colors opacity-50 group-hover/prompt:opacity-100"><Copy size={10} /></button>
            </div>
            <div className="bg-black/40 rounded border border-[#333] overflow-hidden flex flex-col md:flex-row">
                {/* 中文提示词 - 可编辑 */}
                <div className="p-2 border-b md:border-b-0 md:border-r border-[#333/50] text-gray-400 font-mono w-full md:w-1/2 cursor-pointer hover:bg-[#222]/30 transition-colors">
                    <span className="text-[8px] text-gray-600 select-none block mb-0.5">CN</span>
                    {editingField?.type === promptType && editingField?.lang === 'zh' ? (
                        <div className="bg-[#222] rounded p-1 border border-cinema-accent/50">
                            <textarea
                                ref={editInputRef}
                                value={editingValue}
                                onChange={handleEditChange}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                className="w-full bg-transparent border-none text-gray-400 text-xs font-mono resize-none outline-none min-h-[30px]"
                                placeholder="输入中文提示词..."
                            />
                        </div>
                    ) : (
                        <div 
                            onClick={() => handleStartEdit(promptType, 'zh', textZh || '')}
                            className="min-h-[30px]"
                        >
                            {textZh || "-"}
                        </div>
                    )}
                </div>
                
                {/* 英文提示词 - 可编辑 */}
                <div className="p-2 text-gray-500 font-mono italic bg-black/20 w-full md:w-1/2 cursor-pointer hover:bg-[#222]/30 transition-colors">
                     <span className="text-[8px] text-gray-700 select-none block mb-0.5">EN</span>
                     {editingField?.type === promptType && editingField?.lang === 'en' ? (
                        <div className="bg-[#222] rounded p-1 border border-cinema-accent/50">
                            <textarea
                                ref={editInputRef}
                                value={editingValue}
                                onChange={handleEditChange}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                className="w-full bg-transparent border-none text-gray-500 text-xs font-mono italic resize-none outline-none min-h-[30px]"
                                placeholder="Enter English prompt..."
                            />
                        </div>
                    ) : (
                        <div 
                            onClick={() => handleStartEdit(promptType, 'en', textEn || '')}
                            className="min-h-[30px]"
                        >
                            {textEn || "-"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShotCard;
