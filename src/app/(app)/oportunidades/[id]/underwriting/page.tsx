import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity, referenceBidFor } from "@/server/analysis";
import { updateAnalysisSettingsAction } from "@/server/actions/analysis";
import { btnGhost, Card, Epistemic, Field, Input, Money, Notice, Pct, Table } from "@/components/ui";

const GROUP_LABEL = { AQUISICAO: "Aquisição", OPERACAO: "Operação", VENDA: "Venda", TRIBUTOS: "Tributos", EQUIPE: "Equipe", CAPITAL: "Capital" } as const;

export default async function UnderwritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, settings, property: p } = ctx;
  const uw = a.underwriting;
  const editable = can(user, "editAnalysis");

  return (
    <div className="space-y-4">
      <Card title="Premissas" subtitle="O underwriting usa o VALOR DE SAÍDA no prazo-alvo, não o valor de mercado nem a avaliação do edital.">
        <form action={updateAnalysisSettingsAction.bind(null, id)} className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Field label="Lance de referência (R$)" hint={p.auction?.secondCallMinBid ? "vazio = lance mínimo da 2ª praça" : "vazio = 0"}>
            <Input name="referenceBid" defaultValue={settings.referenceBid ? (settings.referenceBid / 100).toLocaleString("pt-BR") : ""} inputMode="decimal" placeholder={(referenceBidFor(p, { ...settings, referenceBid: null }) / 100).toLocaleString("pt-BR")} disabled={!editable} />
          </Field>
          <Field label="Meses de desocupação" hint={`vazio = perfil (${p.occupancy === "DESOCUPADO" ? "0, desocupado" : ctx.profile.defaultEvictionMonthsIfOccupied})`}>
            <Input name="evictionMonths" defaultValue={settings.evictionMonths ?? ""} inputMode="numeric" disabled={!editable} />
          </Field>
          <Field label="Custo de desocupação (R$)" hint="acordo, ação, mudança">
            <Input name="evictionCost" defaultValue={settings.evictionCost ? (settings.evictionCost / 100).toLocaleString("pt-BR") : ""} inputMode="decimal" disabled={!editable} />
          </Field>
          <Field label="Meses de venda após obra" hint={`vazio = perfil (${ctx.profile.defaultHoldingMonths})`}>
            <Input name="holdingMonths" defaultValue={settings.holdingMonths ?? ""} inputMode="numeric" disabled={!editable} />
          </Field>
          <div className="flex items-end">{editable && <button className={btnGhost}>Recalcular</button>}</div>
        </form>
      </Card>

      {!uw ? (
        <Notice tone="warn">Sem valuation: cadastre comparáveis para calcular o underwriting.</Notice>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title={`Linhas de custo · lance ${(uw.input.bid / 100).toLocaleString("pt-BR")} · saída ${(uw.input.exitValue / 100).toLocaleString("pt-BR")} · ${uw.metrics.months} meses`} className="lg:col-span-2">
            <Table>
              <tbody>
                <tr className="font-medium">
                  <td>Lance</td>
                  <td></td>
                  <td className="text-right">
                    <Money cents={uw.input.bid} />
                  </td>
                  <td className="text-xxs text-fg-faint">referência</td>
                </tr>
                {(["AQUISICAO", "OPERACAO"] as const).map((g) => (
                  <Group key={g} g={g} lines={uw.lines.filter((l) => l.group === g)} />
                ))}
                <tr className="border-t border-line-strong font-medium">
                  <td>= Capital necessário</td>
                  <td></td>
                  <td className="text-right">
                    <Money cents={uw.metrics.capitalNeeded} />
                  </td>
                  <td className="text-xxs text-fg-faint">pico de caixa</td>
                </tr>
                {(["VENDA", "TRIBUTOS", "EQUIPE"] as const).map((g) => (
                  <Group key={g} g={g} lines={uw.lines.filter((l) => l.group === g)} />
                ))}
                <tr className="border-t border-line-strong font-medium">
                  <td>= Custo total (caixa)</td>
                  <td></td>
                  <td className="text-right">
                    <Money cents={uw.metrics.totalCost} />
                  </td>
                  <td></td>
                </tr>
                <Group g="CAPITAL" lines={uw.lines.filter((l) => l.group === "CAPITAL")} />
              </tbody>
            </Table>
            {uw.warnings.map((w) => (
              <p key={w} className="mt-1 text-xxs text-warn">
                {w}
              </p>
            ))}
          </Card>

          <Card title="Resultado">
            <Table>
              <tbody>
                <Row label="Valor de saída">
                  <Money cents={uw.input.exitValue} />
                </Row>
                <Row label="Lucro bruto (saída − capital)">
                  <Money cents={uw.metrics.grossProfit} />
                </Row>
                <Row label="Lucro líquido" strong>
                  <Money cents={uw.metrics.netProfit} />
                </Row>
                <Row label="Lucro econômico (− custo do capital)">
                  <Money cents={uw.metrics.economicProfit} />
                </Row>
                <Row label="ROI" strong>
                  <Pct value={uw.metrics.roi} />
                </Row>
                <Row label="ROE">
                  <Pct value={uw.metrics.roe} />
                </Row>
                <Row label="TIR anual" strong>
                  <Pct value={uw.metrics.irrAnnual} />
                </Row>
                <Row label="Margem sobre venda">
                  <Pct value={uw.metrics.margin} />
                </Row>
                <Row label="Retorno mensal equivalente">
                  <Pct value={uw.metrics.monthlyEquivalent} digits={2} />
                </Row>
                <Row label="Retorno anualizado">
                  <Pct value={uw.metrics.annualized} />
                </Row>
                <Row label="Capital-meses (R$)">
                  <span className="font-mono">{uw.metrics.capitalMonths.toLocaleString("pt-BR")}</span>
                </Row>
                <Row label="Lucro por mês de capital">
                  <Money cents={uw.metrics.profitPerMonth} />
                </Row>
              </tbody>
            </Table>
            <p className="mt-2 text-xxs text-fg-faint">ROE = ROI sem financiamento. Custo do capital é custo de oportunidade (não sai do caixa), mostrado à parte para não esconder capital parado.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Group({ g, lines }: { g: keyof typeof GROUP_LABEL; lines: { key: string; label: string; amount: number; rate?: number; status: "FACT" | "ESTIMATE" | "HYPOTHESIS" | "MISSING"; source: string }[] }) {
  if (lines.length === 0) return null;
  return (
    <>
      <tr>
        <td colSpan={4} className="pt-2 text-xxs uppercase tracking-wider text-fg-faint">
          {GROUP_LABEL[g]}
        </td>
      </tr>
      {lines.map((l) => (
        <tr key={l.key}>
          <td>
            <Epistemic status={l.status} title={l.source} /> {l.label}
          </td>
          <td className="text-right font-mono text-xxs text-fg-faint">{l.rate !== undefined ? `${(l.rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : ""}</td>
          <td className="text-right">
            <Money cents={l.amount} />
          </td>
          <td className="max-w-[16rem] truncate text-xxs text-fg-faint" title={l.source}>
            {l.source}
          </td>
        </tr>
      ))}
    </>
  );
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <tr className={strong ? "font-medium" : ""}>
      <td>{label}</td>
      <td className="text-right">{children}</td>
    </tr>
  );
}
