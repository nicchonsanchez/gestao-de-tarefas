'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@ktask/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/auth-store';
import { logout } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/quadros', label: 'Quadros' },
];

export function Topbar() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary text-primary-fg flex size-7 items-center justify-center rounded-md font-bold">
              K
            </div>
            <span className="font-semibold">KTask</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'bg-primary-subtle text-primary'
                      : 'text-fg-muted hover:bg-bg-emphasis hover:text-fg'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
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
