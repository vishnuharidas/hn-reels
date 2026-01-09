'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchTopStoryIds, fetchStories, Story } from '@/lib/api';
import { StoryCard } from './StoryCard';
import { Loader2 } from 'lucide-react';

const BATCH_SIZE = 20;
const LOAD_TRIGGER_INDEX_OFFSET = 5; // Load more when 5 items from end

export function StoryReel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [allIds, setAllIds] = useState<number[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [ogData, setOgData] = useState<Record<number, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);

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

  // 4. Progressively fetch OG data
  useEffect(() => {
    const fetchOg = async () => {
        // Fetch for current index + next 3
        for (let i = activeIndex; i < activeIndex + 4; i++) {
            if (!stories[i]) continue;
            
            const story = stories[i];
            // Skip if no URL or already fetched
            if (!story.url || ogData[story.id]) continue;

            try {
                // Using microlink.io free plan for metadata
                const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(story.url)}&filter=description`);
                const data = await res.json();
                
                if (data.status === 'success' && data.data?.description) {
                    setOgData(prev => ({ ...prev, [story.id]: data.data.description }));
                } else {
                    // Mark as fetched but empty to avoid retrying immediately
                    setOgData(prev => ({ ...prev, [story.id]: '' }));
                }
            } catch (e) {
                console.error("OG Fetch error", e);
                // Mark as fetched (empty) to avoid loops
                setOgData(prev => ({ ...prev, [story.id]: '' })); 
            }
        }
    };

    if (stories.length > 0) {
        fetchOg();
    }
  }, [activeIndex, stories, ogData]);

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
            ogDescription={ogData[story.id]}
        />
      ))}
      
      {loading && (
        <div className="h-screen w-full snap-start flex items-center justify-center bg-black text-white">
             <Loader2 className="animate-spin" size={48} />
        </div>
      )}
    </main>
  );
}
