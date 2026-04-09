'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server Action to revalidate cache on demand after a post is created or updated.
 * Called from PostForm after a successful publish or edit.
 * Runs server-side only - never exposed as a public HTTP endpoint.
 *
 * Revalidates:
 * - The post's own page (so readers see updated content immediately)
 * - The home page (so the featured post and grid reflect the change)
 * - The sitemap (so search engines get the updated URL list)
 */
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`);
  revalidatePath('/');
  revalidatePath('/sitemap.xml');
}
