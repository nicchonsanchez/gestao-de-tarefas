import { CheckCircle2, Sparkles, Zap, MessageCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-bg-subtle border-b">
        <div className="container flex h-[52px] items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-fg flex size-7 items-center justify-center rounded-md font-bold">
              K
            </div>
            <span className="font-semibold">KTask</span>
            <span className="border-border text-fg-muted rounded-md border px-2 py-0.5 text-xs">
              Fase 0 · Fundação
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center justify-center gap-10 py-16">
        <section className="max-w-2xl text-center">
          <div className="border-border bg-bg-subtle text-fg-muted mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <Sparkles size={14} className="text-primary" />
            Sistema de gestão de tarefas da Kharis
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[48px]">
            Gestão de tarefas e fluxos,
            <br />
            <span className="text-primary">feito sob medida</span>.
          </h1>
          <p className="text-fg-muted mt-4 text-base">
            Kanban colaborativo em tempo real, engine de automações e integração nativa com WhatsApp
            via Evolution API. Multi-tenant desde o dia zero.
          </p>
        </section>

        <section className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={<Zap size={18} />}
            title="Automações"
            description="Gatilho → condições → ações, com execução assíncrona em fila."
          />
          <FeatureCard
            icon={<MessageCircle size={18} />}
            title="WhatsApp nativo"
            description="Disparos via Evolution API direto das automações."
          />
          <FeatureCard
            icon={<CheckCircle2 size={18} />}
            title="Real-time"
            description="Socket.IO com presença e sincronização instantânea."
          />
        </section>

        <section className="text-fg-muted flex flex-col items-center gap-3 text-sm">
          <p>
            Status:{' '}
            <span className="bg-primary-subtle text-primary rounded-md px-2 py-0.5 font-medium">
              Fase 0 em andamento
            </span>
          </p>
          <p className="text-xs">
            API:{' '}
            <a
              href={process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
              className="hover:text-fg underline decoration-dotted"
              target="_blank"
              rel="noreferrer"
            >
              {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}
            </a>
          </p>
        </section>
      </main>

      <footer className="border-border text-fg-subtle border-t py-4 text-center text-xs">
        KTask · Kharis · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border bg-bg-subtle hover:bg-bg-muted rounded-lg border p-4 transition-colors">
      <div className="bg-primary-subtle text-primary mb-2 inline-flex size-8 items-center justify-center rounded-md">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-fg-muted mt-1 text-xs">{description}</p>
    </div>
  );
}
