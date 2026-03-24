import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Container from '@/components/Container';
import PostActions from '@/components/PostActions';
import PostContent from '@/components/PostContent';
import appwriteService from '@/lib/appwrite/appwriteService';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const post = await appwriteService.getPost(params.slug);
  if (!post) return { title: 'Post Not Found' };
  return { title: `${post.title} – Blogging Web` };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default async function PostPage({ params }: PageProps) {
  const post = await appwriteService.getPost(params.slug);
  if (!post) notFound();

  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  return (
    <div className="gsap-fade-up">
      {/* ── Hero image ── */}
      {imageUrl && (
        <div className="w-full max-h-[520px] overflow-hidden">
          <img
            src={imageUrl.toString()}
            alt={post.title}
            className="w-full object-cover max-h-[520px]"
          />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* ── Meta ── */}
        <div className="flex items-center gap-3 mb-6 text-xs uppercase tracking-widest text-muted">
          {post.authorName && <span>{post.authorName}</span>}
          {post.authorName && post.$createdAt && (
            <span className="opacity-40">·</span>
          )}
          {post.$createdAt && <span>{formatDate(post.$createdAt)}</span>}
        </div>

        {/* ── Title ── */}
        <h1 className="font-display text-4xl md:text-6xl leading-none tracking-[-0.03em] mb-10">
          {post.title}
        </h1>

        <hr className="border-edge mb-10" />

        {/* ── Content — server-rendered, zero client JS ── */}
        <PostContent content={post.content} />

        {/* ── Author actions ── */}
        <div className="mt-14 pt-8 border-t border-edge">
          <PostActions post={post} />
        </div>
      </div>
    </div>
  );
}
