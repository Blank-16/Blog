'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface PostContentProps {
  content: string;
}

/**
 * Renders post content entirely on the client.
 * Tiptap extensions reference browser globals (document, window) during
 * module init — even with 'use client', Next.js SSR on Vercel will crash
 * if generateHTML is imported at the module level.
 * We dynamically import it inside useMemo so it only runs in the browser.
 */
export default function PostContent({ content }: PostContentProps) {
  const html = useMemo(() => {
    if (!content) return '';

    // Strip HTML tags for plain HTML content
    if (!content.trimStart().startsWith('{')) {
      return DOMPurify.sanitize(content);
    }

    // Try to parse as Tiptap JSON
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type !== 'doc') {
        return DOMPurify.sanitize(content);
      }

      // Convert Tiptap JSON nodes to HTML manually — no Tiptap imports needed
      function nodeToHtml(node: {
        type?: string;
        text?: string;
        marks?: { type: string }[];
        attrs?: Record<string, string>;
        content?: typeof node[];
      }): string {
        if (!node) return '';

        if (node.type === 'text') {
          let t = node.text ?? '';
          t = t
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
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
          case 'doc':           return children;
          case 'paragraph':     return `<p>${children}</p>`;
          case 'heading':       return `<h${attrs.level ?? 2}>${children}</h${attrs.level ?? 2}>`;
          case 'bulletList':    return `<ul>${children}</ul>`;
          case 'orderedList':   return `<ol>${children}</ol>`;
          case 'listItem':      return `<li>${children}</li>`;
          case 'blockquote':    return `<blockquote>${children}</blockquote>`;
          case 'codeBlock':     return `<pre><code>${children}</code></pre>`;
          case 'horizontalRule':return `<hr />`;
          case 'hardBreak':     return `<br />`;
          case 'image':
            return `<img src="${attrs.src ?? ''}" alt="${attrs.alt ?? ''}" />`;
          default:              return children;
        }
      }

      return DOMPurify.sanitize(nodeToHtml(parsed));
    } catch {
      return DOMPurify.sanitize(content);
    }
  }, [content]);

  return (
    <div
      className="tiptap-render text-ink text-[1.0625rem] leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
