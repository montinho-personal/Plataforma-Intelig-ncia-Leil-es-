/** Exibido quando a aplicação está publicada sem as variáveis do Supabase configuradas. */
export function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-xl space-y-3 rounded-md border border-warn/50 bg-bg-panel p-6 text-xs">
        <div className="font-mono text-xxs uppercase tracking-widest text-fg-faint">Leilão OS</div>
        <h1 className="text-base font-semibold">Configuração pendente</h1>
        <p className="text-fg-muted">
          Esta instalação está rodando em servidor sem banco configurado. O modo local (arquivo JSON) só funciona em desenvolvimento.
        </p>
        <p className="text-fg-muted">Defina as variáveis de ambiente do projeto e faça um novo deploy:</p>
        <pre className="rounded border border-line bg-bg-raised p-3 font-mono text-xxs text-fg">
{`DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`}
        </pre>
      </div>
    </main>
  );
}
