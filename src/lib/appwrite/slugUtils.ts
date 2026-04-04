/**
 * Builds a readable URL prefix from author name + post title.
 * e.g. "Blank-how-to-build-a-blog"
 * Max 60 chars, URL-safe.
 */
export function buildPostSlug(authorName: string, title: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const authorPart = slugify(authorName).slice(0, 20);
  const titlePart = slugify(title).slice(0, 40);
  const combined = authorPart ? `${authorPart}-${titlePart}` : titlePart;
  return combined.replace(/-+$/, "") || "post";
}

/**
 * Combines the readable slug with the real Appwrite $id.
 * e.g. "Blank-how-to-build-a-blog--abc12345xyz"
 * The "--" separator lets us extract the real ID on lookup.
 */
export function buildUrlParam(
  authorName: string,
  title: string,
  id: string,
): string {
  const slug = buildPostSlug(authorName, title);
  return `${slug}--${id}`;
}
