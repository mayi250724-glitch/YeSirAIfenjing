
import React, { useState, useEffect, useRef } from 'react';
import { Shot } from '../types';
import * as GeminiService from '../services/geminiService';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Film, Loader2, CheckCircle, AlertCircle, Download, RefreshCw, AlertTriangle, Scissors } from 'lucide-react';
import VideoGenerationModal from './VideoGenerationModal';
import FancyLoader from './FancyLoader';

interface FullMovieViewProps {
  shots: Shot[];
  aspectRatio: string;
  onUpdateShot: (shotId: number, updates: Partial<Shot>) => void;
  onBack: () => void;
  onEdit: () => void; // New prop
}

const FullMovieView: React.FC<FullMovieViewProps> = ({ shots, aspectRatio, onUpdateShot, onBack, onEdit }) => {
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeShotForVideo, setActiveShotForVideo] = useState<Shot | null>(null);
  const [activePrevShotImage, setActivePrevShotImage] = useState<string | null>(null);

  // Calculate stats
  const totalShots = shots.length;
  const completedVideos = shots.filter(s => s.videoUrl).length;
  const progress = Math.round((completedVideos / totalShots) * 100);

  // Auto-play logic for sequential playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (currentShotIndex < shots.length - 1) {
        setCurrentShotIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [currentShotIndex, shots.length]);

  // Auto-play when index changes if we were playing
  useEffect(() => {
    const video = videoRef.current;
    if (video && isPlaying && shots[currentShotIndex].videoUrl) {
       video.src = shots[currentShotIndex].videoUrl!;
       video.play().catch(e => console.log("Autoplay blocked", e));
    } else if (video && !shots[currentShotIndex].videoUrl) {
       setIsPlaying(false);
    }
  }, [currentShotIndex, isPlaying, shots]);


  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !shots[currentShotIndex].videoUrl) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const openGenerationModal = (shot: Shot) => {
    if (shot.isGeneratingVideo) return;
    
    // Determine previous shot image
    const index = shots.findIndex(s => s.id === shot.id);
    let prevImage: string | null = null;
    if (index > 0) {
        const prevShot = shots[index - 1];
        prevImage = prevShot.lastFrameImageUrl || prevShot.imageUrl || null;
    }

    setActiveShotForVideo(shot);
    setActivePrevShotImage(prevImage);
    setShowVideoModal(true);
  };

  // Next Shot Logic for Modal
  const handleNextVideoModal = () => {
    if (!activeShotForVideo) return;
    const currentIndex = shots.findIndex(s => s.id === activeShotForVideo.id);
    if (currentIndex >= 0 && currentIndex < shots.length - 1) {
        const nextShot = shots[currentIndex + 1];
        openGenerationModal(nextShot);
    }
  };

  // Check if there is a next shot
  const hasNextShot = activeShotForVideo 
      ? shots.findIndex(s => s.id === activeShotForVideo.id) < shots.length - 1
      : false;

  const handleConfirmGenerateVideo = async (shotId: number, params: { prompt: string; firstFrameImage?: string; aspectRatio: string; model: string; lastFrameImage?: string; duration: number }) => {
      const shot = shots.find(s => s.id === shotId);
      if (!shot) return;

      const imageToUse = params.firstFrameImage;

      onUpdateShot(shotId, { isGeneratingVideo: true, generationProgress: 0, error: undefined, generationStatus: 'starting' });
      
      try {
        const videoUrl = await GeminiService.generateVideo(
            params.prompt, 
            imageToUse, 
            params.aspectRatio, 
            params.model,
            (prog, status) => {
                onUpdateShot(shotId, { generationProgress: prog, generationStatus: status });
            },
            params.lastFrameImage, // Pass last frame
            params.duration // Pass duration
        );
        onUpdateShot(shotId, { videoUrl, isGeneratingVideo: false, generationProgress: undefined, generationStatus: undefined });
      } catch (error: any) {
        console.error(`Failed to generate video for shot ${shotId}`, error);
        onUpdateShot(shotId, { isGeneratingVideo: false, generationProgress: undefined, error: error.message || "Generation failed" });
      }
  };

  const handleStartBatch = async () => {
    if (isBatchGenerating) return;
    setIsBatchGenerating(true);

    // Process sequentially
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      // Skip if already has video or is currently generating
      if (shot.videoUrl || shot.isGeneratingVideo) continue;

      // Determine previous shot image for continuity in batch mode!
      let batchPrevImage: string | undefined = undefined;
      if (i > 0) {
          const prev = shots[i - 1];
          // Use previous shot's last frame upload if exists, otherwise its storyboard image
          batchPrevImage = prev.lastFrameImageUrl || prev.imageUrl;
      }
      
      // Default to using current image if no previous image available (first shot) OR if previous shot had no image
      // Ideally, batch mode should try to use 'continuity' logic (previous tail) where possible.
      // If batchPrevImage exists, we prioritize it. If not, we fall back to shot.imageUrl.
      const imageToUse = batchPrevImage || shot.imageUrl;

      // Start generation (using default/automatic parameters for batch)
      onUpdateShot(shot.id, { isGeneratingVideo: true, generationProgress: 0, error: undefined, generationStatus: 'starting' });

      try {
        const prompt = shot.visualDescriptionEn || shot.contentEn || "Cinematic shot";
        
        const videoUrl = await GeminiService.generateVideo(
            prompt, 
            imageToUse, 
            aspectRatio,
            'veo3.1-fast', // Batch default
            (prog, status) => {
                onUpdateShot(shot.id, { generationProgress: prog, generationStatus: status });
            },
            undefined, // no last frame for batch
            5 // Default duration
        );
        
        onUpdateShot(shot.id, { videoUrl, isGeneratingVideo: false, generationProgress: undefined, generationStatus: undefined });
        
        // Rate Limit Safeguard
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`Failed to generate video for shot ${shot.id}`, error);
        // Mark as failed but continue to next shot
        onUpdateShot(shot.id, { 
            isGeneratingVideo: false, 
            generationProgress: undefined, 
            error: error.message || "Batch generation failed"
        });
        // Small delay even on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsBatchGenerating(false);
  };

  const handleShotClick = (index: number) => {
    setCurrentShotIndex(index);
    setIsPlaying(false);
  };

  const currentShot = shots[currentShotIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col animate-fade-in">
      
      {/* Video Modal */}
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

      {/* Header */}
      <div className="h-16 border-b border-[#262626] bg-[#141414] px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Film className="text-cinema-accent" /> <span className="hidden sm:inline">全片预览 Studio</span><span className="sm:hidden">预览</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
           <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 font-mono uppercase hidden sm:block">Render Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-16 md:w-32 h-1.5 bg-[#333] rounded-full overflow-hidden">
                   <div className="h-full bg-cinema-accent transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs font-bold text-cinema-accent">{completedVideos}/{totalShots}</span>
              </div>
           </div>
           
           {completedVideos < totalShots && (
               <button 
                onClick={handleStartBatch}
                disabled={isBatchGenerating}
                className={`px-3 md:px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition-all ${isBatchGenerating ? 'bg-[#333] text-gray-500 cursor-not-allowed' : 'bg-cinema-accent text-black hover:bg-yellow-400'}`}
               >
                 {isBatchGenerating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                 <span className="hidden sm:inline">{isBatchGenerating ? '渲染中...' : '批量渲染'}</span>
               </button>
           )}

            <div className="h-6 w-px bg-[#333] hidden sm:block"></div>

           {/* Go to Editor Button */}
           <button 
             onClick={onEdit}
             className="px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
           >
             <Scissors size={16} /> <span className="hidden sm:inline">去合成剪辑</span>
           </button>
           
           <button className="p-2 text-gray-400 hover:text-white border border-[#333] rounded-lg hidden sm:block">
             <Download size={18} />
           </button>
        </div>
      </div>

      {/* Main Layout: Stack on Mobile, Row on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Main Player Area */}
        <div className="flex-1 bg-black relative flex flex-col order-1 lg:order-1 h-[50vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-[#262626]">
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
                {currentShot?.videoUrl ? (
                    <video 
                        ref={videoRef}
                        src={currentShot.videoUrl}
                        className="max-w-full max-h-full shadow-2xl"
                        controls={false} // Custom controls
                        poster={currentShot.imageUrl}
                        playsInline
                        onClick={togglePlay}
                    />
                ) : (
                   <div className="aspect-video w-full max-w-4xl bg-[#111] border border-[#222] rounded-xl flex flex-col items-center justify-center text-gray-600 relative overflow-hidden">
                       
                       {/* Background Image (Faint) */}
                       {currentShot?.imageUrl && (
                            <img src={currentShot.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
                       )}

                       {/* Content Overlay */}
                       <div className="z-10 flex flex-col items-center justify-center max-w-md text-center p-6 bg-black/60 rounded-xl backdrop-blur-md border border-[#333]">
                           
                           {currentShot?.isGeneratingVideo ? (
                               <>
                                 <FancyLoader type="video" size="sm" />
                                 <p className="font-mono text-sm tracking-widest text-white mb-2 uppercase mt-4">
                                    {currentShot.generationStatus || 'PROCESSING'} SCENE {currentShot.shotNumber}
                                 </p>
                                 <div className="w-48 h-1 bg-[#333] rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="h-full bg-cinema-accent transition-all duration-300"
                                        style={{ width: `${currentShot.generationProgress || 0}%` }}
                                    ></div>
                                 </div>
                                 <span className="text-xs font-mono text-cinema-accent">{currentShot.generationProgress || 0}%</span>
                               </>
                           ) : currentShot?.error ? (
                               <>
                                 <AlertTriangle size={48} className="text-red-500 mb-4" />
                                 <h3 className="text-white font-bold mb-1">Generation Failed</h3>
                                 <p className="text-xs text-red-300 mb-4 line-clamp-2">{currentShot.error}</p>
                                 <button 
                                    onClick={() => openGenerationModal(currentShot)}
                                    className="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-500/50 rounded-lg text-red-200 text-sm font-bold flex items-center gap-2 transition-colors"
                                 >
                                    <RefreshCw size={14} /> Retry This Shot
                                 </button>
                               </>
                           ) : (
                               <>
                                 <div className="w-16 h-16 rounded-full bg-[#222] flex items-center justify-center mb-4">
                                     <Film size={32} className="text-gray-500" />
                                 </div>
                                 <p className="text-gray-300 font-bold mb-1">Ready to Render</p>
                                 <p className="text-xs text-gray-500 mb-4">Scene {currentShot?.shotNumber} is ready for video generation</p>
                                 <button 
                                    onClick={() => openGenerationModal(currentShot!)}
                                    className="px-6 py-2 bg-cinema-accent text-black rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors"
                                 >
                                    Generate Video
                                 </button>
                               </>
                           )}
                       </div>

                   </div>
                )}
            </div>

            {/* All Videos Completed Banner */}
            {completedVideos === totalShots && (
                <div className="bg-green-900/20 border-t border-green-500/50 py-2 px-4 text-center text-green-400 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={12} />
                    所有分镜视频已生成完成，点击右上角「一键剪辑」按钮进入编辑器进行后期处理
                </div>
            )}

            {/* Custom Controls Bar */}
            <div className="h-16 md:h-20 bg-[#111] border-t border-[#222] flex items-center px-4 md:px-8 justify-between shrink-0">
               <div className="text-xs md:text-sm font-mono text-gray-500">
                 SCENE {currentShot?.shotNumber} / {totalShots}
               </div>

               <div className="flex items-center gap-4 md:gap-6">
                  <button 
                    onClick={() => setCurrentShotIndex(Math.max(0, currentShotIndex - 1))}
                    disabled={currentShotIndex === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <SkipBack size={20} fill="currentColor" />
                  </button>
                  
                  <button 
                    onClick={togglePlay}
                    disabled={!currentShot?.videoUrl}
                    className="w-10 h-10 md:w-12 md:h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                  >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                  </button>

                  <button 
                    onClick={() => setCurrentShotIndex(Math.min(totalShots - 1, currentShotIndex + 1))}
                    disabled={currentShotIndex === totalShots - 1}
                    className="text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
               </div>

               <div className="w-20 md:w-32 text-right">
                   <span className="text-cinema-accent text-xs md:text-sm font-bold">{currentShot?.duration}</span>
               </div>
            </div>
        </div>

        {/* Sidebar Playlist: Bottom on mobile, Right on desktop */}
        <div className="w-full lg:w-80 h-full lg:h-auto border-t lg:border-t-0 bg-[#0f0f0f] flex flex-col order-2 lg:order-2">
            <div className="p-3 md:p-4 border-b border-[#262626]">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Timeline Sequence</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                {shots.map((shot, idx) => (
                    <div 
                        key={shot.id}
                        onClick={() => handleShotClick(idx)}
                        className={`p-3 border-b border-[#222] flex gap-3 cursor-pointer transition-colors ${currentShotIndex === idx ? 'bg-[#262626]' : 'hover:bg-[#1a1a1a]'}`}
                    >
                        {/* Thumbnail */}
                        <div className={`w-20 md:w-24 aspect-video bg-black rounded overflow-hidden relative shrink-0 border ${shot.error ? 'border-red-500' : 'border-[#333]'}`}>
                            {shot.imageUrl && <img src={shot.imageUrl} className="w-full h-full object-cover" />}
                            
                            {/* Status Overlay */}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                {shot.isGeneratingVideo ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 size={16} className="text-cinema-accent animate-spin" />
                                        {shot.generationProgress !== undefined && (
                                            <span className="text-[8px] font-bold text-white mt-1">{shot.generationProgress}%</span>
                                        )}
                                    </div>
                                ) : shot.videoUrl ? (
                                    <Play size={16} className="text-white opacity-80" fill="currentColor" />
                                ) : shot.error ? (
                                    <AlertTriangle size={16} className="text-red-500" />
                                ) : null}
                            </div>
                            <span className="absolute top-0.5 left-0.5 text-[8px] bg-black/60 text-white px-1 rounded">
                                {shot.shotNumber}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={`text-xs line-clamp-2 leading-tight mb-1 ${shot.error ? 'text-red-400' : 'text-gray-300'}`}>
                                {shot.error ? 'Generation Failed' : shot.contentZh}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600">{shot.shotSize}</span>
                                {shot.videoUrl && <CheckCircle size={10} className="text-green-500" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default FullMovieView;
