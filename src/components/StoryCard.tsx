'use client';

import { Story } from '@/lib/api';
import { Globe, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StoryCardProps {
  story: Story;
  rank: number;
  topComment?: string;
  theme: 'dark' | 'light';
  fontFamily: 'sans' | 'serif';
}

export function StoryCard({ story, rank, topComment, theme, fontFamily }: StoryCardProps) {
  let timeAgo = '';
  try {
    timeAgo = formatDistanceToNow(new Date(story.time * 1000), { addSuffix: true });
  } catch (e) {
    timeAgo = 'recently';
  }

  let domain = '';
  if (story.url) {
    try {
      domain = new URL(story.url).hostname.replace(/^www\./, '');
    } catch (e) {
      domain = 'web';
    }
  }

  const commentText = story.descendants === 1 ? '1 comment' : `${story.descendants || 0} comments`;
  const hnUrl = `https://news.ycombinator.com/item?id=${story.id}`;

  const themeClasses = theme === 'dark' 
    ? "bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white" 
    : "bg-gradient-to-b from-gray-100 via-white to-gray-200 text-black";
  
  const fontClass = fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  return (
    <article className={`h-screen w-full snap-start snap-always relative flex flex-col justify-center items-center p-6 md:p-8 ${themeClasses} ${fontClass} overflow-hidden select-none`}>
      
      {/* Title Area */}
      <div className="z-10 flex flex-col items-center gap-6 max-w-5xl w-full text-center -mt-20">
        
        {/* Rank Indicator */}
        <div className={`text-lg md:text-xl font-medium ${theme === 'dark' ? 'text-white/50' : 'text-black/40'} tracking-widest font-mono`}>
            #{rank}
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-2xl">
          {story.url ? (
            <a href={story.url} target="_blank" rel="noopener noreferrer" className={`${theme === 'dark' ? 'hover:text-gray-300' : 'hover:text-gray-700'} transition-colors`}>
              {story.title}
            </a>
          ) : (
            story.title
          )}
        </h1>

        {topComment && (
            <div 
                className={`w-full max-w-3xl text-lg md:text-2xl ${theme === 'dark' ? 'text-white/60' : 'text-black/60'} leading-relaxed font-medium line-clamp-3 md:line-clamp-4 italic break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_a]:break-all`}
                dangerouslySetInnerHTML={{ __html: `&quot;${topComment}&quot;` }}
            />
        )}
        
        <div className="flex flex-col items-center gap-4">
            {domain && (
                <a 
                  href={story.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-400 bg-white/5 border-white/5 hover:bg-white/10' : 'text-gray-600 bg-black/5 border-black/5 hover:bg-black/10'} text-sm md:text-base font-medium px-3 py-1 rounded-full border backdrop-blur-sm transition-colors`}
                >
                    <Globe size={14} />
                    <span>{domain}</span>
                </a>
            )}

            {/* Simple HN-style metadata linking to HN */}
            <a 
              href={hnUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`group flex items-center gap-2 ${theme === 'dark' ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'} text-xs md:text-sm font-normal tracking-wide transition-colors py-1 rounded-full`}
            >
                <div>
                    <span>{story.score} points</span>
                    <span className="mx-1 opacity-50">by</span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>{story.by}</span>
                    <span className="mx-1.5 opacity-30">|</span>
                    <span>{timeAgo}</span>
                    <span className="mx-1.5 opacity-30">|</span>
                    <span className={`font-medium ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>{commentText}</span>
                </div>
            </a>
        </div>
      </div>


    </article>
  );
}
