'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@ktask/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationsBell } from '@/components/notifications-bell';
import { UserAvatar } from '@/components/user-avatar';
import { useAuthStore } from '@/stores/auth-store';
import { logout } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Início' },
  { href: '/quadros', label: 'Quadros' },
  { href: '/configuracoes/membros', label: 'Membros' },
];

export function Topbar() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.replace('/entrar');
  }

  return (
    <header className="border-border bg-bg sticky top-0 z-30 border-b">
      <div className="container flex h-[52px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 transition-opacity hover:opacity-85"
            aria-label="Ir para o início"
          >
            <Image
              src="/kharis-icon.png"
              alt="Kharis"
              width={28}
              height={28}
              priority
              className="shrink-0"
            />
            <span className="text-[15px] font-semibold tracking-tight">KTask</span>
          </Link>
          <div className="bg-border/70 h-5 w-px shrink-0" aria-hidden />
          <nav className="flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? 'text-primary' : 'text-fg-muted hover:bg-bg-muted hover:text-fg'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      className="bg-primary absolute inset-x-3 -bottom-[13px] h-[2px] rounded-t"
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationsBell />
          <ThemeToggle />
          <div className="bg-border/70 mx-1 h-5 w-px" aria-hidden />
          {user && (
            <div className="flex items-center gap-2 pr-1">
              <UserAvatar name={user.name} userId={user.id} avatarUrl={user.avatarUrl} size="md" />
              <span className="text-fg hidden max-w-[160px] truncate text-sm font-medium md:inline">
                {user.name}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Sair"
            className="text-fg-muted hover:text-fg"
          >
            <LogOut size={16} />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
