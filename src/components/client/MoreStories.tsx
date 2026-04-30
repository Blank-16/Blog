'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Query } from 'appwrite';
import Link from 'next/link';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import HomeGrid from '@/components/client/HomeGrid';

const PAGE_SIZE = 6;

interface MoreStoriesProps {
  initialPosts: Post[];
}

export default function MoreStories({ initialPosts }: MoreStoriesProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [cursor, setCursor] = useState<string | null>(
    initialPosts.length > 0 ? initialPosts[initialPosts.length - 1].$id : null,
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await appwriteService.getPosts([
        Query.equal('status', 'active'),
        Query.orderDesc('$createdAt'),
        Query.limit(PAGE_SIZE),
        Query.cursorAfter(cursor),
      ]);
      const docs: Post[] = result ? result.documents : [];
      setPosts((prev) => [...prev, ...docs]);
      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (posts.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[11px] tracking-[0.2em] uppercase text-muted">More stories</span>
        <Link
          href="/public-posts"
          className="text-xs text-muted underline underline-offset-4 transition-opacity hover:opacity-60"
        >
          View all &rarr;
        </Link>
      </div>

      <HomeGrid posts={posts} />

      <div ref={sentinelRef} className="h-px" />

      {loadingMore && (
        <p className="mt-10 text-center text-sm text-muted">Loading more...</p>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="mt-10 text-center text-xs text-muted tracking-widest uppercase opacity-50">
          All caught up &mdash;{' '}
          <Link href="/public-posts" className="underline underline-offset-4 hover:opacity-60">
            browse all
          </Link>
        </p>
      )}
    </section>
  );
}
