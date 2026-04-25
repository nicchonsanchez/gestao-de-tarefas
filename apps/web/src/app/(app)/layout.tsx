import { RequireAuth } from '@/components/require-auth';
import { SearchHost } from '@/components/search-host';
import { Topbar } from '@/components/topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <Topbar />
        <main className="flex-1">{children}</main>
        <SearchHost />
      </div>
    </RequireAuth>
  );
}
