
// ... keep imports ...
import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, Sparkles, Users, MapPin, ArrowLeft, Settings, Download, Film, Image as ImageIcon, X, MonitorPlay, AlertCircle, User, BookOpen, RefreshCw, Upload, FileText, ChevronDown, ChevronUp, Palette, Home, Loader2, Zap, Eye } from 'lucide-react';
import { AppStep, StoryboardData, Shot, Character, AnalyzeOptions, ApiConfig, UserProfile, TrackType } from './types';
import * as GeminiService from './services/geminiService';
import * as StorageService from './services/storageService';
import * as AuthService from './services/authService';
import ShotCard from './components/ShotCard';
import CharacterLibrary from './components/CharacterLibrary';
import FullMovieView from './components/FullMovieView';
import VideoGenerationModal from './components/VideoGenerationModal';
import ApiConfigModal from './components/ApiConfigModal';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import HistoryModal from './components/HistoryModal'; 
import ComicGeneratorView from './components/ComicGeneratorView';
import VideoEditorView from './components/VideoEditorView';
import ImageGenView from './components/ImageGenView'; 
import VideoGenView from './components/VideoGenView'; 
import FancyLoader from './components/FancyLoader';
import HomeView from './components/HomeView';
import DynamicPageDesign from './components/DynamicPageDesign';
import VibeAgentWorkflowView from './components/VibeAgentWorkflowView';

const DEFAULT_CONFIG: ApiConfig = {
    baseUrl: "https://grsai.dakka.com.cn",
    apiKey: "",
    textModel: "gemini-3-pro",
    imageModel: "nano-banana-pro",
    videoModel: "veo3.1-fast",
    provider: 'gemini'
};

