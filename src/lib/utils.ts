// Shared utility functions used across the application.

/**
 * Formats an ISO date string into a human-readable date.
 * e.g. "Apr 8, 2026"
 */
export function formatDate(
  iso: string | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', options);
}

/**
 * Extracts plain-text preview from either Tiptap JSON or legacy HTML content.
 */
export function extractPreview(raw: string | undefined, maxLength = 120): string {
  if (!raw) return '';

  if (!raw.trimStart().startsWith('{')) {
    const plain = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return plain.length > maxLength ? plain.slice(0, maxLength) + '\u2026' : plain;
  }

  try {
    const doc = JSON.parse(raw);
    if (doc?.type === 'doc' && Array.isArray(doc.content)) {
      const texts: string[] = [];
      function walk(nodes: { type?: string; text?: string; content?: unknown[] }[]) {
        for (const node of nodes) {
          if (node.type === 'text' && node.text) texts.push(node.text);
          if (node.content) walk(node.content as typeof nodes);
        }
      }
      walk(doc.content);
      const plain = texts.join(' ').replace(/\s+/g, ' ').trim();
      return plain.length > maxLength ? plain.slice(0, maxLength) + '\u2026' : plain;
    }
  } catch {
    // Not JSON - fall through
  }

  return '';
}

/**
 * Shared toast style object for react-hot-toast.
 * Import this instead of copy-pasting the object.
 */
export const toastStyle = {
  background: 'var(--bg-card)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  fontSize: '14px',
} as const;

/**
 * Extracts all Appwrite file IDs that are embedded as image src URLs
 * inside a Tiptap JSON document. Used to track which images need
 * cleanup when a post is deleted or its content is replaced.
 */
export function extractEmbeddedFileIds(tiptapJson: string): string[] {
  if (!tiptapJson) return [];
  try {
    const doc = JSON.parse(tiptapJson);
    const ids: string[] = [];

    function walk(nodes: { type?: string; attrs?: Record<string, string>; content?: unknown[] }[]) {
      for (const node of nodes) {
        if (node.type === 'image' && node.attrs?.src) {
          const match = node.attrs.src.match(/\/files\/([^/]+)\//);
          if (match?.[1]) ids.push(match[1]);
        }
        if (node.content) walk(node.content as typeof nodes);
      }
    }

    if (doc?.type === 'doc' && Array.isArray(doc.content)) {
      walk(doc.content);
    }
    return ids;
  } catch {
    return [];
  }
}
