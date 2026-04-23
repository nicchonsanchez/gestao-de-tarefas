'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Users, Layers, Loader2, Lock, Globe2 } from 'lucide-react';

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@ktask/ui';
import { boardsQueries, createBoard, type BoardListItem } from '@/lib/queries/boards';
import { ApiError } from '@/lib/api-client';

const CreateSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres.').max(120),
  description: z.string().max(1000).optional(),
});
type CreateInput = z.infer<typeof CreateSchema>;

export default function BoardsPage() {
  const boards = useQuery(boardsQueries.all());
  const [open, setOpen] = useState(false);

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Seus quadros</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Kanban para organizar fluxos, tarefas e responsáveis.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} />
              Novo quadro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar quadro</DialogTitle>
              <DialogDescription>
                Ele já virá com 3 listas padrão: A Fazer, Fazendo, Concluído.
              </DialogDescription>
            </DialogHeader>
            <CreateBoardForm onCreated={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {boards.isLoading && (
        <div className="text-fg-muted flex items-center gap-2 text-sm">
          <Loader2 size={16} className="animate-spin" /> Carregando quadros...
        </div>
      )}

      {boards.data && boards.data.length === 0 && (
        <div className="border-border bg-bg-subtle rounded-lg border border-dashed p-10 text-center">
          <Layers size={32} className="text-fg-muted mx-auto" />
          <p className="mt-3 text-sm font-medium">Nenhum quadro ainda</p>
          <p className="text-fg-muted mt-1 text-xs">
            Crie seu primeiro quadro para começar a organizar tarefas.
          </p>
        </div>
      )}

      {boards.data && boards.data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.data.map((b) => (
            <BoardCard key={b.id} board={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BoardCard({ board }: { board: BoardListItem }) {
  const color = board.color ?? 'hsl(var(--primary))';
  return (
    <Link
      href={`/b/${board.id}`}
      className="border-border bg-bg-subtle hover:bg-bg-muted group relative overflow-hidden rounded-lg border p-4 transition-colors"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold">{board.name}</h3>
        {board.visibility === 'PRIVATE' ? (
          <Lock size={14} className="text-fg-muted shrink-0" aria-label="Privado" />
        ) : (
          <Globe2 size={14} className="text-fg-muted shrink-0" aria-label="Toda a empresa" />
        )}
      </div>
      {board.description && (
        <p className="text-fg-muted line-clamp-2 text-xs">{board.description}</p>
      )}
      <div className="text-fg-subtle mt-4 flex items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1">
          <Layers size={12} /> {board.cardsCount} cards
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={12} /> {board.membersCount}
        </span>
      </div>
    </Link>
  );
}

function CreateBoardForm({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateInput>({ resolver: zodResolver(CreateSchema) });

  const mutation = useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      reset();
      onCreated();
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível criar o quadro.');
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-name">Nome</Label>
        <Input
          id="board-name"
          placeholder="Vendas 2026"
          autoFocus
          error={!!errors.name}
          {...register('name')}
        />
        {errors.name && <p className="text-danger text-xs">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="board-desc">Descrição (opcional)</Label>
        <Input id="board-desc" placeholder="Prospecção e fechamento" {...register('description')} />
      </div>

      {submitError && (
        <p role="alert" className="bg-danger-subtle text-danger rounded-md px-3 py-2 text-sm">
          {submitError}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Criar quadro
        </Button>
      </DialogFooter>
    </form>
  );
}
