
import React, { useState, useRef } from 'react';
import { Users, Plus, Search, X, Wand2, Upload, Image as ImageIcon, Save, Trash2, Copy, RefreshCw, MessageSquarePlus, CheckCircle, Circle, Check } from 'lucide-react';
import { Character } from '../types';
import * as GeminiService from '../services/geminiService';
import FancyLoader from './FancyLoader';

interface CharacterLibraryProps {
  characters: Character[];
  onUpdateCharacters: (chars: Character[]) => void;
  onSelect: (names: string[]) => void;
  onClose: () => void;
}

const CharacterLibrary: React.FC<CharacterLibraryProps> = ({ characters, onUpdateCharacters, onSelect, onClose }) => {
  const [view, setView] = useState<'grid' | 'create' | 'extract'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  
  // Form State
  const [newChar, setNewChar] = useState<Partial<Character>>({
    name: '',
    gender: '',
    age: '',
    subjectDescription: '',
    visualPrompt: '',
    tags: []
  });
  const [extractionText, setExtractionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newChar.name || !newChar.visualPrompt) {
        alert("请填写角色名称和画面提示词");
        return;
    }
    
    const char: Character = {
      id: Date.now().toString(),
      name: newChar.name || 'Unknown',
      gender: newChar.gender,
      age: newChar.age,
      tags: newChar.tags || [],
      subjectDescription: newChar.subjectDescription || '',
      background: '',
      personality: '',
      coreProps: '',
      visualPrompt: newChar.visualPrompt || '',
      imageUrl: newChar.imageUrl,
    };
    
    onUpdateCharacters([...characters, char]);
    setView('grid');
    setNewChar({ name: '', visualPrompt: '', tags: [] });
  };

  const handleGenerateImage = async () => {
    if (!newChar.visualPrompt && !newChar.subjectDescription) return;
    setIsProcessing(true);
    try {
      const prompt = newChar.visualPrompt || newChar.subjectDescription || "";
      const base64 = await GeminiService.generateImage(`Character Portrait, ${prompt}`, "1:1");
      setNewChar(prev => ({ ...prev, imageUrl: base64 }));
    } catch (e) {
      alert("生成失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewChar(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtract = async () => {
    if (!extractionText.trim()) return;
    setIsProcessing(true);
    try {
      const extracted = await GeminiService.extractCharacters(extractionText);
      onUpdateCharacters([...characters, ...extracted]);
      setView('grid');
      setExtractionText('');
    } catch (e) {
      alert("AI 提取失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("确定删除该角色吗？")) {
        onUpdateCharacters(characters.filter(c => c.id !== id));
        // Remove from selection if it was selected
        const charName = characters.find(c => c.id === id)?.name;
        if (charName) {
           const next = new Set(selectedNames);
           next.delete(charName);
           setSelectedNames(next);
        }
    }
  };
  
  const toggleSelection = (name: string) => {
      const next = new Set(selectedNames);
      if (next.has(name)) {
          next.delete(name);
      } else {
          next.add(name);
      }
      setSelectedNames(next);
  };

  const confirmSelection = () => {
      if (selectedNames.size === 0) return;
      onSelect(Array.from(selectedNames));
  };

  const filteredChars = characters.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-fade-in">
      <div className="bg-[#121212] w-full md:max-w-6xl h-full md:h-[85vh] rounded-none md:rounded-2xl border-none md:border border-[#262626] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="h-16 border-b border-[#262626] flex items-center justify-between px-4 md:px-6 bg-[#171717] shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-cinema-accent text-black p-1.5 rounded">
                    <Users size={20} />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white">角色广场 <span className="text-gray-500 text-xs md:text-sm font-normal ml-2 hidden sm:inline">Sora2 智能体专用</span></h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Sidebar / Navigation (Top on mobile, Left on desktop) */}
            <div className="w-full md:w-64 bg-[#141414] border-b md:border-b-0 md:border-r border-[#262626] p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 no-scrollbar">
                <button 
                    onClick={() => setView('grid')}
                    className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${view === 'grid' ? 'bg-cinema-accent text-black font-bold' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                >
                    <Users size={16} /> 我的角色
                </button>
                 <button 
                    onClick={() => setView('create')}
                    className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${view === 'create' ? 'bg-cinema-accent text-black font-bold' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                >
                    <Plus size={16} /> 创建角色
                </button>
                 <button 
                    onClick={() => setView('extract')}
                    className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${view === 'extract' ? 'bg-cinema-accent text-black font-bold' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                >
                    <Wand2 size={16} /> 文本提取
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0a0a0a] relative">
                
                {/* GRID VIEW */}
                {view === 'grid' && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-8">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="搜索角色名、标签..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#171717] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-cinema-accent focus:outline-none"
                                />
                            </div>
                            <button onClick={() => setView('create')} className="bg-cinema-accent text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors w-full sm:w-auto">
                                + 创建新角色
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
                            {filteredChars.map(char => {
                                const isSelected = selectedNames.has(char.name);
                                return (
                                <div 
                                    key={char.id} 
                                    className={`group bg-[#171717] border rounded-xl overflow-hidden transition-all relative cursor-pointer ${isSelected ? 'border-cinema-accent ring-1 ring-cinema-accent' : 'border-[#262626] hover:border-cinema-accent/50'}`}
                                    onClick={() => toggleSelection(char.name)}
                                >
                                    <div className="aspect-[3/4] bg-black relative">
                                        {/* Checkbox Overlay */}
                                        <div className="absolute top-2 right-2 z-20">
                                            {isSelected ? (
                                                <CheckCircle className="text-cinema-accent fill-black" size={24} />
                                            ) : (
                                                <Circle className="text-white/50 hover:text-white" size={24} />
                                            )}
                                        </div>

                                        {char.imageUrl ? (
                                            <img src={char.imageUrl} alt={char.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isSelected ? 'opacity-80' : ''}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                <Users size={32} />
                                            </div>
                                        )}
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelect([char.name]); // Single immediate select
                                                }}
                                                className="p-3 bg-cinema-accent hover:bg-yellow-400 rounded-full text-black shadow-lg transform hover:scale-110 transition-transform"
                                                title="立即使用此角色"
                                            >
                                                <MessageSquarePlus size={20} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(char.id, e)}
                                                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 md:p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-bold text-sm md:text-lg transition-colors truncate ${isSelected ? 'text-cinema-accent' : 'text-white'}`}>@{char.name}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {char.gender && <span className="text-[10px] bg-[#262626] text-gray-300 px-1.5 py-0.5 rounded border border-[#333]">{char.gender}</span>}
                                            {char.age && <span className="text-[10px] bg-[#262626] text-gray-300 px-1.5 py-0.5 rounded border border-[#333]">{char.age}</span>}
                                            {char.tags?.slice(0, 2).map((t, i) => (
                                                <span key={i} className="text-[10px] bg-cinema-accent/10 text-cinema-accent px-1.5 py-0.5 rounded border border-cinema-accent/20 truncate max-w-[60px]">{t}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <span className="truncate flex-1">{char.visualPrompt}</span>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>

                        {/* Floating Batch Action Bar */}
                        {selectedNames.size > 0 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-cinema-accent rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl shadow-cinema-accent/20 z-50 animate-fade-in-up w-auto whitespace-nowrap">
                                <span className="text-white font-bold text-sm hidden sm:inline">
                                    已选择 <span className="text-cinema-accent text-lg mx-1">{selectedNames.size}</span> 个角色
                                </span>
                                <span className="text-white font-bold text-sm sm:hidden">
                                    <span className="text-cinema-accent text-lg">{selectedNames.size}</span> 个
                                </span>
                                <div className="h-6 w-px bg-gray-700"></div>
                                <button 
                                    onClick={() => setSelectedNames(new Set())}
                                    className="text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    清空
                                </button>
                                <button 
                                    onClick={confirmSelection}
                                    className="bg-cinema-accent text-black px-6 py-1.5 rounded-full font-bold text-sm hover:bg-yellow-400 flex items-center gap-2 transition-colors"
                                >
                                    <Check size={16} /> 确认
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* CREATE VIEW */}
                {view === 'create' && (
                    <div className="max-w-4xl mx-auto">
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-6 md:mb-8">创建新角色</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                            
                            {/* Left: Image */}
                            <div className="col-span-1 space-y-4">
                                <div className="aspect-[3/4] bg-[#171717] border-2 border-dashed border-[#262626] rounded-xl flex flex-col items-center justify-center overflow-hidden relative">
                                    {newChar.imageUrl ? (
                                        <img src={newChar.imageUrl} className="w-full h-full object-cover" />
                                    ) : isProcessing ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center">
                                            <FancyLoader type="image" size="sm" text="GENERATING..." />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-600">
                                            <ImageIcon size={32} className="mb-2" />
                                            <span className="text-xs">No Image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     <button 
                                        onClick={handleGenerateImage}
                                        disabled={isProcessing}
                                        className="bg-[#262626] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#333] flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Wand2 size={12} /> AI 生成
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-[#262626] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#333] flex items-center justify-center gap-2"
                                    >
                                        <Upload size={12} /> 上传图片
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                </div>
                            </div>

                            {/* Right: Info */}
                            <div className="col-span-2 space-y-4 md:space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs text-gray-500 mb-1">角色名称</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#171717] border border-[#262626] rounded-lg p-2 text-white"
                                            value={newChar.name}
                                            onChange={e => setNewChar({...newChar, name: e.target.value})}
                                            placeholder="如: 凌玲"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">性别</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#171717] border border-[#262626] rounded-lg p-2 text-white"
                                                value={newChar.gender}
                                                onChange={e => setNewChar({...newChar, gender: e.target.value})}
                                                placeholder="女"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">年龄段</label>
                                            <input 
                                                type="text" 
                                                className="w-full bg-[#171717] border border-[#262626] rounded-lg p-2 text-white"
                                                value={newChar.age}
                                                onChange={e => setNewChar({...newChar, age: e.target.value})}
                                                placeholder="青年"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">标签 (用逗号分隔)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-[#171717] border border-[#262626] rounded-lg p-2 text-white"
                                        placeholder="写实, 赛博朋克, 活泼"
                                        onBlur={(e) => setNewChar({...newChar, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">画面提示词 (Visual Prompt)</label>
                                    <textarea 
                                        className="w-full h-24 bg-[#171717] border border-[#262626] rounded-lg p-2 text-white resize-none text-sm"
                                        value={newChar.visualPrompt}
                                        onChange={e => setNewChar({...newChar, visualPrompt: e.target.value})}
                                        placeholder="详细描述角色的外貌，这是保持一致性的关键。例如：18岁少女，黑色长直发，穿着蓝白色校服，背着红色双肩包..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">主体描述/备注</label>
                                    <textarea 
                                        className="w-full h-20 bg-[#171717] border border-[#262626] rounded-lg p-2 text-white resize-none text-sm"
                                        value={newChar.subjectDescription}
                                        onChange={e => setNewChar({...newChar, subjectDescription: e.target.value})}
                                    />
                                </div>

                                <div className="flex justify-end gap-4 pt-4 pb-8 md:pb-0">
                                    <button onClick={() => setView('grid')} className="text-gray-400 hover:text-white px-4 py-2">取消</button>
                                    <button onClick={handleCreate} className="bg-cinema-accent text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-400 flex items-center gap-2">
                                        <Save size={16} /> 保存角色
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* EXTRACT VIEW */}
                {view === 'extract' && (
                    <div className="max-w-3xl mx-auto flex flex-col items-center">
                         <div className="w-16 h-16 bg-gradient-to-tr from-cinema-accent to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-purple-900/20">
                            <Wand2 size={32} className="text-white" />
                         </div>
                         <h3 className="text-xl md:text-2xl font-bold text-white mb-2">AI 智能提取</h3>
                         <p className="text-gray-400 mb-8 text-center max-w-lg text-sm md:text-base">
                            将小说片段或剧本粘贴在下方，AI 将自动分析并提取出所有关键角色的详细信息，直接存入角色库。
                         </p>

                         {isProcessing ? (
                             <div className="flex flex-col items-center justify-center py-10 w-full bg-[#171717]/50 rounded-xl border border-dashed border-[#333]">
                                 <FancyLoader type="analyzing" size="lg" text="ANALYZING SCRIPT..." />
                             </div>
                         ) : (
                             <div className="w-full flex flex-col items-center">
                                <textarea
                                    className="w-full h-64 bg-[#171717] border border-[#262626] rounded-xl p-6 text-white text-base md:text-lg focus:border-cinema-accent focus:outline-none mb-6 resize-none"
                                    placeholder="请粘贴文本..."
                                    value={extractionText}
                                    onChange={(e) => setExtractionText(e.target.value)}
                                ></textarea>

                                <button 
                                    onClick={handleExtract}
                                    disabled={!extractionText.trim()}
                                    className="bg-cinema-accent text-black px-8 py-3 rounded-full font-bold text-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-3 transition-transform hover:scale-105"
                                >
                                    <SparklesIcon /> 开始提取角色
                                </button>
                             </div>
                         )}
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);

export default CharacterLibrary;
