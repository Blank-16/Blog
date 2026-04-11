// Shared utility functions used across the application.

/**
 * Formats an ISO date string into a human-readable date.
 * e.g. "Apr 8, 2026"
 */
export function formatDate(
  iso: string | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", options);
}

// Internal: recursively collect all text node values from a Tiptap doc tree.
type TiptapNode = { type?: string; text?: string; content?: TiptapNode[] };

function collectText(nodes: TiptapNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.type === "text" && node.text) out.push(node.text);
    if (node.content) out.push(...collectText(node.content));
  }
  return out;
}

/**
 * Extracts a plain-text preview from Tiptap JSON or legacy HTML content.
 * Returns an empty string if the content is empty or unparseable.
 */
export function extractPreview(
  raw: string | undefined,
  maxLength = 120,
): string {
  if (!raw) return "";

  // Legacy HTML path
  if (!raw.trimStart().startsWith("{")) {
    const plain = raw
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length > maxLength
      ? plain.slice(0, maxLength) + "\u2026"
      : plain;
  }

  // Tiptap JSON path
  try {
    const doc = JSON.parse(raw) as TiptapNode;
    if (doc?.type === "doc" && Array.isArray(doc.content)) {
      const plain = collectText(doc.content)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return plain.length > maxLength
        ? plain.slice(0, maxLength) + "\u2026"
        : plain;
    }
  } catch {
    // Not valid JSON - fall through
  }

  return "";
}

/**
 * Shared toast style object for react-hot-toast.
 */
export const toastStyle = {
  background: "var(--bg-card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  fontSize: "14px",
} as const;

// Internal: recursively collect Appwrite file IDs from image nodes.
type ImageNode = {
  type?: string;
  attrs?: Record<string, string>;
  content?: ImageNode[];
};

function collectFileIds(nodes: ImageNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.type === "image" && node.attrs?.src) {
      const match = node.attrs.src.match(/\/files\/([^/]+)\//);
      if (match?.[1]) out.push(match[1]);
    }
    if (node.content) out.push(...collectFileIds(node.content));
  }
  return out;
}

/**
 * Extracts all Appwrite storage file IDs embedded as image src URLs
 * inside a Tiptap JSON document string. Used to identify files that
 * need cleanup when a post is deleted or its content is edited.
 */
export function extractEmbeddedFileIds(tiptapJson: string): string[] {
  if (!tiptapJson) return [];
  try {
    const doc = JSON.parse(tiptapJson) as ImageNode;
    if (doc?.type === "doc" && Array.isArray(doc.content)) {
      return collectFileIds(doc.content);
    }
    return [];
  } catch {
    return [];
  }
}
