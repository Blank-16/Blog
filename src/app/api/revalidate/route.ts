import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

/**
 * On-demand revalidation endpoint.
 * Called from PostForm after a successful create/update so the post
 * page rebuilds immediately instead of waiting for the 24hr timer.
 *
 * Usage: GET /api/revalidate?slug=<postId>
 *
 * Protected by a secret token to prevent abuse.
 * Set REVALIDATE_SECRET in your .env.local
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const secret = req.nextUrl.searchParams.get('secret');

  if (!slug) {
    return Response.json({ error: 'Missing slug' }, { status: 400 });
  }

  // Optional secret protection — skip check if env var not set (dev mode)
  const expectedSecret = process.env.REVALIDATE_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(`/post/${slug}`);
  return Response.json({ revalidated: true, slug });
}
