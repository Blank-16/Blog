import { notFound } from 'next/navigation';
import Image from 'next/image';
import PostActions from '@/components/client/PostActions';
import PostContent from '@/components/ui/PostContent';
import appwriteService from '@/lib/appwrite/appwriteService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function readingTime(content: string): string {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export default async function PostPage({ slug }: { slug: string }) {
  const post = await appwriteService.getPost(slug);
  if (!post) notFound();

  const imageUrl = post.featuredImage ? appwriteService.getFilePreview(post.featuredImage) : null;

  return (
    <div className="gsap-fade-up max-w-3xl mx-auto px-6 py-14">
      <div className="flex items-center gap-3 mb-5 text-xs uppercase tracking-widest text-muted">
        {post.authorName && <span>{post.authorName}</span>}
        {post.authorName && <span className="opacity-30">·</span>}
        {post.$createdAt && <span>{formatDate(post.$createdAt)}</span>}
        <span className="opacity-30">·</span>
        <span>{readingTime(post.content)}</span>
      </div>

      <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-[-0.02em] mb-6">
        {post.title}
      </h1>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full border border-edge text-muted">{tag}</span>
          ))}
        </div>
      )}

      {imageUrl && (
        <div className="relative w-full mb-10 overflow-hidden rounded-xl border border-edge"
             style={{ maxHeight: '480px', aspectRatio: '16/9' }}>
          <Image src={imageUrl.toString()} alt={post.title} fill priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain bg-subtle"
          />
        </div>
      )}

      <hr className="border-edge mb-10" />
      <PostContent content={post.content} />

      <div className="mt-14 pt-8 border-t border-edge">
        <PostActions post={post} />
      </div>
    </div>
  );
}
