'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Wrapper client-side: redireciona para /entrar se não houver sessão após
 * bootstrap terminar. Enquanto inicializa, mostra um loader sutil.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (initialized && !user) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/entrar?next=${next}`);
    }
  }, [initialized, user, router, pathname]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 size={20} className="text-fg-muted animate-spin" />
      </div>
    );
  }

  if (!user) return null; // redirect em andamento

  return <>{children}</>;
}