const STYLE_CATEGORIES: Record<string, string[]> = {
  '画风类型': ['写实风格', 'Q版风格', 'SD风格', '像素风格', '超现实主义风格', '摄影写实', '史诗级电影', '好莱坞大片', '胶片电影风', '黏土动画风', '二次元插画风'],
  '中国动漫': ['新风都市', '水墨画风格', '国潮风格', '古风仙侠', '皮影戏风格', '木偶戏风格', '武侠风格', '修仙风格', '年画风格', '京剧脸谱风格', '玄幻风格', '神话风格'],
  '美国动漫': ['迪士尼经典风格', '皮克斯3D风格', '漫威动画风格'],
  '日本动漫': ['海贼王风格', '宫崎骏风格', '火影忍者', '新海诚风格', '战国武将风格', '忍者风格', '青年漫画风格', '少女漫画风格', '儿童向风格', '机甲风格', '校园风格', '推理悬疑风格', '恐怖惊悚风格', '神话传说风格', '禅意风格'],
  '欧洲动漫': ['俄罗斯动画风格', '德国动画风格', '西班牙动画风格', '意大利动画风格', '法国动画风格', '比利时漫画风格', '匈牙利动画风格', '荷兰动画风格', '瑞士动画风格', '希腊动画风格']
};

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'HOME' | 'STUDIO'>('HOME');
  const [showLivePreview, setShowLivePreview] = useState(false);

  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [inputText, setInputText] = useState('');
  const [data, setData] = useState<StoryboardData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressLog, setProgressLog] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Loading Animation State
  const [loadingMessage, setLoadingMessage] = useState('正在初始化 AI 导演...');
  
  // Settings State
  const [mode, setMode] = useState<'divergent' | 'logic'>('divergent');
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [shotCountMode, setShotCountMode] = useState<'auto' | 'custom'>('auto');
  const [customShotCount, setCustomShotCount] = useState<number>(10);

  // Config State
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // UI State for Dropdowns
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isStyleOpen, setIsStyleOpen] = useState(false); 
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  
  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeShotForVideo, setActiveShotForVideo] = useState<Shot | null>(null);
  const [activePrevShotImage, setActivePrevShotImage] = useState<string | null>(null);

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Library State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryCharacters, setLibraryCharacters] = useState<Character[]>([
      {
          id: '1',
          name: '王珂',
          gender: '女',
          age: '青年',
          tags: ['写实', '电影质感写实', '女仆主播', '活泼'],
          subjectDescription: '女仆主播，青年，活泼',
          background: 'Unknown',
          personality: '活泼',
          coreProps: '',
          visualPrompt: '18岁少女，黑色长卷发，穿着黑白蕾丝女仆装，精致的妆容，在书房背景中，柔和的光线，三视图，正面，侧面，全身',
          imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
      }
  ]);

  // New Selection States
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');

  // Quick Tags
  const genres = ['科幻', '悬疑', '浪漫', '商业', '微型剧', '纪录片', '动漫', '动画', 'MV'];
  const aspectRatios = ['16:9', '9:16', '1:1', '4:3'];

  // State
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  
  // Editor State
  const [editorResources, setEditorResources] = useState<{ id: string; url: string; type: TrackType; name: string; thumbnail?: string }[]>([]);
  
  // Lightbox State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auth Check Helper
  // Returns true if user is certified, false otherwise
  // Shows auth modal only when trying to use core functionality
  const checkAuth = (showModal: boolean = true) => {
    const isCertified = AuthService.isCertified();
    if (!isCertified && showModal) {
        setShowAuthModal(true);
    }
    return isCertified;
  };

  // Load Config and User on Mount
  useEffect(() => {
    // Config
    const savedConfigs = localStorage.getItem('yesir_api_configs');
    if (savedConfigs) {
        try {
            const parsedConfigs = JSON.parse(savedConfigs);
            // 获取所有配置的平台
            const providers = Object.keys(parsedConfigs);
            if (providers.length > 0) {
                // 使用第一个配置作为当前配置
                const firstConfig = parsedConfigs[providers[0]];
                setApiConfig(firstConfig);
                
                // 批量设置所有配置到服务中
                Object.values(parsedConfigs).forEach(config => {
                    GeminiService.setApiConfig(config as ApiConfig);
                });
            }
        } catch (e) {
            console.error("Failed to parse configs", e);
            // 不自动显示配置弹窗，用户可通过设置按钮访问
        }
    } else {
        // 检查旧格式的配置
        const savedConfig = localStorage.getItem('yesir_api_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                const merged = { ...DEFAULT_CONFIG, ...parsed }; 
                setApiConfig(merged);
                GeminiService.setApiConfig(merged);
            } catch (e) {
                console.error("Failed to parse config", e);
                // 不自动显示配置弹窗，用户可通过设置按钮访问
            }
        } else {
            // 不自动显示配置弹窗，用户可通过设置按钮访问
            // 使用默认配置
            GeminiService.setApiConfig(DEFAULT_CONFIG);
        }
    }
    setIsConfigLoaded(true);

    // User Check - Load User if Exists, Enforce Auth on Load
    const user = AuthService.getCurrentUser();
    if (user) {
        setCurrentUser(user);
    } else {
        // 显示认证/支付弹窗
        setShowAuthModal(true);
    }
  }, []);
  
  // Cycle Loading Messages
  useEffect(() => {
      let interval: any;
      if (step === AppStep.ANALYZING) {
          const messages = [
              "正在深度阅读剧本...",
              "分析角色性格与外貌特征...",
              "拆解剧情结构与节奏...",
              "构思分镜景别与运镜...",
              "生成 AI 绘画提示词...",
              "导演正在就位，准备开拍..."
          ];
          let i = 0;
          setLoadingMessage(messages[0]);
          interval = setInterval(() => {
              i = (i + 1) % messages.length;
              setLoadingMessage(messages[i]);
          }, 3000);
      }
      return () => clearInterval(interval);
  }, [step]);

  // Smooth scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, currentView]);

  // Disable body scroll when lightbox/modal is open
  useEffect(() => {
    if (selectedImage || showLibrary || showVideoModal || showConfigModal || showAuthModal || showProfileModal || showHistoryModal || isStyleOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedImage, showLibrary, showVideoModal, showConfigModal, showAuthModal, showProfileModal, showHistoryModal, isStyleOpen]);

  // Close style dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth >= 768 && styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setIsStyleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveConfig = (newConfig: ApiConfig) => {
      setApiConfig(newConfig);
      GeminiService.setApiConfig(newConfig);
      localStorage.setItem('yesir_api_config', JSON.stringify(newConfig));
      setShowConfigModal(false);
  };

  const handleExportPDF = () => {
      window.print();
  };

  const handleLoadProject = (loadedData: StoryboardData) => {
      if (!checkAuth()) return;
      setData(loadedData);
      setShots(loadedData.shots);
      setCharacters(loadedData.characters);
      setStep(AppStep.RESULT);
      // Ensure we go to studio view if loading a project
      setCurrentView('STUDIO');
  };

  const handleLoginSuccess = (user: UserProfile) => {
      setCurrentUser(user);
  };

  const handleLogout = () => {
      AuthService.logout();
      setCurrentUser(null);
      setShowProfileModal(false);
      setShowAuthModal(true);
  };

  const handleUserButtonClick = () => {
      if (currentUser) {
          setShowProfileModal(true);
      } else {
          setShowAuthModal(true);
      }
  };

  const saveCurrentProjectState = (currentShots: Shot[], currentChars: Character[]) => {
      if (data) {
          const updatedData = { ...data, shots: currentShots, characters: currentChars };
          setData(updatedData); 
          StorageService.saveProject(updatedData);
      }
  };

  const updateShotState = (shotId: number, updates: Partial<Shot>) => {
      setShots(prev => {
          const updated = prev.map(s => s.id === shotId ? { ...s, ...updates } : s);
          if (updates.videoUrl || updates.error || updates.lastFrameImageUrl) {
              saveCurrentProjectState(updated, characters);
          }
          return updated;
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
              setInputText(prev => prev + '\n' + content);
          }
      };

      if (file.type === "text/plain" || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          reader.readAsText(file);
      } else {
          alert("目前仅支持 .txt, .md 等纯文本文件直接导入。PDF/Word 请复制文本内容粘贴。");
      }
      
      if (fileUploadRef.current) fileUploadRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!checkAuth()) return;
    if (!inputText.trim()) return;
    if (!apiConfig.apiKey) {
        setShowConfigModal(true);
        return;
    }
    
    setIsAnalyzing(true);
    setErrorMsg(null);
    setStep(AppStep.ANALYZING);
    setProgressLog(lang === 'zh' ? '正在调用大模型分析剧本逻辑与一致性...' : 'Analyzing script structure and consistency...');

    const options: AnalyzeOptions = {
      genre: selectedGenre,
      style: selectedStyle,
      mode,
      lang,
      aspectRatio,
      shotCountMode,
      customShotCount: shotCountMode === 'custom' ? customShotCount : undefined,
      libraryCharacters: libraryCharacters
    };

    try {
      // 1. Get Text Structure
      const result = await GeminiService.analyzeScript(inputText, options);
      
      if (!result || !result.shots) {
          throw new Error("生成结果为空，请重试");
      }

      setData(result);
      
      const initialShots = result.shots.map(s => ({
        ...s,
        imageUrl: '',
        isGeneratingImage: true,
        videoUrl: '',
        isGeneratingVideo: false
      }));
      setShots(initialShots);

      const initialCharacters = result.characters.map(c => {
         const libChar = libraryCharacters.find(lc => 
            c.name.includes(lc.name) || lc.name.includes(c.name)
         );
         
         if (libChar) {
             return {
                 ...c,
                 id: libChar.id, 
                 name: libChar.name,
                 subjectDescription: libChar.subjectDescription,
                 visualPrompt: libChar.visualPrompt,
                 imageUrl: libChar.imageUrl || '',
                 isGeneratingImage: !libChar.imageUrl 
             };
         }

         return {
            ...c,
            imageUrl: '',
            isGeneratingImage: true
         };
      });
      setCharacters(initialCharacters);
      
      setStep(AppStep.RESULT);
      
      StorageService.saveProject({
          ...result,
          shots: initialShots,
          characters: initialCharacters
      });

      generateAllImages(initialShots);
      generateAllCharacterImages(initialCharacters);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || '分析失败，请检查网络或重试。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAllImages = async (currentShots: Shot[]) => {
    for (const shot of currentShots) {
       await generateSingleShotImage(shot.id, shot.t2iPrompt);
    }
  };

  const generateSingleShotImage = async (shotId: number, prompt: string) => {
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, isGeneratingImage: true, error: undefined } : s));
    try {
      const base64Image = await GeminiService.generateImage(prompt, aspectRatio);
      
      setShots(prev => {
          const updated = prev.map(s => 
            s.id === shotId 
              ? { ...s, imageUrl: base64Image, isGeneratingImage: false, error: undefined } 
              : s
          );
          saveCurrentProjectState(updated, characters);
          return updated;
      });
    } catch (e: any) {
      console.error(`Failed to generate image for shot ${shotId}`, e);
      setShots(prev => prev.map(s => s.id === shotId ? { ...s, isGeneratingImage: false, error: e.message } : s));
    }
  };

  const handleOpenVideoModal = (shotId: number) => {
    const index = shots.findIndex(s => s.id === shotId);
    const shot = shots[index];
    
    let prevImage: string | null = null;
    if (index > 0) {
        const prevShot = shots[index - 1];
        prevImage = prevShot.lastFrameImageUrl || prevShot.imageUrl || null;
    }

    if (shot) {
      setActiveShotForVideo(shot);
      setActivePrevShotImage(prevImage);
      setShowVideoModal(true);
    }
  };

  const handleNextVideoModal = () => {
    if (!activeShotForVideo) return;
    const currentIndex = shots.findIndex(s => s.id === activeShotForVideo.id);
    if (currentIndex >= 0 && currentIndex < shots.length - 1) {
        const nextShot = shots[currentIndex + 1];
        handleOpenVideoModal(nextShot.id);
    }
  };

  const hasNextShot = activeShotForVideo 
      ? shots.findIndex(s => s.id === activeShotForVideo.id) < shots.length - 1
      : false;

  const handleConfirmGenerateVideo = async (shotId: number, params: { prompt: string; firstFrameImage?: string; aspectRatio: string; model: string; lastFrameImage?: string; audioFile?: string; duration: number }) => {
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    const imageToUse = params.firstFrameImage;

    setShots(prev => prev.map(s => s.id === shotId ? { ...s, isGeneratingVideo: true, generationProgress: 0, error: undefined, generationStatus: 'starting', audioFileUrl: params.audioFile } : s));
    
    try {
      const videoUrl = await GeminiService.generateVideo(
          params.prompt, 
          imageToUse, 
          params.aspectRatio,
          params.model,
          (progress, status) => {
             setShots(prev => prev.map(s => s.id === shotId ? { ...s, generationProgress: progress, generationStatus: status } : s));
          },
          params.lastFrameImage,
          params.duration
      );
      setShots(prev => {
          const updated = prev.map(s => 
            s.id === shotId 
              ? { ...s, videoUrl: videoUrl, isGeneratingVideo: false, generationProgress: undefined, generationStatus: undefined } 
              : s
          );
          saveCurrentProjectState(updated, characters);
          return updated;
      });
    } catch (e: any) {
      console.error(`Failed to generate video for shot ${shotId}`, e);
      setShots(prev => prev.map(s => s.id === shotId ? { ...s, isGeneratingVideo: false, generationProgress: undefined, error: e.message || "Failed" } : s));
      if (step !== AppStep.FULL_MOVIE) {
          alert(`视频生成失败: ${e.message || "未知错误"}`);
      }
    }
  };

  const generateAllCharacterImages = async (currentChars: Character[]) => {
    for (let i = 0; i < currentChars.length; i++) {
        const char = currentChars[i];
        if (char.imageUrl) continue;

        try {
            const enhancedPrompt = `(人物三视图:1.5), (正面主图, 侧面, 背面, 全身展示:1.3), 角色设定图, ${char.visualPrompt}`;
            const base64Image = await GeminiService.generateImage(enhancedPrompt, "3:4");
            setCharacters(prev => {
                const newChars = [...prev];
                newChars[i] = { ...newChars[i], imageUrl: base64Image, isGeneratingImage: false, error: undefined };
                saveCurrentProjectState(shots, newChars);
                return newChars;
            });
        } catch (e: any) {
            console.error(`Failed to generate character image`, e);
             setCharacters(prev => {
                const newChars = [...prev];
                newChars[i] = { ...newChars[i], isGeneratingImage: false, error: e.message };
                return newChars;
            });
        }
    }
  };

  const handleRetryCharacterImage = (index: number) => {
      setCharacters(prev => {
          const newChars = [...prev];
          newChars[index] = { ...newChars[index], isGeneratingImage: true, error: undefined };
          return newChars;
      });
      generateAllCharacterImages([characters[index]]);
  };

  const handleReset = () => {
    setStep(AppStep.INPUT);
    setData(null);
    setShots([]);
    setCharacters([]);
    setProgressLog('');
    setErrorMsg(null);
  };

  const toggleGenre = (g: string) => {
    setSelectedGenre(prev => prev === g ? '' : g);
  };

  const selectStyle = (s: string) => {
      setSelectedStyle(s);
      setIsStyleOpen(false);
  };

  const removeTag = (type: 'genre' | 'style') => {
    if (type === 'genre') setSelectedGenre('');
    if (type === 'style') setSelectedStyle('');
  };

  const handleSelectCharacters = (names: string[]) => {
    const textToInsert = names.map(name => `@${name}`).join(' ');
    
    setInputText(prev => {
        const prefix = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
        return prev + prefix + textToInsert + ' ';
    });
    setShowLibrary(false);
    
    setTimeout(() => {
        if (textAreaRef.current) {
            textAreaRef.current.focus();
            const len = textAreaRef.current.value.length;
            textAreaRef.current.setSelectionRange(len, len);
        }
    }, 100);
  };

  const handleEnterStudio = () => {
      // 允许进入工作室预览，不需要认证
      setCurrentView('STUDIO');
      setStep(AppStep.INPUT);
  };

  const handleEnterImageGen = () => {
      // 允许进入图像生成预览，不需要认证
      setCurrentView('STUDIO');
      setStep(AppStep.IMAGE_GEN);
  };

  const handleEnterVideoGen = () => {
      // 允许进入视频生成预览，不需要认证
      setCurrentView('STUDIO');
      setStep(AppStep.VIDEO_GEN);
  };
  
  const handleEnterEditorFromVideoGen = (videoUrl: string, prompt: string) => {
      // 设置编辑器资源
      setEditorResources([{
          id: `video-${Date.now()}`,
          url: videoUrl,
          type: TrackType.VIDEO,
          name: `生成视频: ${prompt.substring(0, 20)}...`,
          thumbnail: null
      }]);
      // 进入编辑器
      setStep(AppStep.EDITOR);
  };
  
  const handleEnterVibeAgentWorkflow = () => {
      // 进入VibeAgent工作流页面
      setCurrentView('STUDIO');
      setStep(AppStep.VIBE_AGENT_WORKFLOW);
  };

  // --- RENDER MODALS GLOBALLY ---

  return (
      <>
       {/* Global Modals (Available in both Home and Studio) */}
       <ApiConfigModal 
        isOpen={showConfigModal}
        initialConfig={apiConfig}
        onSave={handleSaveConfig}
        onClose={() => setShowConfigModal(false)}
      />
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      {currentUser && (
          <UserProfileModal 
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            user={currentUser}
            onLogout={handleLogout}
            onLoadProject={handleLoadProject}
          />
      )}
      <HistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onLoad={handleLoadProject}
      />

      {/* --- HOME VIEW --- */}
      {currentView === 'HOME' && (
          <div className="flex">
            <HomeView 
              onEnterStudio={handleEnterStudio} 
              onEnterImageGen={handleEnterImageGen}
              onEnterVideoGen={handleEnterVideoGen}
              onEnterVibeAgentWorkflow={handleEnterVibeAgentWorkflow}
              userAvatar={currentUser?.avatar}
              userName={currentUser?.username}
              onOpenAuth={() => setShowAuthModal(true)}
              onOpenHistory={() => setShowHistoryModal(true)} // Pass history handler
              onOpenSettings={() => setShowConfigModal(true)} // Pass config handler
              onOpenProfile={handleUserButtonClick} // Pass profile handler
            />
            {showLivePreview && (
              <div className="w-1/3 border-l border-gray-200 hidden md:block">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Eye size={18} />
                    实时预览
                  </h3>
                  <button 
                    onClick={() => setShowLivePreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="h-[calc(100vh-64px)] overflow-y-auto">
                  <DynamicPageDesign type="home" />
                </div>
              </div>
            )}
          </div>
      )}

      {/* --- STUDIO VIEW (Original App Logic) --- */}
      {currentView === 'STUDIO' && (
        <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans selection:bg-cinema-accent selection:text-black relative" id="app-root">
          {/* Add toggle button for live preview in studio view */}
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="fixed top-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
          >
            <Eye size={18} />
            <span className="hidden md:inline">
              {showLivePreview ? '关闭预览' : '开启预览'}
            </span>
          </button>

          {/* Studio-specific Modals */}
          {showLibrary && (
                <CharacterLibrary 
                    characters={libraryCharacters}
                    onUpdateCharacters={setLibraryCharacters}
                    onSelect={handleSelectCharacters}
                    onClose={() => setShowLibrary(false)}
                />
            )}

            <VideoGenerationModal 
                isOpen={showVideoModal}
                shot={activeShotForVideo}
                previousShotImage={activePrevShotImage}
                defaultAspectRatio={aspectRatio}
                onClose={() => setShowVideoModal(false)}
                onGenerate={handleConfirmGenerateVideo}
                onNext={handleNextVideoModal}
                hasNext={hasNextShot}
            />

            {selectedImage && !showLibrary && !showVideoModal && !showConfigModal && !showAuthModal && !showProfileModal && !showHistoryModal && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in no-print"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 text-white hover:text-cinema-accent transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img 
                        src={selectedImage} 
                        alt="Fullscreen" 
                        className="max-w-full max-h-full object-contain rounded-md shadow-2xl ring-1 ring-white/20"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}

            {/* CONDITIONAL SUB-VIEWS WITHIN STUDIO */}
            {step === AppStep.FULL_MOVIE ? (
                <FullMovieView 
                    shots={shots} 
                    aspectRatio={aspectRatio}
                    onUpdateShot={updateShotState} 
                    onBack={() => setStep(AppStep.RESULT)}
                    onEdit={() => setStep(AppStep.EDITOR)}
                />
            ) : step === AppStep.EDITOR ? (
                <VideoEditorView
                    initialResources={editorResources.length > 0 ? editorResources : shots.filter(s => s.videoUrl).map(s => ({
                        id: s.id.toString(),
                        url: s.videoUrl!,
                        type: TrackType.VIDEO,
                        name: `Scene ${s.shotNumber}`,
                        thumbnail: s.imageUrl
                    }))}
                    onBack={() => {
                        setStep(AppStep.FULL_MOVIE);
                        // 清空编辑器资源，回到原始路径
                        setEditorResources([]);
                    }}
                />
            ) : step === AppStep.COMIC_GENERATOR ? (
                <ComicGeneratorView 
                    inputText={inputText}
                    onBack={() => setStep(AppStep.INPUT)}
                />
            ) : step === AppStep.IMAGE_GEN ? (
                // Image Generator View
                <ImageGenView 
                    onBack={() => setCurrentView('HOME')} // Go back to Home
                />
            ) : step === AppStep.VIDEO_GEN ? (
                // Video Generator View
                <VideoGenView 
                    onBack={() => setCurrentView('HOME')} // Go back to Home
                    onEnterEditor={handleEnterEditorFromVideoGen}
                />
            ) : step === AppStep.DYNAMIC_PAGE ? (
                // Dynamic Page Design View
                <DynamicPageDesign 
                    type="home"
                    onComponentAction={(action, data) => {
                        console.log('Component action:', action, data);
                        // Handle component actions here
                        if (action === 'navigate') {
                            if (data?.route === 'studio') {
                                setStep(AppStep.INPUT);
                            }
                        }
                    }}
                />
            ) : step === AppStep.VIBE_AGENT_WORKFLOW ? (
                // VibeAgent Workflow View
                <VibeAgentWorkflowView 
                    onBack={() => setCurrentView('HOME')} // Go back to Home
                />
            ) : (
                /* DEFAULT STUDIO LAYOUT (Input / Analyzing / Result) */
                <>
                    {/* Only show header if NOT Analyzing to give full screen feel to loader */}
                    {step !== AppStep.ANALYZING && (
                        <header className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-[#262626] no-print">
                            <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                            
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                                    handleReset();
                                }}>
                                    <div className="bg-cinema-accent text-black p-1 rounded-md">
                                    <Clapperboard size={20} strokeWidth={2.5} />
                                    </div>
                                    <div className="flex flex-col">
                                    <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none text-white">
                                        Yesir <span className="text-cinema-accent font-serif italic text-base md:text-lg ml-1 hidden sm:inline">导演请就位</span>
                                    </h1>
                                    <span className="text-[9px] md:text-[10px] text-gray-500 tracking-wider">INTELLIGENT STORYBOARD SYSTEM</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 md:gap-6 text-sm font-medium text-gray-400">
                                    <button 
                                        onClick={() => setCurrentView('HOME')}
                                        className="flex items-center gap-2 hover:text-white transition-colors bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-full"
                                    >
                                        <Home size={16} /> <span className="hidden sm:inline">Home</span>
                                    </button>
                                    <button 
                                        onClick={() => setShowLibrary(true)}
                                        className="flex items-center gap-2 hover:text-white transition-colors"
                                    >
                                        <Users size={18} /> <span className="hidden sm:inline">Roles ({libraryCharacters.length})</span>
                                    </button>
                                </div>
                            </div>
                        </header>
                    )}

                    <main className={step === AppStep.ANALYZING ? "w-full h-screen" : "pt-20 md:pt-24 pb-24 md:pb-40 px-4 md:px-6 max-w-[1400px] mx-auto"} id="printable-content">
                        
                        {/* Step 1: Input */}
                        {step === AppStep.INPUT && (
                        <div className="animate-fade-in flex flex-col items-center">
                            
                            <div className="text-center mb-6 md:mb-10 mt-4 md:mt-8">
                            <h2 className="text-3xl md:text-5xl font-serif text-white mb-2 md:mb-4">
                                <span className="text-cinema-accent">Yesir</span> 分镜设计
                            </h2>
                            <p className="text-gray-400 text-sm md:text-lg font-light tracking-wide max-w-xl mx-auto">
                                输入一个简单的创意或导入剧本文件，AI 将为您生成完整的故事、剧本以及高度一致的电影级分镜画面。
                            </p>
                            </div>
                            
                            {/* ... Toolbars ... */}
                            <div className="w-full max-w-4xl bg-[#171717] border border-[#262626] rounded-xl p-2 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 mb-6 text-sm relative z-20 shadow-lg">
                                {/* ... Toolbars ... */}
                                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start w-full sm:w-auto">
                                    <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#262626]">
                                        <button 
                                        onClick={() => setMode('divergent')}
                                        className={`px-3 md:px-4 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${mode === 'divergent' ? 'bg-[#262626] text-cinema-accent shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                        title="AI expands on your idea creatively (润色/扩写)"
                                        >
                                        <Sparkles size={12} /> <span className="hidden sm:inline">发散模式</span> <span className="sm:hidden">发散</span>
                                        </button>
                                        <button 
                                        onClick={() => setMode('logic')}
                                        className={`px-3 md:px-4 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-medium ${mode === 'logic' ? 'bg-[#262626] text-cinema-accent shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                        title="AI strictly follows input text (严格遵循)"
                                        >
                                        <Settings size={12} /> <span className="hidden sm:inline">逻辑模式</span> <span className="sm:hidden">逻辑</span>
                                        </button>
                                    </div>
                                    
                                    <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#262626]">
                                        <button 
                                        onClick={() => setLang('zh')}
                                        className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium ${lang === 'zh' ? 'bg-[#262626] text-white' : 'text-gray-500'}`}
                                        >
                                        中文
                                        </button>
                                        <button 
                                        onClick={() => setLang('en')}
                                        className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium ${lang === 'en' ? 'bg-[#262626] text-white' : 'text-gray-500'}`}
                                        >
                                        EN
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsRatioOpen(!isRatioOpen)}
                                            className="flex items-center gap-2 bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:border-gray-500 transition-all min-w-[100px] justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <MonitorPlay size={12} />
                                                <span className="font-mono">{aspectRatio}</span>
                                            </div>
                                            <span className={`text-[10px] transform transition-transform ${isRatioOpen ? 'rotate-180' : ''}`}>▼</span>
                                        </button>

                                        {isRatioOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-full bg-[#171717] border border-[#262626] rounded-lg shadow-xl overflow-hidden z-50 flex flex-col py-1">
                                                {aspectRatios.map(ratio => (
                                                    <button
                                                        key={ratio}
                                                        onClick={() => {
                                                            setAspectRatio(ratio);
                                                            setIsRatioOpen(false);
                                                        }}
                                                        className={`px-3 py-1.5 text-xs text-left font-mono hover:bg-[#262626] transition-colors ${aspectRatio === ratio ? 'text-cinema-accent' : 'text-gray-400'}`}
                                                    >
                                                        {ratio}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-1 border border-[#262626]">
                                        <button 
                                        onClick={() => setShotCountMode('auto')}
                                        className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium ${shotCountMode === 'auto' ? 'bg-[#262626] text-white' : 'text-gray-500'}`}
                                        >
                                        自动
                                        </button>
                                        <button 
                                        onClick={() => setShotCountMode('custom')}
                                        className={`px-3 py-1.5 rounded-md transition-all text-xs font-medium ${shotCountMode === 'custom' ? 'bg-[#262626] text-white' : 'text-gray-500'}`}
                                        >
                                        自定义
                                        </button>
                                        
                                        {shotCountMode === 'custom' && (
                                            <div className="flex items-center border-l border-[#333] pl-2 ml-1">
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={50}
                                                value={customShotCount}
                                                onChange={(e) => setCustomShotCount(parseInt(e.target.value) || 1)}
                                                className="w-12 bg-transparent text-center text-cinema-accent font-mono text-xs focus:outline-none"
                                            />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full max-w-4xl relative group">
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cinema-accent/20 to-purple-500/20 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                <div className="relative bg-[#0a0a0a] border border-[#262626] rounded-2xl p-4 md:p-6 shadow-2xl min-h-[18rem] flex flex-col">
                                
                                {(selectedGenre || selectedStyle) && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {selectedGenre && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-cinema-accent/10 text-cinema-accent text-xs font-bold rounded border border-cinema-accent/20">
                                                {selectedGenre}
                                                <button onClick={() => removeTag('genre')} className="hover:text-white"><X size={10} /></button>
                                            </span>
                                        )}
                                        {selectedStyle && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded border border-green-500/20">
                                                {selectedStyle}
                                                <button onClick={() => removeTag('style')} className="hover:text-white"><X size={10} /></button>
                                            </span>
                                        )}
                                    </div>
                                )}

                                <textarea
                                    ref={textAreaRef}
                                    className="w-full flex-1 bg-transparent text-base md:text-lg text-gray-200 placeholder-gray-700 focus:outline-none resize-none font-light leading-relaxed"
                                    placeholder="输入您的创意，或粘贴剧本内容... (例如：@凌玲 在赛博朋克城市的霓虹街道上...)"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                />
                                
                                <div className="absolute bottom-4 left-4">
                                    <input 
                                        type="file" 
                                        ref={fileUploadRef}
                                        className="hidden" 
                                        accept=".txt,.md,.json,.csv"
                                        onChange={handleFileUpload} 
                                    />
                                    <button 
                                        onClick={() => fileUploadRef.current?.click()}
                                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors bg-[#171717] px-3 py-1.5 rounded-full border border-[#333] hover:border-gray-500"
                                    >
                                        <Upload size={12} />
                                        <span className="hidden sm:inline">导入文件 (.txt/.md)</span> <span className="sm:hidden">导入</span>
                                    </button>
                                </div>

                                <div className="absolute bottom-4 right-4 text-xs text-gray-600 font-mono">
                                    {inputText.length} chars
                                </div>
                                </div>
                            </div>
                            </div>

                            <div className="w-full max-w-4xl mt-6 space-y-4">
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <button 
                                    onClick={() => setShowLibrary(true)}
                                    className="bg-[#1a1a1a] border border-[#262626] text-cinema-accent px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center sm:justify-start gap-2 hover:bg-[#262626] hover:text-white transition-colors shadow-md group w-full sm:w-auto"
                                >
                                    <Users size={14} className="group-hover:scale-110 transition-transform"/> 
                                    角色库 ({libraryCharacters.length})
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <span className="text-cinema-accent text-sm font-bold min-w-[80px]">题材设定</span>
                                <div className="flex flex-wrap gap-2">
                                    {genres.map(g => {
                                    const isSelected = selectedGenre === g;
                                    return (
                                        <button 
                                        key={g} 
                                        onClick={() => toggleGenre(g)}
                                        className={`px-3 py-1 rounded-md text-xs border transition-all duration-200 ${
                                            isSelected 
                                            ? 'bg-cinema-accent text-black border-cinema-accent font-bold shadow-lg shadow-cinema-accent/20 opacity-0 hidden' // Hide from list if selected
                                            : 'bg-[#171717] border-[#262626] text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                        style={{ display: isSelected ? 'none' : 'block' }} // Remove visually to prevent duplicates
                                        >
                                        + {g}
                                        </button>
                                    );
                                    })}
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                                <span className="text-blue-400 text-sm font-bold min-w-[80px] pt-1.5">画风类型</span>
                                
                                <div className="relative w-full sm:w-auto" ref={styleDropdownRef}>
                                    <button
                                        onClick={() => setIsStyleOpen(!isStyleOpen)}
                                        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold border flex items-center justify-between sm:justify-start gap-2 transition-all ${
                                            selectedStyle 
                                            ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                                            : 'bg-[#171717] border-[#262626] text-gray-400 hover:text-white hover:border-gray-500'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Palette size={14} />
                                            {selectedStyle || "选择画风类型 (Art Style)"}
                                        </div>
                                        {isStyleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>

                                    {isStyleOpen && (
                                        <>
                                            {/* Backdrop */}
                                            <div 
                                                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsStyleOpen(false);
                                                }}
                                            ></div>

                                            <div className={`
                                                /* Mobile: Bottom Sheet */
                                                fixed bottom-0 left-0 w-full max-h-[95vh] rounded-t-2xl border-t border-[#333] bg-[#1a1a1a] z-[100] 
                                                flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
                                                transition-transform duration-300 ease-out transform translate-y-0

                                                /* Desktop: Dropdown optimized for "Show All" */
                                                md:absolute md:bottom-auto md:left-0 md:top-full md:translate-y-2 
                                                md:w-[1000px] md:h-[600px] md:rounded-xl md:border md:border-[#333] md:shadow-2xl
                                            `}>
                                                {/* Mobile Header (Hidden on Desktop) */}
                                                <div className="md:hidden flex justify-between items-center p-4 border-b border-[#333] bg-[#1a1a1a] sticky top-0 z-10 rounded-t-2xl">
                                                    <span className="text-white font-bold flex items-center gap-2 text-sm">
                                                        <Palette size={16} className="text-green-400"/> 选择画风类型
                                                    </span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsStyleOpen(false);
                                                        }} 
                                                        className="p-1.5 bg-[#222] rounded-full text-gray-400 hover:text-white"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>

                                                {/* Content Area - Optimized for all screen sizes */}
                                                <div className="overflow-y-auto custom-scrollbar p-4 md:p-6">
                                                    {/* Main Categories */}
                                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                                                        {Object.entries(STYLE_CATEGORIES).map(([category, styles]) => (
                                                            <button
                                                                key={category}
                                                                onClick={() => {
                                                                    // Toggle expanded category
                                                                    setExpandedCategory(expandedCategory === category ? null : category);
                                                                }}
                                                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold border transition-all ${
                                                                    selectedStyle && styles.includes(selectedStyle) 
                                                                    ? 'bg-green-500/10 border-green-500 text-green-400' 
                                                                    : 'bg-[#222] border-[#333] text-gray-400 hover:bg-[#333] hover:text-white hover:border-gray-500'}
                                                                `}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span>{category}</span>
                                                                    <span className={`text-xs opacity-70 transition-transform ${expandedCategory === category ? 'rotate-180' : ''}`}>
                                                                        ▼
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Subcategories */}
                                                    {expandedCategory && (
                                                        <div className="mt-4 border-t border-[#333] pt-4">
                                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
                                                                {expandedCategory}风格选项
                                                            </h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                                {STYLE_CATEGORIES[expandedCategory].map(s => (
                                                                    <button
                                                                        key={s}
                                                                        onClick={() => {
                                                                            selectStyle(s);
                                                                            setIsStyleOpen(false);
                                                                        }}
                                                                        className={`px-3 py-2 rounded-md text-xs border transition-all duration-200 whitespace-nowrap ${
                                                                            selectedStyle === s 
                                                                            ? 'bg-green-600 text-white border-green-500 font-bold shadow-[0_2px_8px_rgba(34,197,94,0.4)]' 
                                                                            : 'bg-[#222] border-[#333] text-gray-400 hover:bg-[#333] hover:text-white hover:border-gray-500'}
                                                                        `}
                                                                    >
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Mobile Safe Area Spacer */}
                                                <div className="h-6 md:hidden"></div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            </div>

                            <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full px-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={!inputText.trim()}
                                className="w-full sm:w-auto group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-[#171717] font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cinema-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                <div className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></div>
                                <span className="relative flex items-center gap-3 text-lg px-8">
                                    <Sparkles className="w-5 h-5 text-cinema-accent" /> 
                                    开始生成分镜
                                </span>
                                <div className="absolute inset-0 rounded-full ring-1 ring-white/10 group-hover:ring-cinema-accent/50 transition-all"></div>
                            </button>

                            <button
                                onClick={() => { if(checkAuth()) setStep(AppStep.COMIC_GENERATOR); }}
                                className="w-full sm:w-auto group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-[#171717] font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed border border-pink-900/50 hover:bg-pink-900/20"
                                >
                                <span className="relative flex items-center gap-3 text-lg px-4 text-pink-500 group-hover:text-pink-400 transition-colors">
                                    <BookOpen className="w-5 h-5" /> 
                                    生成漫画
                                </span>
                            </button>
                            </div>

                        </div>
                        )}

                        {/* Step 2: Analyzing (Creative Loading Screen) */}
                        {step === AppStep.ANALYZING && (
                        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col items-center justify-center animate-fade-in text-center p-8">
                            
                            {errorMsg ? (
                                <div className="flex flex-col items-center max-w-md text-center p-8 bg-[#171717] border border-red-900/50 rounded-2xl shadow-2xl">
                                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                        <AlertCircle className="text-red-500" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">生成失败</h3>
                                    <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setStep(AppStep.INPUT)}
                                            className="px-6 py-2 rounded-lg border border-[#333] text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                                        >
                                            返回修改
                                        </button>
                                        <button 
                                            onClick={handleAnalyze}
                                            className="px-6 py-2 rounded-lg bg-cinema-accent text-black font-bold hover:bg-yellow-400 transition-colors"
                                        >
                                            重试
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    {/* Creative Visual */}
                                    <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                                        <div className="absolute inset-0 border-4 border-cinema-accent/10 rounded-full animate-ping [animation-duration:3s]"></div>
                                        <div className="absolute inset-8 border-4 border-blue-500/10 rounded-full animate-ping [animation-duration:2s]"></div>
                                        <div className="absolute inset-0 rounded-full border border-cinema-accent/30 animate-[spin_10s_linear_infinite]"></div>
                                        <div className="absolute inset-4 rounded-full border border-blue-500/30 animate-[spin_8s_linear_infinite_reverse]"></div>
                                        
                                        <FancyLoader type="analyzing" size="lg" />
                                    </div>
                                    
                                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-wider animate-pulse">
                                        AI 导演正在创作中...
                                    </h2>
                                    
                                    <div className="h-8 flex items-center justify-center">
                                        <p className="text-cinema-accent font-mono text-sm tracking-wide">
                                            {loadingMessage}
                                        </p>
                                    </div>
                                    
                                    {/* Indeterminate Progress Bar */}
                                    <div className="w-80 h-1 bg-[#222] rounded-full mt-8 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cinema-accent to-transparent w-1/2 h-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Step 3: Result Dashboard */}
                        {step === AppStep.RESULT && data && (
                        <div className="animate-fade-in-up">
                            
                            <div className="flex items-center justify-between mb-8 no-print">
                            <button onClick={handleReset} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
                                <ArrowLeft size={16} /> 返回编辑器
                            </button>
                            <div className="flex gap-2 md:gap-3">
                                <button 
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#171717] border border-[#262626] rounded-lg text-xs md:text-sm text-gray-300 hover:text-white hover:border-cinema-accent transition-colors"
                                >
                                    <Download size={16} /> <span className="hidden sm:inline">导出 PDF</span>
                                </button>
                                <button 
                                    onClick={() => setStep(AppStep.FULL_MOVIE)}
                                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-cinema-accent text-black font-bold rounded-lg text-xs md:text-sm hover:bg-yellow-400 transition-colors"
                                >
                                    <Film size={16} /> <span className="hidden sm:inline">生成全片视频</span><span className="sm:hidden">生成全片</span>
                                </button>
                            </div>
                            </div>

                            <div className="mb-12 text-center">
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">{data.title}</h1>
                            <div className="inline-block relative">
                                <div className="absolute -inset-2 bg-cinema-accent/10 blur-lg rounded-full no-print"></div>
                                <p className="relative text-gray-400 max-w-2xl mx-auto leading-relaxed text-base md:text-lg italic px-4">
                                    "{data.synopsis}"
                                </p>
                            </div>
                            {(selectedGenre || selectedStyle) && (
                                <div className="flex items-center justify-center gap-2 mt-4 no-print">
                                    {selectedGenre && <span className="px-3 py-1 bg-[#171717] border border-cinema-accent/30 text-cinema-accent rounded-full text-xs font-bold">{selectedGenre}</span>}
                                    {selectedStyle && <span className="px-3 py-1 bg-[#171717] border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold">{selectedStyle}</span>}
                                </div>
                            )}
                            </div>

                            <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8 print-break-inside-avoid">
                                
                                {/* CAST */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-cinema-accent border-b border-[#262626] pb-2 mb-4">
                                        <Users size={18} />
                                        <h2 className="text-lg font-bold tracking-widest uppercase">Cast / 角色表</h2>
                                    </div>
                                    <div className="space-y-4">
                                        {characters.map((char, idx) => (
                                            <div key={idx} 
                                                className={`bg-[#171717] border rounded-xl p-4 flex gap-4 transition-colors cursor-zoom-in print-card ${char.error ? 'border-red-500/50' : 'border-[#262626] hover:border-cinema-accent/30'}`}
                                                onClick={() => char.imageUrl && setSelectedImage(char.imageUrl)}
                                            >
                                                <div className="w-24 h-24 bg-black rounded-lg flex-shrink-0 overflow-hidden border border-[#333] relative">
                                                    {char.imageUrl ? (
                                                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                                    ) : char.error ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-red-500 bg-red-900/10 gap-1 p-1 text-center">
                                                            <AlertCircle size={20} />
                                                            <span className="text-[10px] leading-tight">{char.error.includes("credits") ? "No Credits" : "Failed"}</span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRetryCharacterImage(idx); }}
                                                                className="mt-1 p-1 bg-red-800 rounded text-white hover:bg-red-700"
                                                                title="Retry"
                                                            >
                                                                <RefreshCw size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                        {char.isGeneratingImage ? <div className="w-4 h-4 border-2 border-cinema-accent border-t-transparent rounded-full animate-spin no-print"></div> : <User size={24} />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline justify-between mb-2">
                                                        <h3 className="text-white font-bold text-lg">{char.name}</h3>
                                                        <span className="text-[10px] text-gray-500 font-mono bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#222]">CHARACTER</span>
                                                    </div>
                                                    <div className="space-y-1 text-xs text-gray-400 leading-relaxed">
                                                        <p><span className="text-gray-600 font-bold">主体：</span>{char.subjectDescription}</p>
                                                        <p><span className="text-gray-600 font-bold">背景：</span>{char.background}</p>
                                                        <p><span className="text-gray-600 font-bold">性格：</span>{char.personality}</p>
                                                        <p><span className="text-gray-600 font-bold">道具：</span>{char.coreProps}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SCENES */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-400 border-b border-[#262626] pb-2 mb-4">
                                        <MapPin size={18} />
                                        <h2 className="text-lg font-bold tracking-widest uppercase">Scenes / 场景表</h2>
                                    </div>
                                    <div className="space-y-4">
                                        {data.scenes.map((scene, idx) => (
                                            <div key={idx} className="bg-[#171717] border border-[#262626] rounded-xl p-4 hover:border-blue-500/30 transition-colors print-card">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="text-gray-200 font-bold">{scene.location}</h3>
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/30">{scene.timeOfDay}</span>
                                                        <span className="text-[10px] text-purple-300 bg-purple-900/20 px-2 py-0.5 rounded border border-purple-900/30">{scene.mood}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono bg-[#0a0a0a] p-2 rounded border border-[#222]">
                                                    <span className="text-gray-600 font-bold block mb-1">VISUAL PROMPT (ZH):</span>
                                                    {scene.visualPrompt}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#262626]">
                                    <div className="bg-cinema-accent text-black p-1 rounded">
                                        <Film size={20} /> 
                                    </div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Storyboard Sequences</h2>
                                    <div className="ml-auto flex items-center gap-2 md:gap-4">
                                        <div className="text-xs text-gray-500 font-mono border border-[#333] px-2 py-1 rounded hidden sm:block">
                                            ASPECT RATIO: {aspectRatio}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono border border-[#333] px-2 py-1 rounded">
                                            TOTAL SHOTS: {shots.length}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                {shots.map((shot) => (
                                    <div key={shot.id} className="print-break-inside-avoid print-card-wrapper">
                                        <ShotCard 
                                        shot={shot} 
                                        onRegenerateImage={generateSingleShotImage}
                                        onGenerateVideo={(id) => handleOpenVideoModal(id)} 
                                        onImageClick={(url) => setSelectedImage(url)} 
                                        onUpdateShot={updateShotState}
                                        />
                                    </div>
                                ))}
                                </div>
                                
                                <div className="flex items-center justify-center gap-4 py-16 opacity-30 no-print">
                                <div className="h-px bg-gray-700 w-32"></div>
                                <Clapperboard size={20} className="text-gray-500" />
                                <div className="h-px bg-gray-700 w-32"></div>
                                </div>
                            </div>

                        </div>
                        )}

                    </main>
                </>
            )}
        </div>
      )}
      </>
  );
};

export default App;
