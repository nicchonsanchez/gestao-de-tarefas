import { RequireAuth } from '@/components/require-auth';
import { Topbar } from '@/components/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </RequireAuth>
  );
}
