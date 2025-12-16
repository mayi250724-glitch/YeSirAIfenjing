
export interface Character {
  id: string; // Unique ID for library management
  name: string;
  gender?: string;
  age?: string;
  tags?: string[]; // e.g. ["Cyberpunk", "Student"]
  subjectDescription: string; // 主体描述
  background: string; // 身份背景
  personality: string; // 性格特征
  coreProps: string; // 核心道具
  visualPrompt: string; // Character portrait prompt (Chinese)
  imageUrl?: string; // Generated image
  isGeneratingImage?: boolean;
  error?: string; // Error message if generation failed
}

export interface Scene {
  location: string;
  mood: string;
  timeOfDay: string;
  visualPrompt: string; // Environment prompt (Chinese)
}

export interface Shot {
  id: number;
  shotNumber: number;
  
  // Content
  contentZh: string;
  contentEn: string;
  
  // Visuals
  visualDescriptionZh: string;
  visualDescriptionEn: string;
  
  // Specs
  shotSize: string; // Bilingual string e.g. "Close-up (特写)"
  cameraMovement: string; // Bilingual string e.g. "Pan Right (右摇)"
  
  // Prompts - Bilingual
  t2iPrompt: string; // Text to Image (Chinese)
  t2iPromptEn: string; // Text to Image (English)
  
  i2vPrompt: string; // Image to Video (Chinese)
  i2vPromptEn: string; // Image to Video (English)
  
  t2vPrompt: string; // Text to Video (Chinese)
  t2vPromptEn: string; // Text to Video (English)
  
  // Audio
  narrationZh: string;
  narrationEn: string;
  audioPromptZh?: string; // BGM/SFX (Chinese)
  audioPromptEn?: string; // BGM/SFX (English)
  audioFileUrl?: string; // User uploaded audio file
  
  duration: string;
  imageUrl?: string;
  lastFrameImageUrl?: string; // Uploaded Last Frame Image
  isGeneratingImage?: boolean;

  // Video
  videoUrl?: string;
  isGeneratingVideo?: boolean;
  generationProgress?: number; // 0-100
  generationStatus?: string; // e.g., 'running', 'queued'
  error?: string; // Error message if generation failed
}

export interface StoryboardData {
  title: string;
  synopsis: string;
  characters: Character[];
  scenes: Scene[];
  shots: Shot[];
}

// --- Comic Generator Interfaces ---
export interface ComicPanel {
  id: number;
  panelNumber: number;
  description: string;
  visualPrompt: string;
  caption: string;
  imageUrl?: string;
  isGenerating?: boolean;
}

export interface ComicData {
  title: string;
  style: string;
  panels: ComicPanel[];
}

// --- Editor Interfaces ---
export enum TrackType {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
  EFFECT = 'effect'
}

export interface EditorClip {
  id: string;
  resourceId: string; // Link to raw asset
  startOffset: number; // Start time in timeline (seconds)
  duration: number; // Length in timeline (seconds)
  srcStart: number; // Start time in source file
  type: TrackType;
  name: string;
  properties?: {
    // 基础属性
    scale?: number;
    opacity?: number;
    rotation?: number;
    positionX?: number;
    positionY?: number;
    
    // 视频编辑属性
    reversed?: boolean; // 倒放
    frozen?: boolean; // 定格
    mirrored?: boolean; // 镜像
    speed?: number; // 速度调节
    
    // 色彩调节属性
    brightness?: number; // 亮度 (-100 to 100)
    contrast?: number; // 对比度 (-100 to 100)
    saturation?: number; // 饱和度 (-100 to 100)
    hue?: number; // 色调 (-180 to 180)
    sharpness?: number; // 锐化 (0 to 100)
    
    // 音频属性
    volume?: number; // 音量 (0 to 200)
    
    // 文本属性
    textContent?: string;
  }; // Scale, volume, text content, etc.
}

export interface EditorTrack {
  id: string;
  type: TrackType;
  clips: EditorClip[];
  isMuted?: boolean;
  isLocked?: boolean;
}

export enum AppStep {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  FULL_MOVIE = 'FULL_MOVIE',
  COMIC_GENERATOR = 'COMIC_GENERATOR',
  EDITOR = 'EDITOR',
  IMAGE_GEN = 'IMAGE_GEN', 
  VIDEO_GEN = 'VIDEO_GEN', // New Step
  DYNAMIC_PAGE = 'DYNAMIC_PAGE', // Dynamic Page Design Step
  VIBE_AGENT_WORKFLOW = 'VIBE_AGENT_WORKFLOW', // VibeAgent Workflow Step
}

export interface AnalyzeOptions {
  genre: string;
  style: string;
  mode: 'divergent' | 'logic';
  lang: 'zh' | 'en';
  shotCountMode: 'auto' | 'custom';
  customShotCount?: number;
  aspectRatio: string;
  libraryCharacters?: Character[]; // Pass known characters to analysis
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  textModel: string;
  imageModel: string;
  videoModel: string;
  provider: 'gemini' | 'yunwu' | 't8star' | 'tuzi'; // Added tuzi provider
}

export interface UserProfile {
  username: string;
  avatar?: string;
  phone?: string;
  email?: string;
  level: string; // e.g. "Nano Pro"
  status: string; // e.g. "Active"
  wallet?: number; // 钱包余额
  memberType?: string; // 会员类型
  registrationDate?: string; // 注册日期
  machineCode?: string; // 机器码 (MAC地址)
}
