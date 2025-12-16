
import React, { useState, useEffect } from 'react';
import { X, LogOut, Phone, Mail, Award, Activity, Clock, FileText, ArrowRight, Trash2, Calendar, User } from 'lucide-react';
import { UserProfile, StoryboardData } from '../types';
import * as StorageService from '../services/storageService';
import * as AuthService from '../services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onLogout: () => void;
  onLoadProject: (data: StoryboardData) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onLogout, onLoadProject }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [projects, setProjects] = useState<StorageService.ProjectRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProjects(StorageService.getProjects());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定要删除这个项目吗？此操作无法撤销。")) {
      StorageService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-fade-in no-print">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-[#121212] w-full max-w-4xl h-[85vh] border border-[#262626] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-[#141414] border-r border-[#262626] flex flex-col">
            <div className="p-6 border-b border-[#262626] flex flex-col items-center">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 p-[2px] mb-3">
                     <div className="w-full h-full rounded-full bg-[#121212] overflow-hidden">
                         <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                     </div>
                 </div>
                 <h2 className="text-lg font-bold text-white">{user.username}</h2>
                 <span className="text-xs text-gray-500 font-mono mt-1">{user.level}</span>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-[#262626] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]'}`}
                >
                    <User size={18} /> 个人信息
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-[#262626] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]'}`}
                >
                    <Clock size={18} /> 历史记录
                </button>
            </nav>

            <div className="p-4 border-t border-[#262626]">
                <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={16} /> 退出登录
                </button>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
            <button onClick={onClose} className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white transition-colors">
                <X size={24} />
            </button>

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
                <div className="flex-1 p-8 overflow-y-auto">
                    <h3 className="text-2xl font-bold text-white mb-8">个人中心</h3>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {/* Status Card */}
                        <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">当前状态 (Status)</h4>
                                <span className="text-xl font-bold text-white flex items-center gap-2">
                                    {user.status} <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                </span>
                            </div>
                        </div>

                        {/* Level Card */}
                        <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                                <Award size={24} />
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">等级 (Level)</h4>
                                <span className="text-xl font-bold text-white">{user.level}</span>
                            </div>
                        </div>

                        {/* Member Type Card */}
                        <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                                <Award size={24} />
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">会员类型 (Member Type)</h4>
                                <span className="text-xl font-bold text-white">{user.memberType || 'Pro Plan'}</span>
                            </div>
                        </div>

                        {/* Wallet Card */}
                        <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 flex items-center gap-6">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">钱包余额 (Wallet)</h4>
                                <span className="text-xl font-bold text-white">¥{user.wallet || '0.00'}</span>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <User size={14} /> 注册账号
                                </h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-mono text-gray-300">{user.username}</span>
                                    <button className="text-xs text-cinema-accent hover:underline">修改</button>
                                </div>
                            </div>
                            <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <Phone size={14} /> 绑定手机
                                </h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-mono text-gray-300">{user.phone || '未绑定'}</span>
                                    <button className="text-xs text-cinema-accent hover:underline">绑定</button>
                                </div>
                            </div>
                            <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <Mail size={14} /> 绑定邮箱
                                </h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-mono text-gray-300">{user.email || '未绑定'}</span>
                                    <button className="text-xs text-cinema-accent hover:underline">绑定</button>
                                </div>
                            </div>
                            <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                                <h4 className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-4 flex items-center gap-2">
                                    <Calendar size={14} /> 注册日期
                                </h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-mono text-gray-300">{user.registrationDate || new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="flex-1 p-8 overflow-y-auto">
                    <h3 className="text-2xl font-bold text-white mb-8">历史项目记录</h3>
                    
                    <div className="space-y-4">
                        {projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-gray-500 gap-4 py-20">
                                <div className="w-20 h-20 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                                    <FileText size={40} className="opacity-20" />
                                </div>
                                <p className="font-mono text-sm">暂无历史项目 (No History)</p>
                            </div>
                        ) : (
                            projects.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => { onLoadProject(p.data); onClose(); }}
                                    className="bg-[#171717] border border-[#262626] rounded-xl p-5 cursor-pointer hover:border-cinema-accent hover:bg-[#1a1a1a] transition-all group relative shadow-md"
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
                                    
                                    <p className="text-sm text-gray-400 line-clamp-1 mb-4 font-light">
                                        {p.synopsis || "暂无简介..."}
                                    </p>
                                    
                                    <div className="flex justify-between items-center pt-3 border-t border-[#262626]">
                                        <div className="flex gap-2">
                                            <span className="text-[10px] bg-[#0f0f0f] text-gray-500 px-2 py-0.5 rounded border border-[#333]">
                                                {p.data.shots?.length || 0} Shots
                                            </span>
                                            <span className="text-[10px] bg-[#0f0f0f] text-gray-500 px-2 py-0.5 rounded border border-[#333]">
                                                {p.data.characters?.length || 0} Roles
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => handleDeleteProject(p.id, e)}
                                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-10"
                                                title="删除项目"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button className="flex items-center gap-1 text-xs font-bold text-cinema-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                继续创作 <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
