import Link from 'next/link';
import Image from 'next/image';
import appwriteService from '@/lib/appwrite/appwriteService';

interface PostCardProps {
  $id: string;
  title: string;
  content?: string;
  featuredImage?: string;
  authorName?: string;
  $createdAt?: string;
  tags?: string[];
  index?: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function readingTime(content: string): string {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function PostCard({
  $id,
  title,
  content,
  featuredImage,
  authorName,
  $createdAt,
  tags,
  index = 0,
}: PostCardProps) {
  const imageUrl = featuredImage ? appwriteService.getFilePreview(featuredImage) : null;
  const preview = content
    ? stripHtml(content).slice(0, 120) + (content.length > 120 ? '…' : '')
    : '';
  const isFeature = index === 0;

  return (
    <Link href={`/post/${$id}`} className="group block h-full">
      <article className="h-full flex flex-col bg-card p-7 transition-colors duration-200 hover:bg-subtle">

        {/* Image */}
        {imageUrl && (
          <div className={`relative w-full mb-5 overflow-hidden rounded-lg ${isFeature ? 'aspect-[16/7]' : 'aspect-video'}`}>
            <Image
              src={imageUrl.toString()}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mb-3 text-xs font-medium tracking-wide text-muted">
          {authorName && <span>{authorName}</span>}
          {authorName && $createdAt && <span className="opacity-40">·</span>}
          {$createdAt && <span>{formatDate($createdAt)}</span>}
          {content && (
            <>
              <span className="opacity-40">·</span>
              <span>{readingTime(content)}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h2 className={`font-display mb-2 transition-opacity duration-200 group-hover:opacity-60 text-ink ${isFeature ? 'text-2xl' : 'text-xl'}`}>
          {title}
        </h2>

        {/* Preview */}
        {preview && (
          <p className="text-sm leading-relaxed flex-1 line-clamp-3 text-muted font-light">
            {preview}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full border border-edge text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Read more */}
        <div className="mt-4 text-xs font-medium tracking-wide uppercase text-muted transition-opacity group-hover:opacity-60">
          Read →
        </div>
      </article>
    </Link>
  );
}
