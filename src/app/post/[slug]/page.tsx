import type { Metadata } from 'next';
import { Query } from 'appwrite';
import appwriteService from '@/lib/appwrite/appwriteService';
import PostPage from '@/page-components/PostPage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function extractDescription(raw: string): string {
  if (!raw) return '';
  if (raw.trimStart().startsWith('{')) {
    try {
      const doc = JSON.parse(raw);
      if (doc?.type === 'doc' && Array.isArray(doc.content)) {
        const texts: string[] = [];
        function walk(nodes: { type?: string; text?: string; content?: unknown[] }[]) {
          for (const n of nodes) {
            if (n.type === 'text' && n.text) texts.push(n.text);
            if (n.content) walk(n.content as typeof nodes);
          }
        }
        walk(doc.content);
        return texts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 160);
      }
    } catch { /* fall through */ }
  }
  return raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

/**
 * Pre-builds the 20 most recent posts at deploy time.
 * Wrapped in try/catch so a build never fails if Appwrite is unreachable —
 * pages fall back to SSR on first visit via dynamicParams = true.
 */
export async function generateStaticParams() {
  try {
    const result = await appwriteService.getPosts([
      Query.equal('status', 'active'),
      Query.orderDesc('$createdAt'),
      Query.limit(20),
    ]);
    return (result?.documents ?? []).map((post) => ({
      slug: post.urlSlug ?? post.$id,
    }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await appwriteService.getPostByUrlParam(slug);
  if (!post) return { title: 'Post Not Found' };

  const title = post.metaTitle
    ? `${post.metaTitle} – Blogging Web`
    : `${post.title} – Blogging Web`;

  const description = post.metaDescription || extractDescription(post.content);
  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)?.toString()
    : undefined;
  const defaultUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/post/${slug}`;
  const canonical = post.canonicalUrl || defaultUrl;

  return {
    title,
    description,
    ...(post.noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      type: 'article',
      url: defaultUrl,
      title: post.metaTitle || post.title,
      description,
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
      }),
      publishedTime: post.$createdAt,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: post.metaTitle || post.title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
    alternates: { canonical },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const post = await appwriteService.getPostByUrlParam(slug);

  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.metaTitle || post.title,
    description: post.metaDescription || extractDescription(post.content),
    datePublished: post.$createdAt,
    dateModified: post.$updatedAt,
    author: { '@type': 'Person', name: post.authorName ?? 'Unknown' },
    ...(post.featuredImage && {
      image: appwriteService.getFilePreview(post.featuredImage)?.toString(),
    }),
    keywords: [
      ...(post.tags ?? []),
      ...(post.focusKeyword ? [post.focusKeyword] : []),
    ].join(', ') || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/post/${slug}`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PostPage slug={slug} />
    </>
  );
}
