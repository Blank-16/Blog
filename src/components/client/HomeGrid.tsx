'use client';

import { useEffect, useRef } from 'react';
import PostCard from '@/components/ui/PostCard';
import { Post } from '@/lib/appwrite/appwriteService';

interface HomeGridProps {
  posts: Post[];
}

export default function HomeGrid({ posts }: HomeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = grid.querySelectorAll<HTMLElement>('.post-card-item');
    if (cards.length === 0) return;

    // Set initial hidden state via CSS custom properties so Tailwind
    // classes on the element itself are not clobbered.
    cards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.willChange = 'opacity, transform';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.index ?? 0) * 55;
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            // Remove willChange after animation so the GPU layer is freed
            setTimeout(() => { el.style.willChange = 'auto'; }, 400 + delay);
          }, delay);
          observer.unobserve(el);
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -32px 0px' }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [posts]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-edge border border-edge rounded-xl overflow-hidden"
    >
      {posts.map((post, i) => (
        <div key={post.$id} className="post-card-item" data-index={i}>
          <PostCard {...post} index={i} />
        </div>
      ))}
    </div>
  );
}
