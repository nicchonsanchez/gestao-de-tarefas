'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
} from '@ktask/contracts';
import { Camera, Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react';

import { Button, Input, Label } from '@ktask/ui';
import { UserAvatar } from '@/components/user-avatar';
import { changePassword, updateProfile, uploadAvatar } from '@/lib/queries/profile';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-client';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  if (!user) {
    return (
      <div className="container py-10">
        <p className="text-fg-muted text-sm">Sessão não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <header className="mb-8 flex items-center gap-4">
        <UserAvatar name={user.name} userId={user.id} avatarUrl={user.avatarUrl} size="xl" />
        <div>
          <h1 className="text-xl font-semibold">Meu perfil</h1>
          <p className="text-fg-muted mt-0.5 text-sm">{user.email}</p>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        <AvatarForm user={user} onChange={(avatarUrl) => setUser({ ...user, avatarUrl })} />
        <ProfileForm
          initial={{ name: user.name }}
          onSuccess={(u) => setUser({ ...user, name: u.name, avatarUrl: u.avatarUrl })}
        />
        <PasswordForm />
      </div>
    </div>
  );
}

function AvatarForm({
  user,
  onChange,
}: {
  user: { id: string; name: string; avatarUrl: string | null };
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => uploadAvatar(file),
    onSuccess: (u) => {
      setError(null);
      onChange(u.avatarUrl);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao enviar a imagem.';
      setError(msg);
    },
  });

  const removeMut = useMutation({
    mutationFn: () => updateProfile({ avatarUrl: null }),
    onSuccess: () => {
      setError(null);
      onChange(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao remover.');
    },
  });

  const busy = uploadMut.isPending || removeMut.isPending;

  return (
    <Section
      title="Foto"
      description="JPG, PNG ou WEBP até 5 MB. A imagem aparece no seu avatar nos cards e comentários."
    >
      <div className="flex items-center gap-5">
        <UserAvatar name={user.name} userId={user.id} avatarUrl={user.avatarUrl} size="xl" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMut.mutate(f);
                e.target.value = '';
              }}
            />
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
              {uploadMut.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Camera size={14} />
              )}
              {user.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </Button>
            {user.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeMut.mutate()}
                disabled={busy}
                className="text-fg-muted hover:text-danger"
              >
                {removeMut.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Remover
              </Button>
            )}
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
          <p className="text-fg-subtle text-[11px]">
            A imagem é enviada direto pro storage — nenhum dado sensível trafega pela API.
          </p>
        </div>
      </div>
    </Section>
  );
}

function ProfileForm({
  initial,
  onSuccess,
}: {
  initial: { name: string };
  onSuccess: (u: { name: string; avatarUrl: string | null }) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileRequest>({
    resolver: zodResolver(UpdateProfileRequestSchema),
    defaultValues: { name: initial.name },
  });

  const mut = useMutation({
    mutationFn: (data: UpdateProfileRequest) => updateProfile(data),
    onSuccess: (u) => {
      setError(null);
      setSavedAt(Date.now());
      onSuccess({ name: u.name, avatarUrl: u.avatarUrl });
      reset({ name: u.name });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    },
  });

  return (
    <Section title="Dados pessoais" description="Atualize como seu nome aparece no sistema.">
      <form onSubmit={handleSubmit((data) => mut.mutate(data))} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" error={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
        </div>
        {error && (
          <p className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-sm">{error}</p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </Button>
          {savedAt && !isDirty && <span className="text-fg-muted text-xs">Salvo.</span>}
        </div>
      </form>
    </Section>
  );
}

function PasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordRequest>({
    resolver: zodResolver(ChangePasswordRequestSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const mut = useMutation({
    mutationFn: (data: ChangePasswordRequest) => changePassword(data),
    onSuccess: () => {
      setError(null);
      setDone(true);
      reset();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Erro ao trocar senha.');
      setDone(false);
    },
  });

  return (
    <Section
      title="Senha"
      description="Trocar a senha encerra todas as sessões (você continuará logado aqui)."
    >
      <form onSubmit={handleSubmit((data) => mut.mutate(data))} className="flex flex-col gap-4">
        <PasswordField
          id="currentPassword"
          label="Senha atual"
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          error={errors.currentPassword?.message}
          register={register('currentPassword')}
          autoComplete="current-password"
        />
        <PasswordField
          id="newPassword"
          label="Nova senha (mín. 10 caracteres)"
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
          error={errors.newPassword?.message}
          register={register('newPassword')}
          autoComplete="new-password"
        />
        {error && (
          <p className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-sm">{error}</p>
        )}
        {done && (
          <p className="bg-accent/15 text-accent rounded-md px-3 py-2 text-sm">
            Senha atualizada com sucesso.
          </p>
        )}
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Atualizar senha
          </Button>
        </div>
      </form>
    </Section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-bg rounded-lg border p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-fg-muted mt-0.5 text-xs">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PasswordField({
  id,
  label,
  show,
  onToggle,
  error,
  register,
  autoComplete,
}: {
  id: string;
  label: string;
  show: boolean;
  onToggle: () => void;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm<ChangePasswordRequest>>['register']>;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          error={!!error}
          className="pr-10"
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Ocultar' : 'Mostrar'}
          tabIndex={-1}
          className="text-fg-muted hover:text-fg absolute inset-y-0 right-0 flex w-10 items-center justify-center"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
