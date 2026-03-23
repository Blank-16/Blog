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
      <div className="w-full py-8 text-center">
        <Container>
          <p className="text-gray-400">Loading post...</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container>
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
