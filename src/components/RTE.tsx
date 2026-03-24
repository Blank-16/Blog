'use client';

import dynamic from 'next/dynamic';
import { Controller, Control } from 'react-hook-form';

const TiptapEditor = dynamic(() => import('./TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-edge h-48 flex items-center justify-center text-sm text-muted">
      Loading editor…
    </div>
  ),
});

interface RTEProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  name: string;
  label?: string;
  defaultValue?: string;
}

export default function RTE({ control, name, label, defaultValue = '' }: RTEProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-sm font-medium text-muted">
          {label}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => (
          <TiptapEditor value={value ?? ''} onChange={onChange} />
        )}
      />
    </div>
  );
}
