
import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Link, Key, Box, Activity, Server, ExternalLink, Info, Video } from 'lucide-react';
import { ApiConfig } from '../types';
import * as GeminiService from '../services/geminiService';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ApiConfig) => void;
  initialConfig: ApiConfig;
}

const PROVIDERS = [
    {
        key: 'gemini',
        label: 'Gemini',
        tip: '速度快但模型少',
        url: 'https://grsai.com/zh',
        color: 'bg-[#333]',
        hoverColor: 'hover:bg-[#444]'
    },
    {
        key: 'yunwu',
        label: 'Yunwu',
        tip: '模型多性价比高推荐',
        url: 'https://yunwu.ai/register?aff=aZWA',
        color: 'bg-cinema-accent text-black',
        hoverColor: 'hover:bg-yellow-400'
    },
    {
        key: 't8star',
        label: 'T8Star (New)',
        tip: 'New接入可灵O1尝鲜可选',
        url: 'https://ai.t8star.cn/register?aff=Zp0w64090',
        color: 'bg-blue-600 text-white',
        hoverColor: 'hover:bg-blue-500'
    },
    {
        key: 'tuzi',
        label: 'Tuzi API',
        tip: '高并发/多模型聚合',
        url: 'https://api.tu-zi.com/register?aff=XQzi',
        color: 'bg-pink-600 text-white',
        hoverColor: 'hover:bg-pink-500'
    }
] as const;

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<ApiConfig>(initialConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Local state to cache settings for each provider so switching back and forth preserves data
  const [providerSettings, setProviderSettings] = useState({
    gemini: {
      baseUrl: "https://grsai.dakka.com.cn",
      apiKey: initialConfig.provider === 'gemini' ? initialConfig.apiKey : "sk-2c1b373465af49908f55025433cac819",
      textModel: "gemini-3-pro",
      imageModel: "nano-banana-pro",
      videoModel: "veo3.1-fast"
    },
    yunwu: {
      baseUrl: "https://api.yunwu.ai/v1",
      apiKey: initialConfig.provider === 'yunwu' ? initialConfig.apiKey : "",
      textModel: "gpt-4o",
      imageModel: "dall-e-3",
      videoModel: "sora-2"
    },
    t8star: {
      baseUrl: "https://ai.t8star.cn/v1",
      apiKey: initialConfig.provider === 't8star' ? initialConfig.apiKey : "sk-LbD4Nt8o3PGkKdoZvZA1i0Rl5TCOQtx4uRgiOL2i4E2dcr98",
      textModel: "gpt-4o",
      imageModel: "dall-e-3",
      videoModel: "kling-video-o1"
    },
    tuzi: {
      baseUrl: "https://api.tu-zi.com/v1",
      apiKey: initialConfig.provider === 'tuzi' ? initialConfig.apiKey : "sk-HK8f4jlj0gFtb2bGRRXBtRouNStbkfkfuIpWMkYYBrdVBkdJ",
      textModel: "gpt-4o",
      imageModel: "dall-e-3",
      videoModel: "luma-video" // Default for Tuzi
    }
  });

  useEffect(() => {
    if (isOpen) {
        setConfig(initialConfig);
        // Initialize cache with current config for the active provider if exists
        setProviderSettings(prev => ({
            ...prev,
            [initialConfig.provider]: {
                baseUrl: initialConfig.baseUrl,
                apiKey: initialConfig.apiKey,
                textModel: initialConfig.textModel,
                imageModel: initialConfig.imageModel,
                videoModel: initialConfig.videoModel
            }
        }));
        setTestResult(null);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const handleChange = (key: keyof ApiConfig, value: string) => {
    setConfig(prev => {
        const newConfig = { ...prev, [key]: value };
        // Update cache as user types
        setProviderSettings(p => ({
            ...p,
            [prev.provider]: {
                ...p[prev.provider],
                [key]: value
            }
        }));
        return newConfig;
    });
    setTestResult(null); 
  };

  const handleProviderChange = (newProvider: 'gemini' | 'yunwu' | 't8star' | 'tuzi') => {
      // Load settings from cache for the new provider
      const settings = providerSettings[newProvider];
      
      setConfig(prev => ({
          ...prev,
          provider: newProvider,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          textModel: settings.textModel,
          imageModel: settings.imageModel,
          videoModel: settings.videoModel
      }));
      
      setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!config.apiKey || !config.baseUrl) {
        setTestResult({ success: false, msg: "Please enter API URL and Key." });
        return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Temporarily set config in service to test
    GeminiService.setApiConfig(config);

    try {
        // Simple generation test
        await GeminiService.generateTextTest();
        setTestResult({ success: true, msg: "连接成功 (Connection Successful)" });
    } catch (e: any) {
        console.error("Connection Test Failed", e);
        setTestResult({ success: false, msg: `连接失败: ${e.message || "Unknown Error"}` });
    } finally {
        setIsTesting(false);
    }
  };

  const handleSave = () => {
      if (!config.apiKey) {
          alert("API Key is required");
          return;
      }
      onSave(config);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#121212] w-full max-w-lg border border-[#262626] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-[#262626] flex items-center justify-between px-6 bg-[#171717]">
            <div className="flex items-center gap-3">
                <div className="bg-cinema-accent text-black p-1.5 rounded">
                    <Settings size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">配置 API</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

            {/* Provider Selector */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Server size={14} /> API 提供商 (Provider)
                </label>
                
                {/* Dropdown Selector */}
                <div className="relative">
                    <button 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                                config.provider === 'gemini' ? 'bg-[#333]' : 
                                config.provider === 'yunwu' ? 'bg-cinema-accent' : 
                                config.provider === 't8star' ? 'bg-blue-600' : 'bg-pink-600'
                            }`}></div>
                            {PROVIDERS.find(p => p.key === config.provider)?.label}
                        </div>
                        <div className={`transition-transform duration-200 ${
                            dropdownOpen ? 'rotate-180' : ''
                        }`}>
                            ▼
                        </div>
                    </button>
                    
                    {dropdownOpen && (
                        <div className="absolute mt-1 w-full bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl z-10">
                            {PROVIDERS.map((p) => (
                                <div 
                                    key={p.key} 
                                    className="relative group"
                                >
                                    <button 
                                        onClick={() => {
                                            handleProviderChange(p.key as any);
                                            setDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center gap-2 ${
                                            config.provider === p.key 
                                            ? 'bg-[#262626] text-white' 
                                            : 'text-gray-300 hover:bg-[#1e1e1e]'
                                        }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${
                                            p.key === 'gemini' ? 'bg-[#333]' : 
                                            p.key === 'yunwu' ? 'bg-cinema-accent' : 
                                            p.key === 't8star' ? 'bg-blue-600' : 'bg-pink-600'
                                        }`}></div>
                                        {p.label}
                                    </button>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute left-full top-0 ml-2 bg-[#222] text-white text-[10px] px-2 py-1 rounded shadow-xl border border-[#444] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 flex items-center gap-1">
                                        <Info size={10} className="text-cinema-accent" />
                                        {p.tip}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Link size={14} /> API 地址 (Base URL)
                </label>
                <input 
                    type="text" 
                    value={config.baseUrl}
                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none font-mono"
                />
                {config.provider === 't8star' && <p className="text-[10px] text-blue-400">Default: https://ai.t8star.cn/v1</p>}
                {config.provider === 'tuzi' && <p className="text-[10px] text-pink-400">Default: https://api.tu-zi.com/v1</p>}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                    <Key size={14} /> API Key
                </label>
                <input 
                    type="password" 
                    value={config.apiKey}
                    onChange={(e) => handleChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none font-mono tracking-widest"
                />
            </div>

            <div className="h-px bg-[#262626] my-2"></div>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Box size={14} /> 文本模型名称 (Text Model)
                    </label>
                    <input 
                        type="text" 
                        value={config.textModel}
                        onChange={(e) => handleChange('textModel', e.target.value)}
                        placeholder="e.g. gpt-4o, gemini-3-pro"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-500">
                        {(config.provider === 'yunwu' || config.provider === 't8star' || config.provider === 'tuzi') ? '推荐: gpt-4o, deepseek-chat' : '推荐: gemini-3-pro'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                        <Box size={14} /> 图片模型名称 (Image Model)
                    </label>
                    <input 
                        type="text" 
                        value={config.imageModel}
                        onChange={(e) => handleChange('imageModel', e.target.value)}
                        placeholder="nano-banana-pro"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none font-mono"
                    />
                </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2"><Box size={14} /> 默认视频模型 (Default Video Model)</div>
                        {config.provider === 't8star' && (
                            <span className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                                <Video size={10} /> 推荐使用 kling-video-o1
                            </span>
                        )}
                    </label>
                    <input 
                        type="text" 
                        value={config.videoModel}
                        onChange={(e) => handleChange('videoModel', e.target.value)}
                        placeholder="veo3.1-fast"
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-cinema-accent focus:outline-none font-mono"
                    />
                    {/* T8Star Specific Video Edit Hint/Action */}
                    {config.provider === 't8star' && (
                        <div className="flex gap-2 mt-1">
                            <button 
                                onClick={() => handleChange('videoModel', 'kling-video-o1')}
                                className="text-[10px] bg-[#111] border border-[#333] px-2 py-1 rounded text-gray-400 hover:text-white hover:border-blue-500 transition-colors flex items-center gap-1"
                            >
                                填充: kling-video-o1 (视频编辑/生成)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Test Result */}
            {testResult && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${testResult.success ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-red-900/20 text-red-400 border border-red-900/50'}`}>
                    <Activity size={14} />
                    {testResult.msg}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-4 mt-auto">
             <button 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-6 py-3 rounded-xl border border-[#333] text-white font-bold hover:bg-[#222] transition-colors flex-1"
            >
                {isTesting ? "Testing..." : "测试连接"}
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg flex-1"
            >
                保存
            </button>
        </div>

      </div>
    </div>
  );
};

export default ApiConfigModal;
