import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PostActions from "@/components/client/PostActions";
import PostContent from "@/components/ui/PostContent";
import PostContentBoundary from "@/components/client/PostContentBoundary";
import RatingsSection from "@/components/client/RatingsSection";
import ReadingProgress from "@/components/client/ReadingProgress";
import ViewCounter from "@/components/client/ViewCounter";
import appwriteService from "@/lib/appwrite/appwriteService";
import { formatDate, readingTime } from "@/lib/utils";

export default async function PostPage({ slug }: { slug: string }) {
  const post = await appwriteService.getPostByUrlParam(slug);
  if (!post) notFound();

  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  // Fetch related posts server-side — same tag, exclude current post, max 3
  const primaryTag = post.tags?.[0];
  const relatedRaw = primaryTag
    ? await appwriteService.searchPostsByTag(primaryTag)
    : [];
  const related = (Array.isArray(relatedRaw) ? relatedRaw : [])
    .filter((p: { $id: string }) => p.$id !== post.$id)
    .slice(0, 3);

  return (
    <div className="gsap-fade-up max-w-3xl mx-auto px-6 py-14">
      <ReadingProgress />
      <ViewCounter postId={post.$id} />
      <div className="flex items-center gap-3 mb-5 text-xs uppercase tracking-widest text-muted flex-wrap">
        {post.authorName && <span>{post.authorName}</span>}
        {post.authorName && <span className="opacity-30">&middot;</span>}
        {post.$createdAt && (
          <span>
            {formatDate(post.$createdAt, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
        <span className="opacity-30">&middot;</span>
        <span>{readingTime(post.content)} min read</span>
      </div>

      <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-[-0.02em] mb-6">
        {post.title}
      </h1>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/search?tag=${encodeURIComponent(tag)}`}
              className="text-xs px-3 py-1 rounded-full border border-edge text-muted hover:border-ink hover:text-ink transition-colors duration-150"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {imageUrl && (
        <div className="relative w-full mb-10 overflow-hidden rounded-xl border border-edge aspect-video max-h-[480px]">
          <Image
            src={imageUrl}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-contain bg-subtle"
          />
        </div>
      )}

      <hr className="border-edge mb-10" />
      <PostContentBoundary>
        <PostContent content={post.content} />
      </PostContentBoundary>

      <div className="mt-14 pt-8 border-t border-edge">
        <PostActions post={post} />
      </div>

      <RatingsSection post={post} />

      {related.length > 0 && (
        <div className="mt-16 pt-10 border-t border-edge">
          <p className="text-[11px] tracking-[0.25em] uppercase text-muted mb-6">
            {primaryTag ? `More tagged "${primaryTag}"` : 'More stories'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((rel: {
              $id: string; title: string; $createdAt: string;
              authorName?: string; urlSlug?: string; tags?: string[];
            }) => (
              <Link
                key={rel.$id}
                href={`/post/${rel.urlSlug ?? rel.$id}`}
                className="group block"
              >
                <div className="border border-edge rounded-xl p-4 h-full
                  hover:bg-subtle transition-colors duration-150">
                  {rel.tags && rel.tags.length > 0 && (
                    <span className="text-[10px] uppercase tracking-widest text-muted
                      border border-edge px-2 py-0.5 rounded-full inline-block mb-3">
                      {rel.tags[0]}
                    </span>
                  )}
                  <p className="text-sm font-medium text-ink leading-snug
                    group-hover:opacity-60 transition-opacity line-clamp-2 mb-2">
                    {rel.title}
                  </p>
                  <p className="text-[11px] text-muted">
                    {rel.authorName && <span>{rel.authorName} &middot; </span>}
                    {formatDate(rel.$createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
