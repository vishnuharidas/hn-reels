'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchTopStoryIds, fetchStories, fetchComment, Story } from '@/lib/api';
import { StoryCard } from './StoryCard';
import { Loader2, Settings, Timer, X, Play, Pause, Circle, Maximize, Minimize } from 'lucide-react';

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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
        setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Fullscreen Logic
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            setIsFullscreen(true);
        }).catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }
  };

  // Listen for fullscreen change events (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto Scroll Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoScrollEnabled) {
        interval = setInterval(() => {
            scrollToStory(activeIndex + 1);
        }, AUTO_SCROLL_INTERVAL);
    }
    return () => clearInterval(interval);
  }, [autoScrollEnabled, activeIndex, scrollToStory]);

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
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-gray-400">Loading HackerNews Reels...</p>
        </div>
    );
  }

  return (
    <main 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black no-scrollbar"
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
        />
      ))}
      
      {loading && (
        <div className="h-screen w-full snap-start flex items-center justify-center bg-black text-white">
             <Loader2 className="animate-spin" size={48} />
        </div>
      )}
      
      {/* Action Buttons (Bottom-Right, stacked) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {/* Fullscreen Exit Indicator - Desktop Only */}
          {!isMobile && isFullscreen && (
            <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 group"
                title="Exit Full Screen"
            >
                 <div className="relative flex items-center gap-2">
                     <Minimize size={18} />
                     <span className="text-sm font-bold font-mono tracking-tighter hidden group-hover:block">Exit</span>
                 </div>
            </button>
          )}

          {/* Auto Scroll Indicator */}
          {autoScrollEnabled && (
            <button
                onClick={() => setAutoScrollEnabled(false)}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all shadow-lg active:scale-95 group"
                title="Stop Auto Scroll"
            >
                 <div className="relative flex items-center gap-2">
                     <Timer size={18} className="group-hover:hidden" />
                     <Pause size={18} className="hidden group-hover:block text-red-400" />
                     <span className="text-sm font-bold font-mono tracking-tighter">5s</span>
                 </div>
            </button>
          )}

          {/* Settings Button */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 group"
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
            <div className="relative bg-zinc-900 border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings size={20} />
                        Settings
                    </h2>
                    <button 
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Timer Option */}
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                <Timer size={20} />
                            </div>
                            <div>
                                <p className="font-medium">Auto Scroll</p>
                                <p className="text-xs text-gray-400">Next story every 5s</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                            className={`p-2 rounded-full transition-colors ${
                                autoScrollEnabled 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                            }`}
                        >
                            {autoScrollEnabled ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                    </div>

                    {/* Fullscreen Option - Desktop Only */}
                    {!isMobile && (
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium">Full Screen</p>
                                    <p className="text-xs text-gray-400">Immersive mode</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleFullscreen}
                                className={`p-2 rounded-full transition-colors ${
                                    isFullscreen 
                                        ? 'bg-purple-500 text-white hover:bg-purple-600' 
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                }`}
                            >
                                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                    )}

                    {/* Placeholder for other settings */}
                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-center">
                        <p className="text-xs text-gray-500">More settings coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </main>
  );
}
