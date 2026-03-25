import type { Metadata } from 'next';
import appwriteService from '@/lib/appwrite/appwriteService';
import PostPage from '@/pages/PostPage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await appwriteService.getPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return { title: `${post.title} – Blogging Web` };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <PostPage slug={slug} />;
}
