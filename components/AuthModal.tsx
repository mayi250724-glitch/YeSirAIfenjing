
import React, { useState } from 'react';
import { Sparkles, X, User, Loader2, AlertTriangle, Key, Send, RefreshCw, LogOut } from 'lucide-react';
import * as AuthService from '../services/authService';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [machineCode, setMachineCode] = useState(AuthService.getMachineCode());

  if (!isOpen) return null;

  // Handle form submission for machine code authentication
  const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!username.trim()) {
          setError('缺少必要参数: user_name');
          return;
      }

      setIsProcessing(true);
      try {
          // Simulate API verification delay
          setTimeout(() => {
              setIsProcessing(false);
              // Create user with machine code authentication
              const user = AuthService.certifyUser(username);
              // Add machine code to user profile
              const updatedUser = {
                  ...user,
                  machineCode,
                  status: '已认证 (Certified)'
              };
              localStorage.setItem('yesir_certified_user', JSON.stringify(updatedUser));
              onLoginSuccess(updatedUser);
              onClose();
          }, 1500);
      } catch (err: any) {
          setIsProcessing(false);
          setError(err.message || '验证失败，请重试');
      }
  };

  // Refresh machine code
  const handleRefreshMachineCode = () => {
      localStorage.removeItem('yesir_machine_code');
      setMachineCode(AuthService.getMachineCode());
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
      
      <div className="relative w-full max-w-md bg-[#0f0f0f] rounded-3xl border border-[#262626] shadow-2xl overflow-hidden flex flex-col items-center p-8">
        
        {/* Only show close button if not in processing state */}
        {!isProcessing && (
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                <X size={20} />
            </button>
        )}

        {/* Logo/Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <Sparkles className="text-white fill-white" size={28} />
        </div>

        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
            YesSir-导演请就位
        </h2>
        <p className="text-gray-500 text-sm mb-8 text-center">每个想法都是一部大片，准备好了就开启你的电影级创作之旅吧</p>

        {/* Machine Code Authentication Form */}
        <div className="w-full animate-fade-in">
            {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 mb-6">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            <form onSubmit={handleFormSubmit} className="w-full space-y-6">
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 ml-3">用户名:</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={`w-full bg-[#1a1a1a] border rounded-xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none transition-colors ${
                                error 
                                ? 'border-red-500 focus:border-red-500' 
                                : 'border-[#262626] focus:border-blue-500'
                            }`}
                            placeholder="请输入你的用户名"
                            required
                        />
                    </div>
                    <p className="text-xs text-gray-600 ml-3 mt-1">请输入你的用户名，管理员会根据此信息审核你的授权申请</p>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-500 ml-3">MAC 地址:</label>
                    <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            value={machineCode}
                            readOnly
                            className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl py-3 pl-12 pr-12 text-white text-sm focus:outline-none"
                        />
                        <button 
                            type="button"
                            onClick={handleRefreshMachineCode}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            title="刷新机器码"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-600 ml-3 mt-1">请将此MAC地址提供给管理员以完成授权</p>
                </div>

                <div className="space-y-3 pt-4">
                    <button 
                        type="submit"
                        disabled={isProcessing}
                        className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                            isProcessing 
                            ? 'bg-gray-700 text-gray-300 cursor-wait' 
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-blue-500/20'
                        }`}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={18} /> 正在验证...
                            </>
                        ) : (
                            <>
                                <Send size={16} /> 申请授权
                            </>
                        )}
                    </button>

                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={handleRefreshMachineCode}
                            disabled={isProcessing}
                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#262626] text-gray-300 hover:bg-[#222] hover:text-white"
                        >
                            <RefreshCw size={14} /> 重试
                        </button>
                        
                        <button 
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#262626] text-gray-300 hover:bg-[#222] hover:text-white"
                        >
                            <LogOut size={14} /> 退出
                        </button>
                    </div>
                </div>
            </form>

            {/* Diagnostic Info Section */}
            <div className="mt-6 pt-6 border-t border-[#262626]">
                <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm text-gray-500 hover:text-white transition-colors">
                        <span>诊断信息</span>
                        <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg">
                        <p className="text-xs text-gray-400 mb-2">浏览器信息: {navigator.userAgent}</p>
                        <p className="text-xs text-gray-400">屏幕分辨率: {screen.width}x{screen.height}</p>
                    </div>
                </details>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
