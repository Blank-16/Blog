'use client';

import { useState, useEffect, useCallback } from 'react';
import { Query } from 'appwrite';
import Link from 'next/link';
import AuthGuard from '@/components/client/AuthGuard';
import HomeGrid from '@/components/client/HomeGrid';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { useAppSelector } from '@/store/hooks';

const PAGE_SIZE = 9;

function AllPostsContent() {
  const userData = useAppSelector((state) => state.auth.userData);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (afterCursor?: string) => {
    if (!userData) return [];
    const queries: string[] = [Query.equal('userId', userData.$id), Query.limit(PAGE_SIZE)];
    if (afterCursor) queries.push(Query.cursorAfter(afterCursor));
    const result = await appwriteService.getPosts(queries);
    return result ? result.documents : [];
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    fetchPosts().then((docs) => {
      setPosts(docs);
      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
      setLoading(false);
    });
  }, [fetchPosts, userData]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const docs = await fetchPosts(cursor);
    setPosts((prev) => [...prev, ...docs]);
    setHasMore(docs.length === PAGE_SIZE);
    if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
    setLoadingMore(false);
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <p className="text-2xl font-display text-muted">Loading your stories…</p>
    </div>
  );

  if (posts.length === 0) return (
    <div className="max-w-7xl mx-auto px-6 py-24 text-center">
      <p className="text-4xl mb-3 font-display">No posts yet.</p>
      <p className="text-muted mb-8">You haven&apos;t published anything yet.</p>
      <Link href="/add-post" className="inline-block px-6 py-3 text-sm font-medium border border-edge text-ink rounded-full transition-opacity hover:opacity-60">
        Write your first story →
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-1">Your stories</p>
          <h1 className="text-2xl font-display">{posts.length}{hasMore ? '+' : ''} {posts.length === 1 ? 'post' : 'posts'}</h1>
        </div>
        <Link href="/add-post" className="text-sm border border-edge px-4 py-2 rounded-full text-ink transition-opacity hover:opacity-60">
          + New post
        </Link>
      </div>
      <HomeGrid posts={posts} />
      {hasMore && (
        <div className="mt-12 text-center">
          <button onClick={loadMore} disabled={loadingMore}
            className="px-8 py-3 text-sm font-medium border border-edge text-ink rounded-full transition-opacity hover:opacity-60 disabled:opacity-40">
            {loadingMore ? 'Loading…' : 'Load more'}
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
