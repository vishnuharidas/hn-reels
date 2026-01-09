export interface Story {
  id: number;
  title: string;
  by: string;
  time: number;
  url?: string;
  score: number;
  descendants: number; // comments count
  text?: string;
  type: string;
  dead?: boolean;
  deleted?: boolean;
}

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export async function fetchTopStoryIds(): Promise<number[]> {
  const res = await fetch(`${HN_BASE_URL}/topstories.json`, {
    next: { revalidate: 60 }, // Cache for 60 seconds
  });
  if (!res.ok) throw new Error('Failed to fetch story IDs');
  return res.json();
}

export async function fetchStory(id: number): Promise<Story | null> {
  const res = await fetch(`${HN_BASE_URL}/item/${id}.json`, {
    next: { revalidate: 300 }, // Cache individual stories longer
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchStories(ids: number[]): Promise<Story[]> {
  const stories = await Promise.all(ids.map(fetchStory));
  return stories.filter((s): s is Story => s !== null && s.type === 'story' && !s.dead && !s.deleted);
}
