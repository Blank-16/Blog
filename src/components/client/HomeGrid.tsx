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
    const cards = gridRef.current?.querySelectorAll<HTMLElement>('.post-card-item');
    if (!cards || cards.length === 0) return;

    cards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            setTimeout(() => {
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            }, Number(el.dataset.index ?? 0) * 55);
            observer.unobserve(el);
          }
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
