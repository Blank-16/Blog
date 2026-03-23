'use client';

import { useEffect, useRef } from 'react';
import { Controller, Control } from 'react-hook-form';

interface RTEProps {
  name: string;
  control: Control<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  label?: string;
  defaultValue?: string;
}

export default function RTE({ name, control, label, defaultValue = '' }: RTEProps) {
  return (
    <div className="w-full bg-white text-black">
      {label && <label className="inline-block mb-1 pl-1">{label}</label>}
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => (
          <QuillEditor value={value ?? ''} onChange={onChange} />
        )}
      />
    </div>
  );
}

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function QuillEditor({ value, onChange }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<InstanceType<typeof import('quill')['default']> | null>(null);
  const onChangeRef = useRef(onChange);
  const isInitialMount = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    let cleanup: (() => void) | undefined;

    import('quill').then(({ default: Quill }) => {
      // @ts-ignore — quill CSS has no types
      import('quill/dist/quill.snow.css');

      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      const editorDiv = document.createElement('div');
      containerRef.current.appendChild(editorDiv);

      const quill = new Quill(editorDiv, {
        theme: 'snow',
        placeholder: 'Write your content here...',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [{ font: [] }],
            [{ size: ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ indent: '-1' }, { indent: '+1' }],
            [{ align: [] }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            ['clean'],
          ],
        },
      });

      quillRef.current = quill;
      if (value) quill.clipboard.dangerouslyPasteHTML(value);

      const handleTextChange = () => {
        onChangeRef.current(quill.root.innerHTML);
      };
      quill.on('text-change', handleTextChange);

      cleanup = () => {
        quill.off('text-change', handleTextChange);
        quillRef.current = null;
        if (containerRef.current) containerRef.current.innerHTML = '';
        initializedRef.current = false;
      };
    });

    return () => cleanup?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!quillRef.current) return;
    if (isInitialMount.current) { isInitialMount.current = false; return; }

    const quill = quillRef.current;
    if (value !== quill.root.innerHTML) {
      const sel = quill.getSelection();
      quill.root.innerHTML = value ?? '';
      if (sel) quill.setSelection(sel);
    }
  }, [value]);

  return <div ref={containerRef} className="quill-wrapper" />;
}
