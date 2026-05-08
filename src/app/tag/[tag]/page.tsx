import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import PostCard from '@/components/ui/PostCard';

export const revalidate = 3600; // ISR: rebuild every hour

interface Props { params: Promise<{ tag: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded} — Posts`,
    description: `All posts tagged "${decoded}"`,
  };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const posts: Post[] = await appwriteService.searchPostsByTag(decoded);

  if (!posts) notFound();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-2">
          Tag
        </p>
        <h1 className="font-display text-3xl text-ink mb-1">
          #{decoded}
        </h1>
        <p className="text-sm text-muted">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-muted mb-4">No posts with this tag yet.</p>
          <Link href="/public-posts" className="text-sm underline underline-offset-4 text-muted hover:text-ink transition-colors">
            Browse all posts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
          divide-x divide-y divide-edge border border-edge rounded-xl overflow-hidden">
          {posts.map((post, i) => (
            <PostCard key={post.$id} {...post} index={i} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/search"
          className="text-xs text-muted underline underline-offset-4 hover:text-ink transition-colors"
        >
          ← Browse all tags
        </Link>
      </div>
    </div>
  );
}
