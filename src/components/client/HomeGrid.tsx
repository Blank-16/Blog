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

    // Only pick up cards not yet animated
    const cards = grid.querySelectorAll<HTMLElement>('.post-card-item:not([data-animated])');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.animDelay ?? 0);
          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            setTimeout(() => { el.style.willChange = 'auto'; }, 400 + delay);
          }, delay);
          el.dataset.animated = 'true';
          observer.unobserve(el);
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -32px 0px' },
    );

    cards.forEach((card, i) => {
      // Stagger relative to batch position, capped so deep batches aren't sluggish
      card.dataset.animDelay = String(Math.min(i, 5) * 55);
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.willChange = 'opacity, transform';
      observer.observe(card);
    });

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
