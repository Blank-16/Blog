import type { Metadata } from 'next';
import appwriteService from '@/lib/appwrite/appwriteService';
import PostPage from '@/pages/PostPage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

function extractDescription(raw: string): string {
  if (!raw) return '';
  // Tiptap JSON
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
        const plain = texts.join(' ').replace(/\s+/g, ' ').trim();
        return plain.slice(0, 160);
      }
    } catch { /* fall through */ }
  }
  // Legacy HTML
  const plain = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.slice(0, 160);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await appwriteService.getPost(slug);

  if (!post) return { title: 'Post Not Found' };

  const title = `${post.title} – Blogging Web`;
  const description = extractDescription(post.content);
  const imageUrl = post.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)?.toString()
    : undefined;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/post/${slug}`;

  return {
    title,
    description,

    // Open Graph — controls previews in Google, WhatsApp, Discord, Slack
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description,
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
      }),
      publishedTime: post.$createdAt,
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
    },

    // Twitter / X card
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },

    // Canonical URL — tells Google the definitive URL for this page
    alternates: {
      canonical: url,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <PostPage slug={slug} />;
}
