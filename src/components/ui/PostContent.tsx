'use client';

import { useMemo } from 'react';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { JSONContent } from '@tiptap/react';
import DOMPurify from 'dompurify';

interface PostContentProps {
  content: string;
}

/**
 * Parses raw content as Tiptap JSON only if it actually looks like JSON.
 * Returns null silently for legacy HTML content - no console warnings.
 */
function parseToJSON(raw: string): JSONContent | null {
  if (!raw || !raw.trimStart().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      return parsed as JSONContent;
    }
  } catch {
    // Not valid JSON - fall through
  }
  return null;
}

function renderToHtml(content: string): string {
  const json = parseToJSON(content);

  if (json) {
    try {
      const generated = generateHTML(json, [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Image,
      ]);
      return DOMPurify.sanitize(generated);
    } catch {
      // generateHTML failed - fall through to raw HTML
    }
  }

  // Legacy HTML or failed JSON - sanitize and render as-is
  return DOMPurify.sanitize(content);
}

export default function PostContent({ content }: PostContentProps) {
  const html = useMemo(() => renderToHtml(content), [content]);

  return (
    <div
      className="tiptap-render text-ink text-[1.0625rem] leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
