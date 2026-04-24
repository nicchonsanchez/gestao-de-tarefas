'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
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
          <nav className="flex h-[52px] items-stretch">
            {NAV.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center px-3 text-sm transition-colors ${
                    active ? 'text-primary' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {item.label}
                  {/* Indicador inferior compartilhado: ativo = roxo; hover = cinza */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3 bottom-0 h-[2px] rounded-t transition-colors ${
                      active ? 'bg-primary' : 'group-hover:bg-border-strong bg-transparent'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <NotificationsBell />
          <ThemeToggle />
          <div className="bg-border/70 mx-1 h-5 w-px" aria-hidden />
          {user && <UserMenu onLogout={handleLogout} />}
        </div>
      </div>
    </header>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-bg-muted flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserAvatar name={user.name} userId={user.id} avatarUrl={user.avatarUrl} size="md" />
        <span className="text-fg hidden max-w-[160px] truncate text-sm font-medium md:inline">
          {user.name}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="border-border bg-bg absolute right-0 top-full z-40 mt-1.5 flex w-56 flex-col overflow-hidden rounded-md border p-1 text-sm shadow-lg">
            <div className="border-border/70 border-b px-3 py-2.5">
              <p className="text-fg truncate font-medium">{user.name}</p>
              <p className="text-fg-muted mt-0.5 truncate text-[11px]">{user.email}</p>
            </div>
            <Link
              href="/configuracoes/perfil"
              onClick={() => setOpen(false)}
              className="text-fg hover:bg-bg-muted flex items-center gap-2 rounded-sm px-2 py-1.5"
            >
              <UserIcon size={14} />
              Meu perfil
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="text-danger hover:bg-danger-subtle flex items-center gap-2 rounded-sm px-2 py-1.5 text-left"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
