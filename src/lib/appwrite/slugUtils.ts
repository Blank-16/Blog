/**
 * Builds a URL-safe, lowercase slug from author name and post title.
 * e.g. buildPostSlug("John Doe", "How to Build a Blog") => "john-doe-how-to-build-a-blog"
 * Capped at 60 chars total (20 for author, 40 for title).
 */
export function buildPostSlug(authorName: string, title: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const authorPart = slugify(authorName).slice(0, 20);
  const titlePart = slugify(title).slice(0, 40);
  const combined = authorPart ? `${authorPart}-${titlePart}` : titlePart;
  return combined.replace(/-+$/, '') || 'post';
}

/**
 * Combines the readable slug with the real Appwrite document $id using
 * a "--" separator, e.g. "john-doe-how-to-build--abc12345xyz".
 * The separator lets getPostByUrlParam extract the real ID on lookup.
 */
export function buildUrlParam(authorName: string, title: string, id: string): string {
  const slug = buildPostSlug(authorName, title);
  return `${slug}--${id}`;
}
