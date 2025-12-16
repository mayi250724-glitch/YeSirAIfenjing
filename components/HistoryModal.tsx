import React, { useEffect, useState } from 'react';
import { X, Trash2, Clock, FileText, ArrowRight, Calendar } from 'lucide-react';
import * as StorageService from '../services/storageService';
import { StoryboardData } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (data: StoryboardData) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onLoad }) => {
  const [projects, setProjects] = useState<StorageService.ProjectRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProjects(StorageService.getProjects());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这个项目吗？此操作无法撤销。")) {
      StorageService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[#121212] w-full max-w-3xl h-[80vh] border border-[#262626] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-[#262626] flex items-center justify-between px-6 bg-[#171717]">
            <div className="flex items-center gap-3">
                <div className="bg-cinema-accent text-black p-1.5 rounded">
                    <Clock size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">历史项目记录</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                    <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                        <FileText size={40} className="opacity-20" />
                    </div>
                    <p className="font-mono text-sm">暂无历史项目 (No History)</p>
                </div>
            ) : (
                projects.map(p => (
                    <div 
                        key={p.id}
                        onClick={() => { onLoad(p.data); onClose(); }}
                        className="bg-[#1a1a1a] border border-[#333] rounded-xl p-5 cursor-pointer hover:border-cinema-accent hover:bg-[#222] transition-all group relative shadow-md"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-bold text-white group-hover:text-cinema-accent transition-colors truncate pr-4">
                                {p.title || '无标题项目'}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono bg-[#0f0f0f] px-2 py-1 rounded border border-[#222]">
                                <Calendar size={10} />
                                {new Date(p.updatedAt).toLocaleString()}
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-400 line-clamp-2 mb-4 font-light leading-relaxed">
                            {p.synopsis || "暂无简介..."}
                        </p>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-[#262626]">
                            <div className="flex gap-2">
                                <span className="text-[10px] bg-[#111] text-gray-500 px-2 py-0.5 rounded border border-[#333]">
                                    {p.data.shots?.length || 0} Shots
                                </span>
                                <span className="text-[10px] bg-[#111] text-gray-500 px-2 py-0.5 rounded border border-[#333]">
                                    {p.data.characters?.length || 0} Characters
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={(e) => handleDelete(p.id, e)}
                                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10"
                                    title="删除项目"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button className="flex items-center gap-1 text-xs font-bold text-cinema-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                    Load Project <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
