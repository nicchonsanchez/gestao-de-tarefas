import { cn } from '@/lib/cn';

/**
 * Avatar unificado do sistema.
 *   - Com `avatarUrl` → renderiza <img>.
 *   - Sem `avatarUrl` → círculo com iniciais; a cor é derivada do userId
 *     (ou do nome como fallback), garantindo consistência: a mesma pessoa
 *     sempre aparece com a mesma cor em qualquer tela.
 *   - Paleta foi escolhida pra combinar com o tema Kharis (primária roxa
 *     + accent teal) sem competir com eles.
 */

export interface UserAvatarProps {
  name: string;
  userId?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize;
  /** Anel branco em volta (pro look "stacked" quando vários se sobrepõem). */
  stacked?: boolean;
  /** Força tom neutro (cinza) em vez da cor por hash. Útil pra avatars de "sistema". */
  muted?: boolean;
  title?: string;
  className?: string;
}

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
  lg: 'size-9 text-xs',
  xl: 'size-12 text-sm',
};

// Cada tupla: [bg, text]. Saturação/luminosidade controladas pra cor sempre
// ler bem sobre qualquer tema (light ou dark) e não brigar com o roxo primário.
const PALETTE: Array<[string, string]> = [
  ['bg-violet-100 dark:bg-violet-900/40', 'text-violet-700 dark:text-violet-300'],
  ['bg-teal-100 dark:bg-teal-900/40', 'text-teal-700 dark:text-teal-300'],
  ['bg-sky-100 dark:bg-sky-900/40', 'text-sky-700 dark:text-sky-300'],
  ['bg-amber-100 dark:bg-amber-900/40', 'text-amber-700 dark:text-amber-300'],
  ['bg-rose-100 dark:bg-rose-900/40', 'text-rose-700 dark:text-rose-300'],
  ['bg-emerald-100 dark:bg-emerald-900/40', 'text-emerald-700 dark:text-emerald-300'],
  ['bg-fuchsia-100 dark:bg-fuchsia-900/40', 'text-fuchsia-700 dark:text-fuchsia-300'],
  ['bg-orange-100 dark:bg-orange-900/40', 'text-orange-700 dark:text-orange-300'],
  ['bg-indigo-100 dark:bg-indigo-900/40', 'text-indigo-700 dark:text-indigo-300'],
  ['bg-cyan-100 dark:bg-cyan-900/40', 'text-cyan-700 dark:text-cyan-300'],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickColor(seed: string): [string, string] {
  return PALETTE[hashString(seed) % PALETTE.length]!;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function UserAvatar({
  name,
  userId,
  avatarUrl,
  size = 'md',
  stacked = false,
  muted = false,
  title,
  className,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const borderClass = stacked ? 'border-2 border-bg' : '';
  const resolvedTitle = title ?? name;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        title={resolvedTitle}
        className={cn(sizeClass, borderClass, 'shrink-0 rounded-full object-cover', className)}
      />
    );
  }

  const [bg, fg] = muted ? ['bg-bg-emphasis', 'text-fg-muted'] : pickColor(userId ?? name);

  return (
    <span
      title={resolvedTitle}
      className={cn(
        sizeClass,
        borderClass,
        bg,
        fg,
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        className,
      )}
      aria-hidden={!resolvedTitle}
    >
      {getInitials(name)}
    </span>
  );
}
