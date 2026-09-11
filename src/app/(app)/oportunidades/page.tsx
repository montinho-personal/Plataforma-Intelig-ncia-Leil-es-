import Link from "next/link";
import { getRepository } from "@/data";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { Badge, btnPrimary, Card, Input, Money, Pct, Select, Table, btnGhost } from "@/components/ui";

const VERDICT: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  MERECE_ANALISE: { label: "Merece análise", tone: "ok" },
  ANALISAR_COM_RESSALVAS: { label: "Com ressalvas", tone: "warn" },
  DESCARTAR: { label: "Descartar", tone: "bad" },
  SEM_DADOS: { label: "Sem dados", tone: "neutral" },
};

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const repo = await getRepository();
  const filters = {
    status: sp.f === "analise" ? "EM_ANALISE" : (sp.status ?? null),
    city: sp.city ?? null,
    type: sp.type ?? null,
    modality: sp.modality ?? null,
    favorites: sp.f === "favoritos",
    q: sp.q ?? null,
  };
  const properties = await repo.listProperties(user.groupId, filters);
  const contexts = await Promise.all(properties.map((p) => loadOpportunity(user, p.id)));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Radar</h1>
          <p className="text-xs text-fg-faint">{properties.length} imóvel(is). Ranking automático chega na Fase 4; aqui a triagem econômica já responde "merece análise?".</p>
        </div>
        {can(user, "editProperty") && (
          <Link href="/oportunidades/nova" className={btnPrimary}>
            + Cadastrar imóvel
          </Link>
        )}
      </header>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <Input name="q" placeholder="buscar título, rua, bairro, condomínio" defaultValue={sp.q ?? ""} className="w-64" />
        <Select name="status" defaultValue={sp.status ?? ""} className="w-40">
          <option value="">status: todos</option>
          {["RADAR", "TRIAGEM", "EM_ANALISE", "APROVADO", "REPROVADO", "ARREMATADO", "ENCERRADO", "DESCARTADO"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={sp.type ?? ""} className="w-40">
          <option value="">tipo: todos</option>
          {["APARTAMENTO", "CASA", "TERRENO", "COMERCIAL", "RURAL", "OUTRO"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select name="modality" defaultValue={sp.modality ?? ""} className="w-40">
          <option value="">modalidade: todas</option>
          <option value="JUDICIAL">JUDICIAL</option>
          <option value="EXTRAJUDICIAL">EXTRAJUDICIAL</option>
        </Select>
        <Input name="city" placeholder="cidade" defaultValue={sp.city ?? ""} className="w-32" />
        <button className={btnGhost} type="submit">
          Filtrar
        </button>
      </form>

      <Card>
        {properties.length === 0 ? (
          <p className="text-xs text-fg-muted">Nenhum imóvel. Cadastre manualmente ou importe CSV na tela de cadastro.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Imóvel</th>
                <th>Leilão</th>
                <th className="text-right">Lance ref.</th>
                <th className="text-right">Mercado ≈</th>
                <th className="text-right">Saída</th>
                <th className="text-right">ROI ref.</th>
                <th className="text-right">Teto</th>
                <th>Triagem</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contexts.map((ctx) => {
                if (!ctx) return null;
                const { property: p, analysis: a } = ctx;
                const v = VERDICT[a.screening.verdict]!;
                const bid = a.underwriting?.input.bid ?? p.auction?.secondCallMinBid ?? null;
                return (
                  <tr key={p.id} className="hover:bg-bg-hover">
                    <td className="font-mono text-fg-faint">{p.code}</td>
                    <td>
                      <Link href={`/oportunidades/${p.id}`} className="text-fg hover:text-accent">
                        {p.isFavorite ? "★ " : ""}
                        {p.title}
                      </Link>
                      <div className="text-xxs text-fg-faint">
                        {p.neighborhood ? `${p.neighborhood} · ` : ""}
                        {p.city} · {p.usableAreaM2} m²{p.bedrooms ? ` · ${p.bedrooms}q` : ""}
                        {p.atypicalFlags.some((f) => f.severity === "CRITICAL") && (
                          <Badge tone="hot" className="ml-2">
                            atípico
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-xxs">
                      {p.auction ? (
                        <>
                          {p.auction.modality === "JUDICIAL" ? "Judic." : "Extraj."}
                          <div className="text-fg-faint">{p.auction.secondCallAt ? new Date(p.auction.secondCallAt).toLocaleDateString("pt-BR") : "—"}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-right">
                      <Money cents={bid} />
                    </td>
                    <td className="text-right">
                      {a.valuation.marketValue ? (
                        <>
                          <Money cents={a.valuation.marketValue.amount} />
                          <div className="text-xxs text-fg-faint">
                            {a.valuation.status === "OK" ? `conf. ${a.valuation.confidence}%` : a.valuation.status === "ATYPICAL" ? "ATÍPICO" : "insuf."}
                          </div>
                        </>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Money cents={a.exitValue} />
                    </td>
                    <td className="text-right">
                      <Pct value={a.underwriting?.metrics.roi ?? null} />
                    </td>
                    <td className="text-right">{a.maxBid && !a.maxBid.blocked ? <Money cents={a.maxBid.byKey.ABSOLUTE_MAX.bid} /> : <span className="text-fg-faint">bloq.</span>}</td>
                    <td>
                      <Badge tone={v.tone}>{v.label}</Badge>
                    </td>
                    <td className="font-mono text-xxs text-fg-muted">{p.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
