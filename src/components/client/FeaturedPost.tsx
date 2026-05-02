'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Post } from '@/lib/appwrite/appwriteService';
import appwriteService from '@/lib/appwrite/appwriteService';
import { formatDate, extractPreview } from '@/lib/utils';

export default function FeaturedPost({ post }: { post: Post }) {
  const router = useRouter();
  const href = `/post/${post.urlSlug ?? post.$id}`;
  const preview = extractPreview(post.content, 180);
  const imageUrl = post.featuredImage ? appwriteService.getFilePreview(post.featuredImage) : null;

  return (
    <section className="border-b border-edge">
      <div
        role="article"
        onClick={() => router.push(href)}
        className="group cursor-pointer block max-w-5xl mx-auto px-6 py-12 md:py-16"
      >
        <div className="md:grid md:grid-cols-[1fr_auto] md:gap-12 md:items-start">
          <div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-5">Featured</p>

            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1.5 mb-4">
                {post.tags.slice(0, 2).map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?tag=${encodeURIComponent(tag)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 border border-edge
                      rounded-full text-muted hover:border-ink hover:text-ink transition-colors duration-150"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.02em] mb-4 text-ink group-hover:opacity-60 transition-opacity duration-300">
              {post.title}
            </h2>

            {preview && (
              <p className="text-base text-muted font-light leading-relaxed max-w-xl mb-6">
                {preview}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted">
              {post.authorName && <span>{post.authorName}</span>}
              {post.authorName && post.$createdAt && <span className="opacity-30">&middot;</span>}
              {post.$createdAt && (
                <span>{formatDate(post.$createdAt, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              )}
            </div>
          </div>

          {imageUrl && (
            <div className="relative mt-8 md:mt-0 md:w-64 lg:w-80 aspect-[4/3] rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={imageUrl}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
