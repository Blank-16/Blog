'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Query } from 'appwrite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AuthGuard from '@/components/client/AuthGuard';
import PostCard from '@/components/ui/PostCard';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { useAppSelector } from '@/store/hooks';
import { toastStyle } from '@/lib/utils';

const PAGE_SIZE = 9;

async function fetchUserPosts(userId: string, afterCursor?: string): Promise<Post[]> {
  const queries: string[] = [
    Query.equal('userId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(PAGE_SIZE),
  ];
  if (afterCursor) queries.push(Query.cursorAfter(afterCursor));
  const result = await appwriteService.getPosts(queries);
  return result ? result.documents : [];
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function PostCardWithActions({
  post,
  onDeleted,
}: {
  post: Post;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-cancel confirm state after 3s of no action
  useEffect(() => {
    if (!confirmDelete) return;
    confirmRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    return () => { if (confirmRef.current) clearTimeout(confirmRef.current); };
  }, [confirmDelete]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (confirmRef.current) clearTimeout(confirmRef.current);
    setDeleting(true);
    try {
      await appwriteService.adminDeletePost(post.$id);
      onDeleted(post.$id);
      toast.success('Post deleted', { style: toastStyle });
    } catch {
      toast.error('Failed to delete post', { style: toastStyle });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/edit-post/${post.urlSlug ?? post.$id}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* PostCard fills available space */}
      <div className="flex-1">
        <PostCard {...post} />
      </div>

      {/* Action bar — always visible, sits flush below card */}
      <div
        className="flex items-center border-t border-edge bg-card px-4 py-2.5 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status badge */}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border mr-auto
          ${post.status === 'active'
            ? 'border-emerald-500/30 text-emerald-500/80 bg-emerald-500/5'
            : 'border-edge text-muted'
          }`}>
          {post.status === 'active' ? 'published' : 'draft'}
        </span>

        {/* Edit */}
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
            text-muted hover:text-ink hover:bg-subtle transition-all duration-150"
        >
          <EditIcon />
          Edit
        </button>

        {/* Delete — two-tap confirm */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
            transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
            ${confirmDelete
              ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15'
              : 'text-muted hover:text-red-400 hover:bg-red-500/5'
            }`}
        >
          <TrashIcon />
          {deleting ? 'Deleting...' : confirmDelete ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

function UserPostsGrid({
  posts,
  onDeleted,
}: {
  posts: Post[];
  onDeleted: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
      divide-x divide-y divide-edge border border-edge rounded-xl overflow-hidden">
      {posts.map((post) => (
        <PostCardWithActions key={post.$id} post={post} onDeleted={onDeleted} />
      ))}
    </div>
  );
}

function AllPostsContent() {
  const userData = useAppSelector((state) => state.auth.userData);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userData) { setLoading(false); return; }
    let cancelled = false;
    fetchUserPosts(userData.$id).then((docs) => {
      if (cancelled) return;
      setPosts(docs);
      setHasMore(docs.length === PAGE_SIZE);
      setCursor(docs.length > 0 ? docs[docs.length - 1].$id : null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.$id]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || !userData || !hasMore) return;
    setLoadingMore(true);
    try {
      const docs = await fetchUserPosts(userData.$id, cursor);
      setPosts((prev) => [...prev, ...docs]);
      setHasMore(docs.length === PAGE_SIZE);
      if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, userData, hasMore]);

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

  const handleDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.$id !== id));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-2xl font-display text-muted">Loading your stories...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <p className="text-4xl mb-3 font-display">No posts yet.</p>
        <p className="text-muted mb-8">You haven&apos;t published anything yet.</p>
        <Link
          href="/add-post"
          className="inline-block px-6 py-3 text-sm font-medium border border-edge
            text-ink rounded-full transition-opacity hover:opacity-60"
        >
          Write your first story &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-1">
            Your stories
          </p>
          <h1 className="text-2xl font-display">
            {posts.length}{hasMore ? '+' : ''}{' '}
            {posts.length === 1 ? 'post' : 'posts'}
          </h1>
        </div>
        <Link
          href="/add-post"
          className="text-sm border border-edge px-4 py-2 rounded-full text-ink
            transition-opacity hover:opacity-60"
        >
          + New post
        </Link>
      </div>

      <UserPostsGrid posts={posts} onDeleted={handleDeleted} />

      <div ref={sentinelRef} className="h-px" />

      {loadingMore && (
        <p className="mt-10 text-center text-sm text-muted">Loading more...</p>
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
