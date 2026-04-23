'use client';

import { useEffect } from 'react';
import { bootstrapSession } from '@/lib/auth';

/**
 * Ao montar, tenta refresh da sessão (via cookie httpOnly).
 * Roda uma vez no client-side — server components não têm acesso ao cookie de forma simples
 * e a sessão é totalmente client-driven no MVP.
 */
export function SessionBootstrap() {
  useEffect(() => {
    bootstrapSession();
  }, []);
  return null;
}
