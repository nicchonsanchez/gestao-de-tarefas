'use client';

import { useEditor, EditorContent, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react';

type ProseDoc = JSONContent & { type: 'doc' };

function isProseDoc(value: unknown): value is ProseDoc {
  return typeof value === 'object' && value !== null && (value as { type?: string }).type === 'doc';
}

const EMPTY_DOC: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

function normalizeIncoming(value: unknown): ProseDoc {
  if (isProseDoc(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    return {
      type: 'doc',
      content: value.split(/\n{2,}/).map((p) => ({
        type: 'paragraph',
        content: p.length > 0 ? [{ type: 'text', text: p }] : [],
      })),
    };
  }
  return EMPTY_DOC;
}

export interface RichEditorProps {
  value: unknown;
  onChange: (next: ProseDoc) => void;
  placeholder?: string;
  /** Debounce para chamar onChange. 0 = sem debounce. */
  debounceMs?: number;
  /** Indica que está salvando externamente (para feedback no rodapé). */
  isSaving?: boolean;
  /** Quando true, renderiza somente leitura (sem toolbar). */
  readOnly?: boolean;
  /** Altura mínima do editor. Default: 8rem. */
  minHeight?: string;
  className?: string;
}

export function RichEditor({
  value,
  onChange,
  placeholder = 'Escrever detalhes...',
  debounceMs = 800,
  isSaving = false,
  readOnly = false,
  minHeight = '8rem',
  className,
}: RichEditorProps) {
  const initialDoc = normalizeIncoming(value);
  const lastEmittedRef = useRef<string>(JSON.stringify(initialDoc));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitChange = useCallback(
    (editor: Editor) => {
      const json = editor.getJSON() as ProseDoc;
      const serialized = JSON.stringify(json);
      if (serialized === lastEmittedRef.current) return;
      lastEmittedRef.current = serialized;
      onChange(json);
    },
    [onChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialDoc,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose-sm max-w-none focus:outline-none px-3 py-2 text-sm leading-relaxed [&_p]:my-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-fg-muted [&_code]:rounded [&_code]:bg-bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]',
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (debounceMs <= 0) {
        emitChange(ed);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => emitChange(ed), debounceMs);
    },
  });

  // Sincroniza valor externo (ex: reload via TanStack Query) quando muda
  // de fonte real e não é eco da própria emissão.
  useEffect(() => {
    if (!editor) return;
    const incoming = normalizeIncoming(value);
    const serialized = JSON.stringify(incoming);
    if (serialized === lastEmittedRef.current) return;
    lastEmittedRef.current = serialized;
    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) {
    return (
      <div
        className="bg-bg border-border rounded-md border px-3 py-2 text-sm"
        style={{ minHeight }}
      />
    );
  }

  if (readOnly) {
    return (
      <div className={className}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div
      className={`bg-bg border-border focus-within:border-primary/40 focus-within:ring-primary/30 flex flex-col overflow-hidden rounded-md border transition-shadow focus-within:ring-1 ${className ?? ''}`}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <FooterStatus isSaving={isSaving} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isCode = editor.isActive('code');
  const isBlockquote = editor.isActive('blockquote');
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');
  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isH3 = editor.isActive('heading', { level: 3 });
  const isLink = editor.isActive('link');

  function setLink() {
    const previous = editor.getAttributes('link').href as string | undefined;
    const input = window.prompt('URL do link', previous ?? 'https://');
    if (input === null) return; // cancelar
    if (input === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    let url = input.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="border-border bg-bg-subtle flex flex-wrap items-center gap-0.5 border-b px-1 py-1">
      <ToolbarBtn
        label="Negrito (Ctrl+B)"
        active={isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Itálico (Ctrl+I)"
        active={isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Sublinhado (Ctrl+U)"
        active={isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Código inline"
        active={isCode}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={14} />
      </ToolbarBtn>
      <Separator />
      <ToolbarBtn
        label="Título 1"
        active={isH1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Título 2"
        active={isH2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Título 3"
        active={isH3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={14} />
      </ToolbarBtn>
      <Separator />
      <ToolbarBtn
        label="Lista com marcadores"
        active={isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Lista numerada"
        active={isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Citação"
        active={isBlockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={14} />
      </ToolbarBtn>
      <Separator />
      <ToolbarBtn label="Link" active={isLink} onClick={setLink}>
        <LinkIcon size={14} />
      </ToolbarBtn>
      <Separator />
      <ToolbarBtn
        label="Desfazer (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 size={14} />
      </ToolbarBtn>
      <ToolbarBtn
        label="Refazer (Ctrl+Shift+Z)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 size={14} />
      </ToolbarBtn>
    </div>
  );
}

function Separator() {
  return <span className="bg-border mx-1 h-4 w-px" aria-hidden />;
}

function ToolbarBtn({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`hover:bg-bg-muted text-fg-muted hover:text-fg inline-flex size-7 items-center justify-center rounded transition-colors disabled:opacity-40 disabled:hover:bg-transparent ${
        active ? 'bg-primary-subtle text-primary' : ''
      }`}
    >
      {children}
    </button>
  );
}

function FooterStatus({ isSaving }: { isSaving: boolean }) {
  const [savedRecently, setSavedRecently] = useState(false);
  const wasSaving = useRef(false);

  useEffect(() => {
    if (isSaving) {
      wasSaving.current = true;
      return;
    }
    if (wasSaving.current) {
      wasSaving.current = false;
      setSavedRecently(true);
      const t = setTimeout(() => setSavedRecently(false), 1800);
      return () => clearTimeout(t);
    }
    return;
  }, [isSaving]);

  if (!isSaving && !savedRecently) return null;

  return (
    <div className="border-border bg-bg-subtle text-fg-muted flex items-center justify-end border-t px-2 py-1 text-[11px]">
      <span aria-live="polite">{isSaving ? 'Salvando…' : 'Salvo'}</span>
    </div>
  );
}
