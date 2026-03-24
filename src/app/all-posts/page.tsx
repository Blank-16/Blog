'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import HomeGrid from '@/components/HomeGrid';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

function AllPostsContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    appwriteService
      .getPosts([])
      .then((result) => { if (result) setPosts(result.documents); })
      .finally(() => setLoading(false));
  }, []);

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
          All Stories — {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </h1>
      </div>
      <HomeGrid posts={posts} />
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
