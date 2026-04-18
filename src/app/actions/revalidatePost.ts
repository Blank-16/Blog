'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the post page and the homepage when a post is created or updated.
 * Both paths need busting — the post page for the content itself,
 * and the homepage so the new post appears in the feed immediately.
 */
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`);
  revalidatePath('/');
}
