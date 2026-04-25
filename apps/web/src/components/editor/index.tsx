'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { RichEditor as RichEditorComponent } from './rich-editor';

type LazyProps = ComponentProps<typeof RichEditorComponent>;

/**
 * Lazy-load do Tiptap pra evitar inflar o bundle inicial do app.
 * O editor só monta quando aparece em tela (modal de card, etc).
 */
export const RichEditor = dynamic<LazyProps>(
  () => import('./rich-editor').then((m) => m.RichEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="bg-bg border-border rounded-md border px-3 py-2 text-sm"
        style={{ minHeight: '8rem' }}
      />
    ),
  },
);
