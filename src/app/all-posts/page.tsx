'use client';

import { useState, useEffect, useCallback } from 'react';
import { Query } from 'appwrite';
import AuthGuard from '@/components/AuthGuard';
import HomeGrid from '@/components/HomeGrid';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

const PAGE_SIZE = 9;

function AllPostsContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchPosts = useCallback(async (afterCursor?: string) => {
    const queries: string[] = [Query.limit(PAGE_SIZE)];
    if (afterCursor) queries.push(Query.cursorAfter(afterCursor));

    const result = await appwriteService.getPosts(queries);
    return result ? result.documents : [];
  }, []);

  useEffect(() => {
    fetchPosts().then((docs) => {
      setPosts(docs);
      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
      setLoading(false);
    });
  }, [fetchPosts]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const docs = await fetchPosts(cursor);
    setPosts((prev) => [...prev, ...docs]);
    setHasMore(docs.length === PAGE_SIZE);
    if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center gsap-fade-up">
        <p className="text-2xl font-display text-muted">Loading stories…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center gsap-fade-up">
        <p className="text-4xl mb-3 font-display">Nothing here yet.</p>
        <p className="text-muted">Be the first to create a post.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-baseline justify-between mb-10 gsap-fade-up">
        <h1 className="text-xs font-medium tracking-[0.2em] uppercase text-muted">
          All Stories — {posts.length}{hasMore ? '+' : ''} {posts.length === 1 ? 'post' : 'posts'}
        </h1>
      </div>
      <HomeGrid posts={posts} />
      {hasMore && (
        <div className="mt-12 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 text-sm font-medium border border-edge text-ink rounded-full transition-opacity hover:opacity-60 disabled:opacity-40"
          >
            {loadingMore ? 'Loading…' : 'Load more stories'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AllPostsPage() {
  return (
    <AuthGuard authentication={true}>
      <AllPostsContent />
    </AuthGuard>
  );
}
