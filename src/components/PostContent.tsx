import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { JSONContent } from '@tiptap/react';
import DOMPurify from 'isomorphic-dompurify';

interface PostContentProps {
  content: string;
}

function parseToJSON(raw: string): JSONContent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      return parsed as JSONContent;
    }
  } catch (e) {
    console.warn('PostContent: invalid JSON content', e);
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
    } catch (e) {
      console.warn('PostContent: generateHTML failed, falling back to raw HTML', e);
    }
  }

  // Legacy Quill HTML or broken JSON — sanitize and render as-is
  return DOMPurify.sanitize(content);
}

export default function PostContent({ content }: PostContentProps) {
  const html = renderToHtml(content);

  return (
    <div
      className="tiptap-render text-ink text-[1.0625rem] leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
