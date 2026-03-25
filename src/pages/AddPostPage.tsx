'use client';

import AuthGuard from '@/components/client/AuthGuard';
import Container from '@/components/ui/Container';
import PostForm from '@/components/client/PostForm';

export default function AddPostPage() {
  return (
    <AuthGuard authentication={true}>
      <div className="py-12">
        <Container>
          <div className="mb-10">
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2 text-muted">New Story</p>
            <h1 className="text-4xl font-display">Write something great.</h1>
          </div>
          <PostForm />
        </Container>
      </div>
    </AuthGuard>
  );
}
