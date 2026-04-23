'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@ktask/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/auth-store';
import { logout } from '@/lib/auth';

export function Topbar() {
  const { user } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace('/entrar');
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="border-border bg-bg-subtle border-b">
      <div className="container flex h-[52px] items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-fg flex size-7 items-center justify-center rounded-md font-bold">
            K
          </div>
          <span className="font-semibold">KTask</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="bg-primary-subtle text-primary flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            {initials || '?'}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} title="Sair">
            <LogOut size={16} />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
