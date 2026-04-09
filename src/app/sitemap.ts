import { MetadataRoute } from 'next';
import appwriteService from '@/lib/appwrite/appwriteService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await appwriteService.getPosts();
  const posts = result?.documents ?? [];

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    // Use the urlSlug-based URL if available, otherwise fall back to raw $id
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
      url: `${SITE_URL}/all-posts`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    ...postUrls,
  ];
}
