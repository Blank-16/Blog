import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import parse from 'html-react-parser';
import Container from '@/components/Container';
import PostActions from '@/components/PostActions';
import appwriteService from '@/lib/appwrite/appwriteService';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await appwriteService.getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };
  return { title: `${post.title} – Blogging Web` };
}

export default async function PostPage({ params }: PageProps) {
  const post = await appwriteService.getPost(params.slug);
  if (!post) notFound();

  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  return (
    <div className="py-8">
      <Container>
        <div className="w-full flex justify-center mb-4 relative rounded-xl p-2 border
          border-gray-200 dark:border-gray-700">
          {imageUrl && (
            <img
              src={imageUrl.toString()}
              alt={post.title}
              className="rounded-xl max-h-[480px] object-cover w-full"
            />
          )}
          <PostActions post={post} />
        </div>

        <div className="w-full mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{post.title}</h1>
          {post.authorName && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">By: {post.authorName}</p>
          )}
        </div>

        <div className="browser-css text-gray-800 dark:text-gray-200">
          {parse(post.content)}
        </div>
      </Container>
    </div>
  );
}
