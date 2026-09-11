import Link from "next/link";
import { getRepository } from "@/data";
import { requireUser } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { Card, Badge } from "@/components/ui";

interface Attention {
  tone: "ok" | "warn" | "hot" | "bad" | "accent";
  text: string;
  href: string;
}

export default async function HomePage() {
  const user = await requireUser();
  const repo = await getRepository();
  const properties = await repo.listProperties(user.groupId);
  const active = properties.filter((p) => !["ENCERRADO", "DESCARTADO", "REPROVADO"].includes(p.status));
  const items: Attention[] = [];
  const now = Date.now();

  const contexts = await Promise.all(active.slice(0, 40).map((p) => loadOpportunity(user, p.id)));
  let strong = 0;
  let insufficient = 0;
  let atypical = 0;
  for (const ctx of contexts) {
    if (!ctx) continue;
    const { property, analysis, approvals } = ctx;
    if (analysis.screening.verdict === "MERECE_ANALISE" && ["RADAR", "TRIAGEM"].includes(property.status)) strong++;
    if (analysis.valuation.status === "INSUFFICIENT_DATA" && ctx.comparables.length > 0) insufficient++;
    if (analysis.valuation.status === "ATYPICAL") atypical++;
    const auctionAt = property.auction?.secondCallAt ?? property.auction?.firstCallAt;
    if (auctionAt) {
      const days = (new Date(auctionAt).getTime() - now) / 86_400_000;
      if (days >= 0 && days <= 7) {
        const cap = approvals.find((a) => !a.supersededBy);
        items.push({ tone: cap ? "hot" : "bad", text: `#${property.code} ${property.title}: leilão em ${Math.ceil(days)} dia(s)${cap ? `, teto aprovado ${(cap.approvedCap / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}` : ", SEM TETO APROVADO"}`, href: `/oportunidades/${property.id}/lance-maximo` });
      }
    }
    for (const a of approvals.filter((x) => !x.supersededBy)) {
      const days = (new Date(a.validUntil).getTime() - now) / 86_400_000;
      if (days < 0) items.push({ tone: "warn", text: `#${property.code}: teto aprovado venceu em ${new Date(a.validUntil).toLocaleDateString("pt-BR")}`, href: `/oportunidades/${property.id}/memorando` });
    }
    const criticalOpen = ctx.risks.filter((r) => r.isCritical && r.status === "ABERTO").length;
    if (criticalOpen > 0 && property.status === "APROVADO") items.push({ tone: "bad", text: `#${property.code}: aprovado com ${criticalOpen} risco(s) crítico(s) em aberto`, href: `/oportunidades/${property.id}/riscos` });
  }
  if (strong > 0) items.unshift({ tone: "ok", text: `${strong} oportunidade(s) com triagem "merece análise" aguardando aprofundamento`, href: "/oportunidades?status=RADAR" });
  if (insufficient > 0) items.push({ tone: "warn", text: `${insufficient} valuation(s) com DADOS INSUFICIENTES: faltam comparáveis`, href: "/oportunidades" });
  if (atypical > 0) items.push({ tone: "hot", text: `${atypical} caso(s) atípico(s) exigindo validação especializada`, href: "/oportunidades" });
  const noComparables = contexts.filter((c) => c && c.comparables.length === 0 && ["RADAR", "TRIAGEM", "EM_ANALISE"].includes(c.property.status)).length;
  if (noComparables > 0) items.push({ tone: "accent", text: `${noComparables} imóvel(is) sem nenhum comparável cadastrado`, href: "/oportunidades" });

  const funnel = {
    cadastrados: properties.length,
    triados: properties.filter((p) => p.status !== "RADAR").length,
    emAnalise: properties.filter((p) => p.status === "EM_ANALISE").length,
    aprovados: properties.filter((p) => p.status === "APROVADO").length,
    arrematados: properties.filter((p) => p.status === "ARREMATADO").length,
    descartados: properties.filter((p) => p.status === "DESCARTADO" || p.status === "REPROVADO").length,
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-base font-semibold">O que precisa da minha atenção?</h1>
        <p className="text-xs text-fg-faint">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
      </header>

      <Card>
        {items.length === 0 ? (
          <p className="text-xs text-fg-muted">
            Nada urgente. {properties.length === 0 ? (
              <>
                Comece <Link className="text-accent underline" href="/oportunidades/nova">cadastrando um imóvel</Link>.
              </>
            ) : null}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className={{ ok: "bg-ok", warn: "bg-warn", hot: "bg-hot", bad: "bg-bad", accent: "bg-accent" }[it.tone] + " h-1.5 w-1.5 rounded-full"} />
                  {it.text}
                </div>
                <Link href={it.href} className="text-xxs text-accent hover:underline">
                  ver →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Funil">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
          <span>cadastrados {funnel.cadastrados}</span>
          <span className="text-fg-faint">→</span>
          <span>triados {funnel.triados}</span>
          <span className="text-fg-faint">→</span>
          <span>em análise {funnel.emAnalise}</span>
          <span className="text-fg-faint">→</span>
          <span>aprovados {funnel.aprovados}</span>
          <span className="text-fg-faint">→</span>
          <span>arrematados {funnel.arrematados}</span>
          <span className="ml-3 text-fg-faint">descartados/reprovados {funnel.descartados}</span>
        </div>
        <p className="mt-2 text-xxs text-fg-faint">
          Regra do produto: nenhum imóvel entra na fila jurídica antes de passar pela triagem econômica. <Badge tone="neutral">horas de jurídico evitadas</Badge> = descartados antes da análise jurídica.
        </p>
      </Card>
    </div>
  );
}
