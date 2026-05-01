'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates all cache entries affected by a post create/update/delete.
 * Uses type 'layout' to bust the full subtree at each path, not just the
 * leaf page — ensures nested layouts and shared segments are also cleared.
 */
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`, 'layout');
  revalidatePath('/', 'layout');
  // /public-posts is a client component (no ISR cache), but revalidating
  // ensures any future SSR-rendered version stays fresh.
  revalidatePath('/public-posts', 'layout');
}
