'use client';

import { Calendar, Cloud, GitBranch, Home, Layout, Play } from 'lucide-react';

export type CardTab = 'home' | 'flows' | 'files' | 'calendar' | 'family';

const TABS: Array<{
  key: CardTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  /** Em breve = não navega, mostra como disabled. */
  comingSoon?: boolean;
}> = [
  { key: 'home', label: 'Início', icon: Home },
  { key: 'flows', label: 'Fluxos', icon: Layout },
  { key: 'files', label: 'Arquivos', icon: Cloud, comingSoon: true },
  { key: 'calendar', label: 'Calend.', icon: Calendar, comingSoon: true },
  { key: 'family', label: 'Família', icon: GitBranch },
];

export function CardSidebarTabs({
  tab,
  onChange,
}: {
  tab: CardTab;
  onChange: (t: CardTab) => void;
}) {
  return (
    <nav className="border-border bg-bg-subtle flex w-[72px] shrink-0 flex-col items-stretch justify-between border-r">
      <div className="flex flex-col">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => !t.comingSoon && onChange(t.key)}
              disabled={t.comingSoon}
              title={t.comingSoon ? `${t.label} (em breve)` : t.label}
              className={`group/tab relative flex flex-col items-center gap-1 px-1 py-3 transition-colors ${
                active
                  ? 'bg-bg text-primary'
                  : t.comingSoon
                    ? 'text-fg-subtle cursor-not-allowed'
                    : 'text-fg-muted hover:bg-bg-muted hover:text-fg'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  aria-hidden
                  className="bg-primary absolute inset-y-0 left-0 w-[3px] rounded-r"
                />
              )}
              <Icon size={18} />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Timer (placeholder) — Time tracking de Fase 2.
          Plano em tarefas-md/18-time-tracking.md. */}
      <div className="border-border/70 flex flex-col items-center gap-1 border-t px-1 py-3">
        <button
          type="button"
          disabled
          title="Time tracking — em breve"
          aria-label="Iniciar cronômetro"
          className="bg-bg border-border text-fg-muted hover:text-primary disabled:hover:text-fg-muted flex size-9 cursor-not-allowed items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-70"
        >
          <Play size={16} className="ml-0.5" fill="currentColor" />
        </button>
        <span className="text-fg-subtle text-[9px] tabular-nums">--:--</span>
      </div>
    </nav>
  );
}
