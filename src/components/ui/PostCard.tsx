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

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Extracts plain text from either Tiptap JSON or legacy HTML content */
function extractPreview(raw?: string): string {
  if (!raw) return '';

  // Try parsing as Tiptap JSON first
  try {
    const doc = JSON.parse(raw);
    if (doc?.type === 'doc' && Array.isArray(doc.content)) {
      const texts: string[] = [];
      function walk(nodes: { type?: string; text?: string; content?: unknown[] }[]) {
        for (const node of nodes) {
          if (node.type === 'text' && node.text) texts.push(node.text);
          if (node.content) walk(node.content as typeof nodes);
        }
      }
      walk(doc.content);
      const plain = texts.join(' ').replace(/\s+/g, ' ').trim();
      return plain.length > 120 ? plain.slice(0, 120) + '…' : plain;
    }
  } catch {
    // Not JSON — fall through to HTML strip
  }

  // Strip HTML tags (legacy Quill content)
  const plain = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > 120 ? plain.slice(0, 120) + '…' : plain;
}

function readingTime(raw?: string): string {
  if (!raw) return '';
  const preview = extractPreview(raw);
  const words = preview.split(/\s+/).filter(Boolean).length;
  // Rough word count from JSON by counting text nodes
  let totalWords = words;
  try {
    const doc = JSON.parse(raw);
    if (doc?.type === 'doc') {
      const all: string[] = [];
      function walk(nodes: { type?: string; text?: string; content?: unknown[] }[]) {
        for (const n of nodes) {
          if (n.type === 'text' && n.text) all.push(n.text);
          if (n.content) walk(n.content as typeof nodes);
        }
      }
      walk(doc.content);
      totalWords = all.join(' ').split(/\s+/).filter(Boolean).length;
    }
  } catch { /* use preview word count */ }
  const mins = Math.max(1, Math.round(totalWords / 200));
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
  const preview = extractPreview(content);
  const isFeatured = index === 0;

  return (
    <Link href={`/post/${$id}`} className="group block h-full">
      <article className={`h-full flex flex-col bg-card hover:bg-subtle transition-colors duration-200 ${isFeatured ? 'p-7' : 'p-5'}`}>

        {/* Image */}
        {imageUrl && (
          <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-lg">
            <Image
              src={imageUrl.toString()}
              alt={title}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-edge text-muted uppercase tracking-wide">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className={`font-display leading-snug mb-2 text-ink group-hover:opacity-60 transition-opacity duration-200 ${isFeatured ? 'text-xl' : 'text-base'}`}>
          {title}
        </h2>

        {/* Preview */}
        {preview && (
          <p className="text-sm leading-relaxed text-muted font-light line-clamp-2 flex-1 mb-3">
            {preview}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-muted mt-auto">
          {authorName && <span>{authorName}</span>}
          {authorName && $createdAt && <span className="opacity-30">·</span>}
          {$createdAt && <span>{formatDate($createdAt)}</span>}
          {content && (
            <>
              <span className="opacity-30">·</span>
              <span>{readingTime(content)}</span>
            </>
          )}
        </div>
      </article>
    </Link>
  );
}
