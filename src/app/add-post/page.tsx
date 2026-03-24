import type { Metadata } from 'next';
import AuthGuard from '@/components/AuthGuard';
import Container from '@/components/Container';
import PostForm from '@/components/PostForm';

export const metadata: Metadata = { title: 'New Post – Blogging Web' };

export default function AddPostPage() {
  return (
    <AuthGuard authentication={true}>
      <div className="py-12">
        <Container>
          <div className="mb-10 gsap-fade-up">
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2 text-muted">
              New Story
            </p>
            <h1 className="text-4xl font-display">Write something great.</h1>
          </div>
          <PostForm />
        </Container>
      </div>
    </AuthGuard>
  );
}
