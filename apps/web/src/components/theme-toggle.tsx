'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-9" aria-hidden />;
  }

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const icon =
    theme === 'dark' ? (
      <Moon size={16} />
    ) : theme === 'light' ? (
      <Sun size={16} />
    ) : (
      <Monitor size={16} />
    );

  const label =
    theme === 'dark' ? 'Tema escuro' : theme === 'light' ? 'Tema claro' : 'Usar tema do sistema';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Tema atual: ${label}. Clique para alternar.`}
      title={label}
      className={cn(
        'flex size-9 items-center justify-center rounded-md',
        'text-fg-muted hover:bg-bg-emphasis hover:text-fg transition-colors',
      )}
    >
      {icon}
    </button>
  );
}
