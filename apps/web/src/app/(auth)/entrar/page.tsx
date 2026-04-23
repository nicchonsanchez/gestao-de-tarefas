'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@ktask/contracts';
import { Loader2, LogIn } from 'lucide-react';

import { Button, Input, Label } from '@ktask/ui';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, initialized } = useAuthStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  useEffect(() => {
    if (initialized && user) {
      router.replace(params.get('next') ?? '/');
    }
  }, [initialized, user, router, params]);

  async function onSubmit(values: LoginRequest) {
    setSubmitError(null);
    try {
      await login(values);
      router.replace(params.get('next') ?? '/');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Não foi possível entrar. Tente novamente.');
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-bg-subtle border-border w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="bg-primary text-primary-fg flex size-9 items-center justify-center rounded-md font-bold">
            K
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">KTask</h1>
            <p className="text-fg-muted mt-1 text-xs">Gestão de tarefas da Kharis</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="voce@kharis.com.br"
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && <p className="text-danger text-xs">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              error={!!errors.password}
              {...register('password')}
            />
            {errors.password && <p className="text-danger text-xs">{errors.password.message}</p>}
          </div>

          {submitError && (
            <div
              role="alert"
              className="bg-danger-subtle text-danger rounded-md border border-transparent px-3 py-2 text-sm"
            >
              {submitError}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn size={16} />
                Entrar
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
