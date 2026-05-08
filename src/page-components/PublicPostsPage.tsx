'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Query } from 'appwrite';
import Link from 'next/link';
import toast from 'react-hot-toast';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import HomeGrid from '@/components/client/HomeGrid';
import { toastStyle } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';

const PAGE_SIZE = 9;

async function fetchPublicPosts(afterCursor?: string): Promise<Post[]> {
  const queries: string[] = [
    Query.equal('status', 'active'),
    Query.orderDesc('$createdAt'),
    Query.limit(PAGE_SIZE),
  ];
  if (afterCursor) queries.push(Query.cursorAfter(afterCursor));
  const result = await appwriteService.getPosts(queries);
  return result ? result.documents : [];
}

export default function PublicPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicPosts().then((docs) => {
      if (cancelled) return;
      setPosts(docs);
      setHasMore(docs.length === PAGE_SIZE);
      setCursor(docs.length > 0 ? docs[docs.length - 1].$id : null);
      setLoading(false);
    }).catch((e: unknown) => {
      if (cancelled) return;
      setLoadError(getErrorMessage(e));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const docs = await fetchPublicPosts(cursor);
      setPosts((prev) => [...prev, ...docs]);
      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e), { style: toastStyle });
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-2xl font-display text-muted">Loading stories...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-sm text-red-500 mb-4">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-muted underline underline-offset-4 hover:text-ink transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-32 text-center">
        <p className="font-display text-3xl text-muted mb-6">Nothing published yet.</p>
        <Link
          href="/add-post"
          className="text-sm border border-edge px-5 py-2.5 rounded-full text-ink transition-opacity hover:opacity-60"
        >
          Write the first story &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <section className="border-b border-edge">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-muted mb-3">
              All stories
            </p>
            <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight tracking-[-0.02em] text-ink">
              Every post,
              <br />
              <em>in one place.</em>
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs text-muted underline underline-offset-4 transition-opacity hover:opacity-60 shrink-0"
          >
            &larr; Home
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <HomeGrid posts={posts} />

        {/* Scroll sentinel — triggers next page load */}
        <div ref={sentinelRef} className="h-px" />

        {loadingMore && (
          <p className="mt-10 text-center text-sm text-muted">Loading more...</p>
        )}

        {!hasMore && posts.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted tracking-widest uppercase opacity-50">
            All caught up
          </p>
        )}
      </section>
    </div>
  );
}
