'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/react';
import { compressImage } from '@/lib/compressImage';

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Appwrite user ID used to set upload permissions on embedded images. */
  userId?: string;
}

function parseContent(raw: string): JSONContent | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      return parsed as JSONContent;
    }
  } catch {
    // Not JSON - treat as HTML string
  }
  return undefined;
}

/* Toolbar */

type ToolbarItem =
  | { type: 'button'; label: string; title: string; action: () => void; active?: boolean }
  | { type: 'divider' };

function Toolbar({ editor, userId }: { editor: Editor; userId?: string }) {
  const [uploading, setUploading] = useState(false);

  const addImageByUrl = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const uploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);

      try {
        const { default: appwriteService } = await import('@/lib/appwrite/appwriteService');

        // Compress the image before uploading into the content bundle
        const compressed = await compressImage(file);
        const result = await appwriteService.uploadFile(compressed, userId);
        if (!result) throw new Error('Upload failed');

        const preview = appwriteService.getFilePreview(result.$id);
        if (preview) {
          editor.chain().focus().setImage({ src: preview }).run();
        }
      } catch (error) {
        console.error('TiptapEditor :: uploadImage :: error', error);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  };

  const importMarkdown = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown,text/plain';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      // Convert markdown to basic HTML then let Tiptap parse it
      const html = text
        // Headings
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold / italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Code blocks
        .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // Blockquote
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        // Unordered list items
        .replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
        // Ordered list items
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr />')
        // Paragraphs — double newline
        .replace(/\n\n/g, '</p><p>')
        // Wrap in paragraph
        .replace(/^(?!<[h|b|p|l|c|u|o|s|h])(.+)/gm, '$1');
      editor.chain().focus().setContent(`<p>${html}</p>`, true).run();
    };
    input.click();
  };

  const items: ToolbarItem[] = [
    { type: 'button', label: 'H1', title: 'Heading 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { type: 'button', label: 'H2', title: 'Heading 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { type: 'button', label: 'H3', title: 'Heading 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    { type: 'divider' },
    { type: 'button', label: 'B', title: 'Bold', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { type: 'button', label: 'I', title: 'Italic', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { type: 'button', label: 'S', title: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { type: 'button', label: '`', title: 'Inline code', action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
    { type: 'divider' },
    { type: 'button', label: '* List', title: 'Bullet list', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { type: 'button', label: '1. List', title: 'Ordered list', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { type: 'button', label: '"', title: 'Blockquote', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    { type: 'button', label: '<>', title: 'Code block', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    { type: 'divider' },
    { type: 'button', label: 'Img URL', title: 'Insert image by URL', action: addImageByUrl },
    { type: 'button', label: uploading ? 'Uploading...' : 'Upload', title: 'Upload image', action: uploadImage },
    { type: 'divider' },
    { type: 'button', label: '.md', title: 'Import Markdown', action: importMarkdown },
    { type: 'divider' },
    { type: 'button', label: '<-', title: 'Undo', action: () => editor.chain().focus().undo().run() },
    { type: 'button', label: '->', title: 'Redo', action: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-edge bg-subtle">
      {items.map((item, i) => {
        if (item.type === 'divider') {
          return <span key={`d-${i}`} className="mx-1 h-4 w-px bg-edge" />;
        }
        return (
          <button
            key={item.title}
            type="button"
            title={item.title}
            onClick={item.action}
            disabled={item.title === 'Upload image' && uploading}
            className={`px-2 py-1 text-xs rounded font-mono transition-colors duration-150 select-none
              ${item.active
                ? 'bg-accent text-accent-fg font-semibold'
                : 'text-ink hover:bg-card'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/* Main editor */

export default function TiptapEditor({ value, onChange, userId }: TiptapEditorProps) {
  const onChangeRef = useRef(onChange);
  const lastJSONRef = useRef('');
  const isFocusedRef = useRef(false);
  const prevValueRef = useRef<string>('');
  const [, forceUpdate] = useState(0);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: {},
        blockquote: {},
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'tiptap-image' },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your story...',
      }),
    ],
    content: parseContent(value) ?? value,
    editorProps: {
      attributes: { class: 'tiptap-content' },
    },
    onUpdate({ editor: e }) {
      const json = JSON.stringify(e.getJSON());
      if (json !== lastJSONRef.current) {
        lastJSONRef.current = json;
        onChangeRef.current(json);
      }
    },
    onFocus() { isFocusedRef.current = true; },
    onBlur() { isFocusedRef.current = false; },
    immediatelyRender: false,
  });

  // Force toolbar to re-render on selection/transaction changes
  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((x) => x + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  // Sync content only for external changes (draft restore, edit post load).
  // Never interrupt while the editor is focused - the user is typing.
  useEffect(() => {
    if (!editor) return;
    if (isFocusedRef.current) return;
    if (value === lastJSONRef.current) return;
    if (value === prevValueRef.current) return;

    prevValueRef.current = value;

    const parsed = parseContent(value);
    if (parsed) {
      editor.commands.setContent(parsed, false);
    } else if (!value) {
      editor.commands.clearContent(false);
    } else {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="rounded-xl overflow-hidden border border-edge">
      <Toolbar editor={editor} userId={userId} />
      <EditorContent editor={editor} />
      {/* Footer: word count + reading time */}
      <div className="flex items-center justify-end px-4 py-2 border-t border-edge bg-card">
        <span className="text-[11px] text-muted tabular-nums">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          <span className="mx-1.5 opacity-30">&middot;</span>
          ~{readingTime} min read
        </span>
      </div>
    </div>
  );
}
