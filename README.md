# Hacker News Reels

**Doom Scrollable Top Stories**

Hacker News Reels is a high-performance, mobile-first web application that transforms HackerNews stories into a vertical "Reels/TikTok" format. Each story occupies exactly one viewport height, allowing you to "doom scroll" through the most important tech news with ease.

## Features

- **Vertical Reels Layout:** Optimized for mobile and desktop with CSS scroll snapping.
- **Top Stories API:** Always displays the highest-ranking content from HackerNews.
- **Minimalist UI:** Focus on content with a clean, non-intrusive metadata display.
- **Infinite Scroll:** Automatically loads more stories as you scroll down.
- **Keyboard Navigation:** Support for Arrow Keys, Spacebar, and PageUp/Down.
- **Responsive Design:** Dark mode by default with glassmorphism elements.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide-React
- **Data:** HackerNews Firebase API

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

- **Scroll/Swipe:** Flick up or down to move between stories.
- **Click Title:** Opens the original article in a new tab.
- **Click Metadata:** Opens the HackerNews discussion thread.
- **Keyboard:** Use `ArrowDown` or `Space` to move to the next story.