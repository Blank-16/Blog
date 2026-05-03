'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface PostContentProps {
  content: string;
}

type TiptapNode = {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, string | number>;
  content?: TiptapNode[];
};

// Defined outside component — stable reference, not recreated on each render
function nodeToHtml(node: TiptapNode): string {
  if (!node) return '';

  if (node.type === 'text') {
    let t = node.text ?? '';
    t = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold')   t = `<strong>${t}</strong>`;
        if (mark.type === 'italic') t = `<em>${t}</em>`;
        if (mark.type === 'code')   t = `<code>${t}</code>`;
        if (mark.type === 'strike') t = `<s>${t}</s>`;
      }
    }
    return t;
  }

  const children = (node.content ?? []).map(nodeToHtml).join('');
  const attrs = node.attrs ?? {};

  switch (node.type) {
    case 'doc':            return children;
    case 'paragraph':      return `<p>${children}</p>`;
    case 'heading':        return `<h${attrs.level ?? 2}>${children}</h${attrs.level ?? 2}>`;
    case 'bulletList':     return `<ul>${children}</ul>`;
    case 'orderedList':    return `<ol>${children}</ol>`;
    case 'listItem':       return `<li>${children}</li>`;
    case 'blockquote':     return `<blockquote>${children}</blockquote>`;
    case 'codeBlock':      return `<pre><code>${children}</code></pre>`;
    case 'horizontalRule': return `<hr />`;
    case 'hardBreak':      return `<br />`;
    case 'image':
      return `<img src="${attrs.src ?? ''}" alt="${attrs.alt ?? ''}" />`;
    default:               return children;
  }
}

function tiptapToHtml(content: string): string {
  if (!content) return '';

  // Legacy plain HTML
  if (!content.trimStart().startsWith('{')) {
    return DOMPurify.sanitize(content);
  }

  try {
    const parsed = JSON.parse(content) as TiptapNode;
    if (parsed?.type !== 'doc') return DOMPurify.sanitize(content);
    return DOMPurify.sanitize(nodeToHtml(parsed));
  } catch {
    return DOMPurify.sanitize(content);
  }
}

export default function PostContent({ content }: PostContentProps) {
  const html = useMemo(() => tiptapToHtml(content), [content]);

  return (
    <div
      className="tiptap-render text-ink text-[1.0625rem] leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
