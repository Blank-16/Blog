'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Container from '@/components/Container';
import PostForm from '@/components/PostForm';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

function EditPostContent() {
  const [post, setPost] = useState<Post | null>(null);
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.slug) {
      appwriteService.getPost(params.slug).then((result) => {
        if (result) setPost(result);
        else router.replace('/');
      });
    } else {
      router.replace('/');
    }
  }, [params.slug, router]);

  if (!post) {
    return (
      <div className="py-24 text-center gsap-fade-up">
        <p className="text-2xl font-display text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Container>
        <div className="mb-10 gsap-fade-up">
          <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2 text-muted">
            Editing
          </p>
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
