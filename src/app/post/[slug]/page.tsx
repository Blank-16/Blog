import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import PostActions from '@/components/PostActions';
import PostContent from '@/components/PostContent';
import appwriteService from '@/lib/appwrite/appwriteService';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await appwriteService.getPost(slug);
  if (!post) return { title: 'Post Not Found' };
  return { title: `${post.title} – Blogging Web` };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function readingTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await appwriteService.getPost(slug);
  if (!post) notFound();

  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  return (
    <div className="gsap-fade-up">
      {/* ── Hero image ── */}
      {imageUrl && (
        <div className="relative w-full max-h-[520px] overflow-hidden" style={{ aspectRatio: '16/6' }}>
          <Image
            src={imageUrl.toString()}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
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
          <span className="opacity-40">·</span>
          <span>{readingTime(post.content)}</span>
        </div>

        {/* ── Title ── */}
        <h1 className="font-display text-4xl md:text-6xl leading-none tracking-[-0.03em] mb-6">
          {post.title}
        </h1>

        {/* ── Tags ── */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full border border-edge text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

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
