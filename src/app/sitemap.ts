import { MetadataRoute } from 'next';
import { Query } from 'appwrite';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 100;

async function getAllActivePosts(): Promise<Post[]> {
  const all: Post[] = [];
  let cursor: string | null = null;

  // Appwrite hard-limits listDocuments to 100 per call — paginate until exhausted
  while (true) {
    const queries: string[] = [
      Query.equal('status', 'active'),
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    try {
      const result = await appwriteService.getPosts(queries);
      if (!result || result.documents.length === 0) break;
      all.push(...result.documents);
      if (result.documents.length < PAGE_SIZE) break;
      cursor = result.documents[result.documents.length - 1].$id;
    } catch {
      break;
    }
  }

  return all;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllActivePosts();

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/post/${post.urlSlug ?? post.$id}`,
    lastModified: new Date(post.$updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/public-posts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...postUrls,
  ];
}
