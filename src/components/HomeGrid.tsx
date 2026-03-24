'use client';

import { useEffect, useRef } from 'react';
import PostCard from './PostCard';
import { Post } from '@/lib/appwrite/appwriteService';

interface HomeGridProps {
  posts: Post[];
}

export default function HomeGrid({ posts }: HomeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll('.post-card-item');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );
    });
  }, []);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
      style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}
    >
      {posts.map((post, i) => (
        <div key={post.$id} className="post-card-item" style={{ opacity: 0 }}>
          <PostCard {...post} index={i} />
        </div>
      ))}
    </div>
  );
}
