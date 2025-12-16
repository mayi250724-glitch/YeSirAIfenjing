
import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Wand2, Download, Sparkles, AlertCircle, RefreshCw, Palette } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import { ComicData, ComicPanel } from '../types';
import FancyLoader from './FancyLoader';

interface ComicGeneratorViewProps {
  inputText: string;
  onBack: () => void;
}

const ComicGeneratorView: React.FC<ComicGeneratorViewProps> = ({ inputText, onBack }) => {
  const [prompt, setPrompt] = useState(inputText);
  const [style, setStyle] = useState('日式黑白漫画');
  const [comicData, setComicData] = useState<ComicData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const styles = [
      '日式黑白漫画',
      '美式彩色漫画',
      '韩漫条漫风格',
      '像素艺术',
      '水彩插画',
      '赛博朋克霓虹'
  ];

  const handleGenerate = async () => {
      if (!prompt.trim()) return;
      setIsAnalyzing(true);
      setErrorMsg(null);
      setComicData(null);

      try {
          // 1. Generate Script
          const data = await GeminiService.generateComicScript(prompt, style);
          setComicData(data);
          
          // 2. Generate Images for all panels
          // To prevent rate limits, we'll do batches or one by one. 
          // Let's do 2 concurrent requests.
          const panels = [...data.panels];
          const chunkSize = 2;
          
          for (let i = 0; i < panels.length; i += chunkSize) {
              const chunk = panels.slice(i, i + chunkSize);
              await Promise.all(chunk.map(panel => generatePanelImage(panel, style)));
          }

      } catch (e: any) {
          setErrorMsg(e.message || "生成失败");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const generatePanelImage = async (panel: ComicPanel, comicStyle: string) => {
      // Update state to loading for this panel (though initially they are all loading)
      try {
          // Combine style, visual prompt
          const fullPrompt = `${comicStyle}, ${panel.visualPrompt}, high quality, detailed, 8k`;
          const imageUrl = await GeminiService.generateImage(fullPrompt, "3:4"); // 3:4 is good for comics
          
          setComicData(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  panels: prev.panels.map(p => p.id === panel.id ? { ...p, imageUrl, isGenerating: false } : p)
              };
          });
      } catch (e) {
          console.error(`Failed panel ${panel.panelNumber}`, e);
          setComicData(prev => {
              if (!prev) return null;
              return {
                  ...prev,
                  panels: prev.panels.map(p => p.id === panel.id ? { ...p, isGenerating: false } : p)
              };
          });
      }
  };

  const handleRetryPanel = (panel: ComicPanel) => {
      if (!comicData) return;
      setComicData(prev => {
          if (!prev) return null;
          return {
              ...prev,
              panels: prev.panels.map(p => p.id === panel.id ? { ...p, isGenerating: true, imageUrl: undefined } : p)
          };
      });
      generatePanelImage(panel, comicData.style);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="h-16 border-b border-[#262626] bg-[#141414] px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="text-pink-500" /> 8格漫画生成器
                </h2>
            </div>
        </div>

        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6">
            
            {/* Input Section */}
            <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 mb-8 shadow-lg">
                 <div className="flex flex-col md:flex-row gap-6">
                     <div className="flex-1 space-y-2">
                         <label className="text-sm font-bold text-gray-400">漫画主题 / 故事梗概</label>
                         <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full h-32 bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:outline-none focus:border-pink-500 resize-none"
                            placeholder="输入你想生成的漫画故事..."
                         />
                     </div>
                     <div className="w-full md:w-72 space-y-4">
                         <div>
                            <label className="text-sm font-bold text-gray-400 mb-2 block">漫画风格</label>
                            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                {styles.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setStyle(s)}
                                        className={`text-left px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${style === s ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-[#0a0a0a] border-[#333] text-gray-500 hover:border-gray-500'}`}
                                    >
                                        <Palette size={14} /> {s}
                                    </button>
                                ))}
                            </div>
                         </div>
                         <button 
                            onClick={handleGenerate}
                            disabled={isAnalyzing || !prompt.trim()}
                            className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
                         >
                            {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                            {isAnalyzing ? "正在生成..." : "生成漫画"}
                         </button>
                     </div>
                 </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 mb-8 flex items-center gap-3 text-red-300">
                    <AlertCircle size={20} />
                    {errorMsg}
                </div>
            )}

            {/* Comic Grid */}
            {comicData && (
                <div className="animate-fade-in-up">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2 comic-title">{comicData.title}</h1>
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{comicData.style}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {comicData.panels.map((panel) => (
                            <div key={panel.id} className="group relative bg-white rounded-lg p-2 shadow-2xl transform transition-transform hover:-translate-y-1">
                                {/* Panel Number */}
                                <div className="absolute top-0 left-0 bg-black text-white text-xs font-bold px-2 py-1 z-20">
                                    {panel.panelNumber}
                                </div>

                                {/* Image Area */}
                                <div className="aspect-[3/4] bg-gray-100 border-2 border-black overflow-hidden relative">
                                    {panel.imageUrl ? (
                                        <img src={panel.imageUrl} alt={`Panel ${panel.panelNumber}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                            {panel.isGenerating ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <FancyLoader type="image" size="sm" />
                                                    <span className="text-xs font-mono mt-2">正在绘制...</span>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleRetryPanel(panel)} className="flex flex-col items-center gap-2 hover:text-pink-500">
                                                    <AlertCircle />
                                                    <span className="text-xs">重试</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Caption Area */}
                                <div className="mt-2 min-h-[60px] flex items-center justify-center p-2 bg-white">
                                    <p className="text-black text-sm font-bold text-center font-comic leading-tight">
                                        {panel.caption}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Empty State */}
            {!comicData && !isAnalyzing && !errorMsg && (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <BookOpen size={64} className="mb-4 text-gray-500" />
                    <p className="text-xl font-bold text-gray-500">等待灵感涌现...</p>
                </div>
            )}

        </div>
    </div>
  );
};

export default ComicGeneratorView;
