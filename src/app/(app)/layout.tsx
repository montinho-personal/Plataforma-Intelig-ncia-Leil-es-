import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
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
    <AppShell sidebar={<Sidebar user={user} />} groupName={user.groupName}>
      <Suspense fallback={null}>
        <QueryNotice />
      </Suspense>
      {children}
    </AppShell>
  );
}
