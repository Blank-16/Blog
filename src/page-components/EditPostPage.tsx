'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/client/AuthGuard';
import Container from '@/components/ui/Container';
import PostForm from '@/components/client/PostForm';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { useAppSelector } from '@/store/hooks';

function EditPostContent() {
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const authStatus = useAppSelector((state) => state.auth.status);
  const authLoading = useAppSelector((state) => state.auth.loading);

  useEffect(() => {
    if (authLoading || !authStatus) return;
    const slug = params?.slug;
    if (!slug) { router.replace('/'); return; }
    appwriteService.getPost(slug).then((result) => {
      if (result) setPost(result);
      else setNotFound(true);
    });
  }, [params?.slug, router, authStatus, authLoading]);

  if (authLoading || (!post && !notFound)) return (
    <div className="py-24 text-center">
      <p className="text-2xl font-display text-muted">Loading…</p>
    </div>
  );

  if (notFound) return (
    <div className="py-24 text-center">
      <p className="text-2xl font-display text-muted">Post not found.</p>
    </div>
  );

  if (!post) return null;

  return (
    <div className="py-12">
      <Container>
        <div className="mb-10">
          <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2 text-muted">Editing</p>
          <h1 className="text-4xl font-display">{post.title}</h1>
        </div>
        <PostForm post={post} />
      </Container>
    </div>
  );
}

export default function EditPostPage() {
  return (
    <AuthGuard authentication={true}>
      <EditPostContent />
    </AuthGuard>
  );
}
