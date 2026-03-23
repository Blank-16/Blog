import type { Metadata } from 'next';
import AuthGuard from '@/components/AuthGuard';
import Container from '@/components/Container';
import PostForm from '@/components/PostForm';

export const metadata: Metadata = { title: 'Add Post – Blogging Web' };

export default function AddPostPage() {
  return (
    <AuthGuard authentication={true}>
      <div className="py-8">
        <Container>
          <PostForm />
        </Container>
      </div>
    </AuthGuard>
  );
}
