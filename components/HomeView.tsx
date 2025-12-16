
import React, { useState } from 'react';
import { Clapperboard, Image as ImageIcon, Video, Wand2, LayoutGrid, FolderOpen, Heart, ChevronRight, PlayCircle, Settings, User as UserIcon, Home, Zap, X } from 'lucide-react';

interface HomeViewProps {
  onEnterStudio: () => void;
  onEnterImageGen: () => void;
  onEnterVideoGen: () => void;
  onEnterVibeAgentWorkflow: () => void;
  userAvatar?: string;
  userName?: string;
  onOpenAuth: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onEnterStudio, onEnterImageGen, onEnterVideoGen, onEnterVibeAgentWorkflow, userAvatar, userName, onOpenAuth, onOpenHistory, onOpenSettings, onOpenProfile }) => {
  const [showContactModal, setShowContactModal] = useState(false);

  // QR Code URLs for contact information
  const PUBLIC_ACCOUNT_IMG = "https://lsky.zhongzhuan.chat/i/2025/12/16/69414c449ae55.jpg"; // 关注公众号
  const SERVICE_IMG = "https://lsky.zhongzhuan.chat/i/2025/12/15/693fc147c4467.png"; // 添加客服

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] font-sans flex flex-col md:flex-row">
      
      {/* --- MOBILE HEADER (Visible only on mobile) --- */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 h-14 flex items-center justify-between px-4 sticky top-0 z-30">
         <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-600 to-blue-500 text-white p-1 rounded-md shadow-sm">
               <Clapperboard size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-blue-600">
               神笔马良
            </span>
         </div>
         <div onClick={!userName ? onOpenAuth : onOpenProfile} className="cursor-pointer">
            {userName ? (
               <img src={userAvatar} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
            ) : (
               <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-600/20">
                   登录 / 认证
               </button>
            )}
         </div>
      </header>

      {/* --- DESKTOP SIDEBAR (Hidden on mobile) --- */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col fixed h-full z-20 hidden md:flex">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
           <div className="bg-gradient-to-tr from-purple-600 to-blue-500 text-white p-1.5 rounded-lg mr-3 shadow-lg shadow-purple-500/20">
              <Clapperboard size={20} strokeWidth={2.5} />
           </div>
           <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-blue-600">
             神笔马良
           </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
           <div className="px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold flex items-center gap-3 cursor-pointer">
              <LayoutGrid size={20} />
              创作工具
           </div>
           <div className="px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium flex items-center gap-3 cursor-pointer transition-colors">
              <Heart size={20} />
              社区广场
           </div>
           <div 
              onClick={onOpenHistory}
              className="px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium flex items-center gap-3 cursor-pointer transition-colors"
           >
              <FolderOpen size={20} />
              项目管理
           </div>
           <div 
              onClick={onOpenSettings}
              className="px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium flex items-center gap-3 cursor-pointer transition-colors"
           >
              <Settings size={20} />
              系统配置
           </div>
        </nav>

        {/* User Mini Profile */}
        <div className="p-4 border-t border-gray-100 mt-auto">
            <div 
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={!userName ? onOpenAuth : onOpenProfile}
            >
                {userName ? (
                    <>
                        <img src={userAvatar} alt="User" className="w-10 h-10 rounded-full border border-gray-200" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate">{userName}</h4>
                            <span className="text-xs text-gray-400">Pro Plan</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                    </>
                ) : (
                    <>
                         <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                             <UserIcon size={18} className="text-gray-400" />
                         </div>
                         <div className="flex-1">
                            <h4 className="font-bold text-sm text-gray-700">未登录</h4>
                            <span className="text-xs text-blue-600">点击登录</span>
                         </div>
                    </>
                )}
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-[calc(100vh-56px)] md:min-h-screen pb-24 md:pb-8">
         
         {/* Top Bar */}
         <div className="flex justify-between items-center mb-6 md:mb-8">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wand2 size={24} className="text-blue-600 md:hidden" />
                创作中心
            </h1>
         </div>

         {/* Tool Cards Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
             
             {/* Card 1: VibeAgent Workflow */}
             <div 
                 className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                 onClick={onEnterVibeAgentWorkflow}
             >
                 <div className="absolute top-4 left-4 text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">AI 工作流</div>
                 <div className="mt-6 mb-3 md:mb-4 w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                     <Zap size={20} className="md:w-6 md:h-6" />
                 </div>
                 <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">VibeAgent工作流</h3>
                 <p className="text-gray-400 text-xs line-clamp-2">剧本、分镜、视频生成全自动工作流</p>
                 <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500">
                     <ChevronRight size={20} />
                 </div>
             </div>

             {/* Card 2: Movie Creation (Studio) */}
             <div 
                onClick={onEnterStudio}
                className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-blue-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
             >
                 <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                 <div className="absolute top-4 left-4 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">核心 Studio</div>
                 <div className="mt-6 mb-3 md:mb-4 w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-blue-200 shadow-lg">
                     <Clapperboard size={20} className="md:w-6 md:h-6" />
                 </div>
                 <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">电影创作</h3>
                 <p className="text-gray-400 text-xs line-clamp-2">专业级分镜设计与视频生成工作台</p>
                 <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                     <ChevronRight size={20} />
                 </div>
             </div>

             {/* Card 3: Image Gen */}
             <div 
                 onClick={onEnterImageGen}
                 className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
             >
                 <div className="absolute top-4 left-4 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">绘图工具</div>
                 <div className="mt-6 mb-3 md:mb-4 w-10 h-10 md:w-12 md:h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                     <ImageIcon size={20} className="md:w-6 md:h-6" />
                 </div>
                 <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">图片生成</h3>
                 <p className="text-gray-400 text-xs line-clamp-2">文生图、图生图、画面编辑</p>
             </div>

             {/* Card 4: Video Gen */}
             <div 
                 onClick={onEnterVideoGen}
                 className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
             >
                 <div className="absolute top-4 left-4 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Sora / Veo</div>
                 <div className="mt-6 mb-3 md:mb-4 w-10 h-10 md:w-12 md:h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                     <Video size={20} className="md:w-6 md:h-6" />
                 </div>
                 <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">视频生成</h3>
                 <p className="text-gray-400 text-xs line-clamp-2">多模型驱动的高质量视频创作</p>
             </div>
         </div>

         {/* Banner */}
         <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 md:p-6 mb-8 md:mb-10 flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden">
             <div className="z-10 w-full md:w-auto">
                 <div className="flex items-center gap-2 mb-2">
                     <div className="bg-blue-600 text-white p-1 rounded-full">
                         <Heart size={10} fill="currentColor" />
                     </div>
                     <span className="font-bold text-blue-800 text-sm">广告短剧，AI 定制</span>
                     <span className="text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">商务合作</span>
                 </div>
                 <p className="text-gray-600 text-xs md:text-sm max-w-lg mb-4 leading-relaxed">
                     从想法到成片，AI 让广告与短剧创作变得简单，让品牌故事触达千万用户。
                 </p>
                 <button 
                    onClick={() => setShowContactModal(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 w-full md:w-auto"
                 >
                     开始合作
                 </button>
             </div>
             {/* Decor */}
             <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-100/50 to-transparent pointer-events-none"></div>
         </div>

         {/* Feed Section */}
         <div className="pb-10">
             <div className="flex items-center gap-4 md:gap-6 mb-6 border-b border-gray-200 pb-2 overflow-x-auto no-scrollbar">
                 <button className="text-blue-600 font-bold border-b-2 border-blue-600 pb-2 -mb-2.5 whitespace-nowrap text-sm md:text-base">《魂荧》系列</button>
                 <button className="text-gray-400 hover:text-gray-700 font-medium pb-2 whitespace-nowrap text-sm md:text-base">精选横屏</button>
                 <button className="text-gray-400 hover:text-gray-700 font-medium pb-2 whitespace-nowrap text-sm md:text-base">精选竖屏</button>
             </div>

             <p className="text-gray-500 text-xs md:text-sm mb-6 max-w-3xl leading-relaxed">
                 郊外，一棵千年神树立于旷野之上，枝繁叶茂，高耸入云。一位年轻妇人孤身一人来此，她衣衫和头饰零乱，浑身是血，像是刚从地狱归来。一场神秘的滔天大火...
             </p>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Item 1 */}
                 <div className="group cursor-pointer">
                     <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-3 shadow-md">
                         <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">魂荧 第三集</div>
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                             <PlayCircle size={48} className="text-white drop-shadow-lg" />
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-gray-300 rounded-full overflow-hidden">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=FilmAction" />
                         </div>
                         <span className="text-xs text-gray-500">神笔马良 Official</span>
                     </div>
                 </div>

                 {/* Item 2 */}
                 <div className="group cursor-pointer">
                     <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-3 shadow-md">
                         <img src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">《藏海传·云顶天宫》续作系列</div>
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                             <PlayCircle size={48} className="text-white drop-shadow-lg" />
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-gray-300 rounded-full overflow-hidden">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Valley" />
                         </div>
                         <span className="text-xs text-gray-500">FilmValley</span>
                     </div>
                 </div>

                 {/* Item 3 */}
                 <div className="group cursor-pointer">
                     <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative mb-3 shadow-md">
                         <img src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=60" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">开元盛世，长安十二时辰</div>
                         <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                             <PlayCircle size={48} className="text-white drop-shadow-lg" />
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-gray-300 rounded-full overflow-hidden">
                             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Maker" />
                         </div>
                         <span className="text-xs text-gray-500">FilmMakerLFJ</span>
                     </div>
                 </div>
             </div>
         </div>
      </main>

      {/* --- MOBILE BOTTOM NAV (Visible only on mobile) --- */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-blue-600">
              <Home size={20} />
              <span className="text-[10px] font-medium">创作</span>
          </button>
          
          <button 
              onClick={onOpenHistory}
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-400 hover:text-gray-900"
          >
              <FolderOpen size={20} />
              <span className="text-[10px] font-medium">项目</span>
          </button>
          
          <button className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-400 hover:text-gray-900">
              <Heart size={20} />
              <span className="text-[10px] font-medium">社区</span>
          </button>

          <button 
              onClick={onOpenSettings}
              className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-400 hover:text-gray-900"
          >
              <Settings size={20} />
              <span className="text-[10px] font-medium">设置</span>
          </button>
      </nav>

      {/* --- Contact Modal --- */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowContactModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-sm">问题反馈（联系客服）</h3>
                    <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center gap-8">
                    <div className="text-center w-full">
                        <p className="text-sm font-bold text-gray-600 mb-3">关注公众号</p>
                        <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm inline-block">
                            {/* Updated to use placeholder if local file is missing */}
                            <img 
                                src={PUBLIC_ACCOUNT_IMG} 
                                onError={(e) => {
                                    // Fallback if the placeholder service fails or original intention was a specific file
                                    e.currentTarget.src = "https://placehold.co/200x200?text=QR+Code";
                                }}
                                alt="关注公众号" 
                                className="w-32 h-32 object-contain" 
                            />
                        </div>
                    </div>
                    <div className="text-center w-full">
                        <p className="text-sm font-bold text-gray-600 mb-3">添加客服</p>
                        <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm inline-block">
                            {/* Updated to use placeholder if local file is missing */}
                            <img 
                                src={SERVICE_IMG} 
                                onError={(e) => {
                                    e.currentTarget.src = "https://placehold.co/200x200?text=Customer+Service";
                                }}
                                alt="添加客服" 
                                className="w-32 h-32 object-contain" 
                            />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                    扫码获取更多支持与服务
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default HomeView;
