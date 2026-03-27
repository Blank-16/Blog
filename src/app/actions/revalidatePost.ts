'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server Action to revalidate a post page cache on demand.
 * Called from PostForm after a successful create or update.
 * Runs server-side only — never exposed as a public HTTP endpoint.
 */
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`);
}