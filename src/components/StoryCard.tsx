'use client';

import { Story } from '@/lib/api';
import { Globe, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StoryCardProps {
  story: Story;
  rank: number;
  topComment?: string;
}

export function StoryCard({ story, rank, topComment }: StoryCardProps) {
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

  return (
    <article className="h-screen w-full snap-start relative flex flex-col justify-center items-center p-6 md:p-8 bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-hidden select-none">
      
      {/* Title Area */}
      <div className="z-10 flex flex-col items-center gap-6 max-w-5xl w-full text-center -mt-20">
        
        {/* Rank Indicator */}
        <div className="text-lg md:text-xl font-medium text-white/50 tracking-widest font-mono">
            #{rank}
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-2xl">
          {story.url ? (
            <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
              {story.title}
            </a>
          ) : (
            story.title
          )}
        </h1>

        {topComment && (
            <div 
                className="w-full max-w-3xl text-lg md:text-2xl text-white/60 leading-relaxed font-medium line-clamp-3 md:line-clamp-4 italic break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_a]:break-all"
                dangerouslySetInnerHTML={{ __html: `&quot;${topComment}&quot;` }}
            />
        )}
        
        <div className="flex flex-col items-center gap-4">
            {domain && (
                <a 
                  href={story.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 text-sm md:text-base font-medium px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
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
              className="group flex items-center gap-2 text-white/40 text-xs md:text-sm font-normal tracking-wide hover:text-white/60 transition-colors py-1 rounded-full"
            >
                <div>
                    <span>{story.score} points</span>
                    <span className="mx-1 opacity-50">by</span>
                    <span className="font-medium text-white/60">{story.by}</span>
                    <span className="mx-1.5 opacity-30">|</span>
                    <span>{timeAgo}</span>
                    <span className="mx-1.5 opacity-30">|</span>
                    <span className="font-medium text-white/60">{commentText}</span>
                </div>
            </a>
        </div>
      </div>


    </article>
  );
}
