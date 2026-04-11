import Link from "next/link";
import Image from "next/image";
import appwriteService from "@/lib/appwrite/appwriteService";
import { formatDate, extractPreview } from "@/lib/utils";

interface PostCardProps {
  $id: string;
  title: string;
  content?: string;
  featuredImage?: string;
  authorName?: string;
  $createdAt?: string;
  tags?: string[];
  urlSlug?: string;
  index?: number;
}

export default function PostCard({
  $id,
  title,
  content,
  featuredImage,
  authorName,
  $createdAt,
  tags,
  urlSlug,
  index = 0,
}: PostCardProps) {
  const imageUrl = featuredImage
    ? appwriteService.getFilePreview(featuredImage)
    : null;
  const preview = extractPreview(content);
  const isFeatured = index === 0;
  const href = `/post/${urlSlug ?? $id}`;

  return (
    <Link href={href} className="group block h-full">
      <article
        className={`h-full flex flex-col bg-card hover:bg-subtle transition-colors duration-200 ${isFeatured ? "p-7" : "p-5"}`}
      >
        {imageUrl && (
          <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={title}
              fill
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full border border-edge text-muted uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h2
          className={`font-display leading-snug mb-2 text-ink group-hover:opacity-60 transition-opacity duration-200 ${isFeatured ? "text-xl" : "text-base"}`}
        >
          {title}
        </h2>

        {preview && (
          <p className="text-sm leading-relaxed text-muted font-light line-clamp-2 flex-1 mb-3">
            {preview}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-muted mt-auto">
          {authorName && <span>{authorName}</span>}
          {authorName && $createdAt && (
            <span className="opacity-30">&middot;</span>
          )}
          {$createdAt && <span>{formatDate($createdAt)}</span>}
        </div>
      </article>
    </Link>
  );
}
