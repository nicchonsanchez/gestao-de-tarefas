'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { ORG_ROLE_LABELS } from '@ktask/contracts';

import { Button } from '@ktask/ui';
import { acceptInvitation, previewInvitation } from '@/lib/queries/members';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const { user, initialized } = useAuthStore();

  const preview = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => previewInvitation(token),
    retry: false,
  });

  const acceptMut = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: () => router.replace('/'),
  });

  // Redireciona para login se não autenticado; login deve voltar pra cá
  useEffect(() => {
    if (initialized && !user) {
      router.replace(`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`);
    }
  }, [initialized, user, router, token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-bg-subtle border-border w-full max-w-md rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-primary text-primary-fg flex size-10 items-center justify-center rounded-md font-bold">
            K
          </div>
          <div>
            <h1 className="font-semibold">Convite para KTask</h1>
            <p className="text-fg-muted text-xs">Aceite para entrar na organização</p>
          </div>
        </div>

        {preview.isLoading && (
          <div className="text-fg-muted flex items-center gap-2 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Verificando convite...
          </div>
        )}

        {preview.error && <InviteError error={preview.error as unknown as Error} />}

        {preview.data && user && (
          <AcceptView
            preview={preview.data}
            userEmail={user.email}
            accepting={acceptMut.isPending}
            onAccept={() => acceptMut.mutate()}
            errorMessage={acceptMut.error instanceof ApiError ? acceptMut.error.message : null}
          />
        )}
      </div>
    </div>
  );
}

function InviteError({ error }: { error: Error }) {
  const message = error instanceof ApiError ? error.message : 'Convite inválido ou expirado.';
  return (
    <div className="bg-danger-subtle text-danger rounded-md px-3 py-3 text-sm">
      <p className="font-medium">Não foi possível abrir o convite</p>
      <p className="text-xs">{message}</p>
    </div>
  );
}

function AcceptView({
  preview,
  userEmail,
  accepting,
  onAccept,
  errorMessage,
}: {
  preview: {
    email: string;
    role: keyof typeof ORG_ROLE_LABELS;
    expiresAt: string;
    organization: { name: string };
  };
  userEmail: string;
  accepting: boolean;
  onAccept: () => void;
  errorMessage: string | null;
}) {
  const mismatch = preview.email.toLowerCase() !== userEmail.toLowerCase();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border rounded-lg border p-4">
        <p className="text-fg-muted text-xs">Você foi convidado para</p>
        <p className="text-xl font-semibold">{preview.organization.name}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-fg-muted">E-mail do convite:</dt>
          <dd className="font-medium">{preview.email}</dd>
          <dt className="text-fg-muted">Papel:</dt>
          <dd className="font-medium">{ORG_ROLE_LABELS[preview.role]}</dd>
          <dt className="text-fg-muted">Expira em:</dt>
          <dd className="font-medium">{new Date(preview.expiresAt).toLocaleString('pt-BR')}</dd>
        </dl>
      </div>

      {mismatch && (
        <p className="bg-warning-subtle text-warning rounded-md px-3 py-2 text-xs">
          O convite foi enviado para <strong>{preview.email}</strong>, mas você está autenticado
          como <strong>{userEmail}</strong>. Faça login com a conta correta.
        </p>
      )}

      {errorMessage && (
        <p className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-xs">{errorMessage}</p>
      )}

      <Button
        onClick={() => {
          setAccepted(true);
          onAccept();
        }}
        disabled={mismatch || accepting || accepted}
      >
        {accepting ? <Loader2 size={14} className="animate-spin" /> : <MailCheck size={14} />}
        Aceitar convite
      </Button>

      {!mismatch && (
        <p className="text-fg-subtle flex items-center gap-1 text-xs">
          <ShieldCheck size={12} /> Você será adicionado como{' '}
          <strong>{ORG_ROLE_LABELS[preview.role]}</strong>.
        </p>
      )}
    </div>
  );
}
