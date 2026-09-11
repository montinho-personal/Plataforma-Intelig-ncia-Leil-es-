import { logoutAction } from "@/server/actions/auth";
import { btnGhost } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ detail?: string }> }) {
  const { detail } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg space-y-3 rounded-md border border-warn/50 bg-bg-panel p-6 text-xs">
        <div className="font-mono text-xxs uppercase tracking-widest text-fg-faint">Leilão OS</div>
        <h1 className="text-base font-semibold">Conta sem grupo</h1>
        <p className="text-fg-muted">Seu login funcionou, mas esta conta não está associada a nenhum grupo ou o banco negou o acesso. Peça a uma ADMIN para verificar a sua participação.</p>
        {detail && <p className="rounded border border-line bg-bg-raised p-2 font-mono text-xxs text-fg-muted">{detail}</p>}
        <form action={logoutAction}>
          <button className={btnGhost}>Sair</button>
        </form>
      </div>
    </main>
  );
}
