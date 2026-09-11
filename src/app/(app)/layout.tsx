import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { QueryNotice } from "@/components/query-notice";
import { SetupNotice } from "@/components/setup-notice";
import { dataBackend } from "@/data";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (dataBackend() === "local" && process.env.VERCEL) return <SetupNotice />;
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <Suspense fallback={null}>
            <QueryNotice />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
