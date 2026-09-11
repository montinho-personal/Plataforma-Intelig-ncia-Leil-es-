import Link from "next/link";
import type { CurrentUser } from "@/data/types";
import { logoutAction } from "@/server/actions/auth";
import { dataBackend } from "@/data";

const NAV: { title: string; items: { href: string; label: string; phase?: string }[] }[] = [
  { title: "", items: [{ href: "/", label: "Visão geral" }] },
  {
    title: "Oportunidades",
    items: [
      { href: "/oportunidades", label: "Radar" },
      { href: "/oportunidades?f=favoritos", label: "Favoritos" },
      { href: "/oportunidades?f=analise", label: "Em análise" },
      { href: "/comparador", label: "Comparador", phase: "F2" },
    ],
  },
  {
    title: "Negócios",
    items: [
      { href: "/oportunidades?status=APROVADO", label: "Aprovados" },
      { href: "/negocios/leiloes", label: "Leilões", phase: "F2" },
      { href: "/negocios/execucao", label: "Em execução", phase: "F5" },
    ],
  },
  {
    title: "Inteligência",
    items: [
      { href: "/inteligencia/reformas", label: "Reformas", phase: "F5" },
      { href: "/inteligencia/historico", label: "Histórico", phase: "F5" },
    ],
  },
  { title: "Financeiro", items: [{ href: "/financeiro", label: "Investimentos", phase: "F3" }] },
  { title: "Documentos", items: [{ href: "/documentos", label: "Documentos", phase: "F2" }] },
  {
    title: "Configurações",
    items: [
      { href: "/config/perfil", label: "Perfil de investimento" },
      { href: "/config/custos", label: "Taxas e custos" },
      { href: "/config/usuarias", label: "Usuárias e papéis" },
      { href: "/auditoria", label: "Auditoria" },
    ],
  },
];

export function Sidebar({ user }: { user: CurrentUser }) {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-line bg-bg-raised">
      <div className="border-b border-line px-4 py-3">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest">Leilão OS</div>
        <div className="mt-0.5 truncate text-xxs text-fg-faint">{user.groupName}</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV.map((group) => (
          <div key={group.title || "root"} className="mb-3">
            {group.title && <div className="px-2 pb-1 pt-2 text-xxs font-medium uppercase tracking-wider text-fg-faint">{group.title}</div>}
            {group.items.map((item) =>
              item.phase ? (
                <span key={item.href} className="flex items-center justify-between rounded px-2 py-1 text-xs text-fg-faint" title={`Fase ${item.phase}: ainda não construído`}>
                  {item.label}
                  <span className="font-mono text-xxs">{item.phase}</span>
                </span>
              ) : (
                <Link key={item.href} href={item.href} className="block rounded px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-fg">
                  {item.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-3 text-xxs">
        <div className="truncate text-fg">{user.name}</div>
        <div className="flex items-center justify-between text-fg-faint">
          <span className="font-mono">{user.role}</span>
          {dataBackend() === "local" ? (
            <span className="font-mono text-warn" title="Modo local: dados em .data/local.json, sem autenticação real">
              LOCAL
            </span>
          ) : (
            <form action={logoutAction}>
              <button className="hover:text-fg">sair</button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
