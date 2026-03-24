import type { Metadata } from 'next';
import AuthGuard from '@/components/AuthGuard';
import Container from '@/components/Container';
import PostForm from '@/components/PostForm';

export const metadata: Metadata = { title: 'New Post - Blog' };

export default function AddPostPage() {
  return (
    <AuthGuard authentication={true}>
      <div className="py-12">
        <Container>
          <div className="mb-10 gsap-fade-up">
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
              New Story
            </p>
            <h1 className="text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Write something great.</h1>
          </div>
          <PostForm />
        </Container>
      </div>
    </AuthGuard>
  );
}
