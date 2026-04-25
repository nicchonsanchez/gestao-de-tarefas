'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { SearchPalette } from './search-palette';

/**
 * Hospeda o SearchPalette globalmente:
 *   - Atalho `Ctrl/⌘ + K` em qualquer lugar do app abre o palette
 *   - Botão no topbar (renderizado via children) também abre
 *
 * Renderizado uma vez no layout autenticado.
 */
export function SearchHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return <SearchPalette open={open} onOpenChange={setOpen} />;
}

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => {
        // Dispara o mesmo atalho de teclado pra abrir
        const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
        document.dispatchEvent(ev);
      }}
      className="border-border/70 text-fg-muted hover:text-fg hover:border-border-strong inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-colors"
      title="Buscar (Ctrl+K)"
      aria-label="Abrir busca global"
    >
      <Search size={12} />
      <span className="hidden md:inline">Buscar...</span>
      <kbd className="border-border bg-bg-muted text-fg-muted hidden rounded border px-1 py-0.5 font-mono text-[10px] md:inline">
        Ctrl+K
      </kbd>
    </button>
  );
}
