'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchTopStoryIds, fetchStories, fetchComment, Story } from '@/lib/api';
import { StoryCard } from './StoryCard';
import { Loader2, Settings, X, Sun, Moon, Type, Info } from 'lucide-react';

const BATCH_SIZE = 20;
const LOAD_TRIGGER_INDEX_OFFSET = 5; // Load more when 5 items from end

export function StoryReel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [allIds, setAllIds] = useState<number[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [topComments, setTopComments] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Settings State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans');
  const [showAbout, setShowAbout] = useState(false);

  // Detect mobile
  useEffect(() => {
    // Only used for theme/layout adjustments if needed in future
  }, []);

  // 1. Fetch all IDs on mount
  useEffect(() => {
    async function init() {
      try {
        const ids = await fetchTopStoryIds();
        setAllIds(ids);
        // Immediately fetch first batch
        await loadMoreStories(ids, 0);
      } catch (err) {
        console.error('Failed to init:', err);
      } finally {
        setInitialLoad(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToStory = useCallback((index: number) => {
    if (!containerRef.current) return;
    const vh = window.innerHeight;
    containerRef.current.scrollTo({
        top: index * vh,
        behavior: 'smooth'
    });
  }, []);

  // Helper to load batch
  const loadMoreStories = async (ids: number[], startIndex: number) => {
    if (startIndex >= ids.length) return;
    setLoading(true);
    
    const chunkIds = ids.slice(startIndex, startIndex + BATCH_SIZE);
    try {
        const newStories = await fetchStories(chunkIds);
        setStories(prev => [...prev, ...newStories]);
        setNextIndex(startIndex + BATCH_SIZE);
    } catch (error) {
        console.error("Error fetching stories", error);
    } finally {
        setLoading(false);
    }
  };

  // 2. Handle Scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current || loading || allIds.length === 0) return;

    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    
    // Update active index
    const newIndex = Math.round(scrollTop / clientHeight);
    if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
    }

    // Calculate index based on scroll position (approx)
    // Actually, simpler to just check distance to bottom
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    const threshold = clientHeight * LOAD_TRIGGER_INDEX_OFFSET;

    if (distanceToBottom < threshold) {
      loadMoreStories(allIds, nextIndex);
    }
  }, [allIds, loading, nextIndex, activeIndex]);

  // 3. Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!containerRef.current) return;
        
        const vh = window.innerHeight;
        
        switch (e.code) {
            case 'ArrowDown':
            case 'Space':
            case 'PageDown':
                e.preventDefault();
                containerRef.current.scrollBy({ top: vh, behavior: 'smooth' });
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                containerRef.current.scrollBy({ top: -vh, behavior: 'smooth' });
                break;
            default:
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 4. Progressively fetch Top Comment
  useEffect(() => {
    const fetchTopComment = async () => {
        // Fetch for current index + next 3
        for (let i = activeIndex; i < activeIndex + 4; i++) {
            if (!stories[i]) continue;
            
            const story = stories[i];
            // Skip if already fetched or no kids
            if (topComments[story.id] || !story.kids || story.kids.length === 0) continue;

            try {
                // Fetch the first comment
                const firstCommentId = story.kids[0];
                const comment = await fetchComment(firstCommentId);
                
                if (comment && comment.text) {
                    setTopComments(prev => ({ ...prev, [story.id]: comment.text || '' }));
                } else {
                    setTopComments(prev => ({ ...prev, [story.id]: '' }));
                }
            } catch (e) {
                console.error("Comment Fetch error", e);
                setTopComments(prev => ({ ...prev, [story.id]: '' })); 
            }
        }
    };

    if (stories.length > 0) {
        fetchTopComment();
    }
  }, [activeIndex, stories, topComments]);

  if (initialLoad) {
    return (
        <div className={`h-screen w-full flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading HackerNews Reels...</p>
        </div>
    );
  }

  return (
    <main 
        ref={containerRef}
        onScroll={handleScroll}
        className={`h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth ${theme === 'dark' ? 'bg-black' : 'bg-white'} no-scrollbar`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar Firefox/IE
    >
      <style jsx global>{`
        /* Hide scrollbar for Chrome/Safari/Opera */
        main::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {stories.map((story, index) => (
        <StoryCard 
            key={story.id} 
            story={story} 
            rank={index + 1} 
            topComment={topComments[story.id]}
            theme={theme}
            fontFamily={fontFamily}
        />
      ))}
      
      {loading && (
        <div className={`h-screen w-full snap-start flex items-center justify-center ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
             <Loader2 className="animate-spin" size={48} />
        </div>
      )}
      
      {/* Action Buttons (Bottom-Right, stacked) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {/* Settings Button */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className={`p-3 ${theme === 'dark' ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-black/10 border-black/10 text-black hover:bg-black/20'} backdrop-blur-md border rounded-full transition-all shadow-lg active:scale-95 group`}
          >
            <div className="relative">
                <Settings size={24} className="group-hover:rotate-45 transition-transform duration-500" />
            </div>
          </button>
      </div>

      {/* Settings Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <div className={`relative ${theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200`}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Settings size={20} />
                        Settings
                    </h2>
                    <button 
                        onClick={() => setIsMenuOpen(false)}
                        className={`p-2 ${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-black hover:bg-black/10'} rounded-full transition-colors`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Theme Toggle */}
                    <div className={`flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} rounded-xl border`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-500/10 text-yellow-600'} rounded-lg`}>
                                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                            </div>
                            <p className="font-medium text-sm">Theme</p>
                        </div>
                        <div className={`flex p-1 ${theme === 'dark' ? 'bg-black/40' : 'bg-gray-200'} rounded-lg`}>
                            <button 
                                onClick={() => setTheme('light')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                            >
                                Light
                            </button>
                            <button 
                                onClick={() => setTheme('dark')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${theme === 'dark' ? 'bg-zinc-800 shadow-sm text-white' : 'text-gray-500'}`}
                            >
                                Dark
                            </button>
                        </div>
                    </div>

                    {/* Font Toggle */}
                    <div className={`flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'} rounded-xl border`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/10 text-blue-600'} rounded-lg`}>
                                <Type size={18} />
                            </div>
                            <p className="font-medium text-sm">Font Style</p>
                        </div>
                        <div className={`flex p-1 ${theme === 'dark' ? 'bg-black/40' : 'bg-gray-200'} rounded-lg`}>
                            <button 
                                onClick={() => setFontFamily('sans')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${fontFamily === 'sans' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-white text-black shadow-sm') : 'text-gray-500'}`}
                            >
                                Sans
                            </button>
                            <button 
                                onClick={() => setFontFamily('serif')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${fontFamily === 'serif' ? (theme === 'dark' ? 'bg-zinc-800 text-white' : 'bg-white text-black shadow-sm') : 'text-gray-500'}`}
                            >
                                Serif
                            </button>
                        </div>
                    </div>

                    {/* About Option */}
                    <button 
                        onClick={() => { setIsMenuOpen(false); setShowAbout(true); }}
                        className={`w-full flex items-center gap-3 p-3 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'} rounded-xl border transition-colors`}
                    >
                        <div className={`p-2 ${theme === 'dark' ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/10 text-gray-600'} rounded-lg`}>
                            <Info size={18} />
                        </div>
                        <p className="font-medium text-sm text-left">About HN Reels</p>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAbout(false)} />
            <div className={`relative ${theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-black/10 text-black'} border w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200`}>
                <div className="text-center space-y-4">
                    <div className="inline-flex p-4 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20 mb-2">
                        <span className="text-3xl font-mono font-bold">Y</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">HN Reels</h2>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>
                        Experience HackerNews in a high-performance, mobile-first vertical reels format. 
                        Designed for doom-scrolling the best of tech news.
                    </p>
                    <div className="py-4 border-y border-white/5 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-orange-500">How to use</p>
                        <p className="text-sm italic opacity-80">Swipe up/down to explore.</p>
                        <p className="text-sm italic opacity-80">Click title for the article.</p>
                        <p className="text-sm italic opacity-80">Click metadata for the discussion.</p>
                    </div>
                    <button 
                        onClick={() => setShowAbout(false)}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        </div>
      )}
    </main>
  );
}
