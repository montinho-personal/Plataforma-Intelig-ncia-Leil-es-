import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { deleteRenovationOverrideAction, updateAnalysisSettingsAction, upsertRenovationOverrideAction } from "@/server/actions/analysis";
import { Badge, btnDanger, btnGhost, btnPrimary, Card, Epistemic, Field, Input, Money, Notice, Pct, Select, Table } from "@/components/ui";
import { RENOVATION_CATEGORY_LABELS, RENOVATION_LEVEL_LABELS } from "@/domain/renovation";
import { RENOVATION_LEVELS } from "@/domain/types";

export default async function RenovationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, overrides } = ctx;
  const r = a.renovation;
  const editable = can(user, "editAnalysis");
  const categories = Object.keys(RENOVATION_CATEGORY_LABELS).filter((c) => c !== "CONTINGENCIA" && c !== "PROJETO");

  return (
    <div className="space-y-4">
      <Card
        title="Nível de intervenção"
        subtitle={`Selecionado: ${RENOVATION_LEVEL_LABELS[r.level]} · fatores: padrão ×${r.factors.standard.toFixed(2)} · idade ×${r.factors.age.toFixed(2)} · estado ×${r.factors.condition.toFixed(2)} · região ×${r.factors.region.toFixed(2)}`}
      >
        <div className="flex flex-wrap gap-2">
          {RENOVATION_LEVELS.map((level) =>
            editable ? (
              <form key={level} action={updateAnalysisSettingsAction.bind(null, id)}>
                <input type="hidden" name="renovationLevel" value={level} />
                <button className={level === r.level ? btnPrimary : btnGhost}>{RENOVATION_LEVEL_LABELS[level]}</button>
              </form>
            ) : (
              <span key={level} className={level === r.level ? btnPrimary : btnGhost}>
                {RENOVATION_LEVEL_LABELS[level]}
              </span>
            ),
          )}
        </div>
        {r.warnings.map((w) => (
          <p key={w} className="mt-2 text-xxs text-warn">
            {w}
          </p>
        ))}
        {r.requiresProfessionalQuote && <Notice tone="bad">Reforma pesada/integral em imóvel atípico: exigir orçamento profissional antes de aprovar.</Notice>}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Estimativa" className="lg:col-span-2">
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xxs uppercase tracking-wider text-fg-faint">Baixa</div>
              <div className="font-mono text-lg text-fg-muted">
                <Money cents={r.total.low} />
              </div>
            </div>
            <div>
              <div className="text-xxs uppercase tracking-wider text-fg-faint">Provável</div>
              <div className="font-mono text-xl">
                <Money cents={r.total.likely} />
              </div>
            </div>
            <div>
              <div className="text-xxs uppercase tracking-wider text-fg-faint">Alta</div>
              <div className="font-mono text-lg text-fg-muted">
                <Money cents={r.total.high} />
              </div>
            </div>
          </div>
          <p className="mb-2 text-center text-xxs text-fg-faint">
            prazo {r.durationWeeks.low}–{r.durationWeeks.likely}–{r.durationWeeks.high} semanas · contingência {(r.contingencyRate * 100).toFixed(0)}%
          </p>
          <Table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="text-right">Baixa</th>
                <th className="text-right">Provável</th>
                <th className="text-right">Alta</th>
                <th>Base</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {r.items.map((it) => {
                const ov = overrides.find((o) => o.category === it.category);
                return (
                  <tr key={it.category}>
                    <td>
                      <Epistemic status={it.epistemicStatus} title={it.source} /> {it.label}
                    </td>
                    <td className="text-right">
                      <Money cents={it.low} compact />
                    </td>
                    <td className="text-right">
                      <Money cents={it.likely} compact />
                    </td>
                    <td className="text-right">
                      <Money cents={it.high} compact />
                    </td>
                    <td className="max-w-xs truncate text-xxs text-fg-faint" title={it.source}>
                      {it.basis === "QUOTE" ? <Badge tone="ok">orçamento</Badge> : it.basis === "MANUAL" ? <Badge tone="accent">manual</Badge> : null} {it.source}
                    </td>
                    {editable && (
                      <td>
                        {ov && (
                          <form action={deleteRenovationOverrideAction.bind(null, id, ov.id)}>
                            <button className={btnDanger} title="Voltar à tabela de referência">
                              ×
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="font-medium">
                <td>Total</td>
                <td className="text-right">
                  <Money cents={r.total.low} compact />
                </td>
                <td className="text-right">
                  <Money cents={r.total.likely} compact />
                </td>
                <td className="text-right">
                  <Money cents={r.total.high} compact />
                </td>
                <td colSpan={editable ? 2 : 1}></td>
              </tr>
            </tbody>
          </Table>
          <p className="mt-2 text-xxs text-fg-faint">Tabela de referência (R$/m²) é hipótese editável do perfil. Orçamentos reais viram FATO com fonte e substituem a tabela na categoria.</p>
        </Card>

        <div className="space-y-4">
          {editable && (
            <Card title="Informar orçamento real">
              <form action={upsertRenovationOverrideAction.bind(null, id)} className="space-y-2">
                <Field label="Categoria">
                  <Select name="category">
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {RENOVATION_CATEGORY_LABELS[c as keyof typeof RENOVATION_CATEGORY_LABELS]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Baixa (R$)">
                    <Input name="low" inputMode="decimal" />
                  </Field>
                  <Field label="Provável (R$)">
                    <Input name="likely" inputMode="decimal" required />
                  </Field>
                  <Field label="Alta (R$)">
                    <Input name="high" inputMode="decimal" />
                  </Field>
                </div>
                <Field label="Fonte (fornecedor, data)">
                  <Input name="source" required placeholder="Marcenaria X, orçamento 05/09" />
                </Field>
                <Field label="Base">
                  <Select name="basis" defaultValue="QUOTE">
                    <option value="QUOTE">Orçamento (fato)</option>
                    <option value="MANUAL">Estimativa manual</option>
                  </Select>
                </Field>
                <button className={btnPrimary}>Salvar</button>
              </form>
            </Card>
          )}
        </div>
      </div>

      <Card title="Ponto ótimo de reforma" subtitle="Mais reforma não é necessariamente melhor. Cada nível: custo provável, valor de saída no prazo-alvo, prazo, lucro, ROI e TIR no lance de referência.">
        {a.renovationOptions.every((o) => o.exitValue === 0) ? (
          <p className="text-xs text-fg-muted">Sem valuation: cadastre comparáveis para comparar níveis.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nível</th>
                <th className="text-right">Custo provável</th>
                <th className="text-right">Saída {a.exitHorizonDays} d</th>
                <th className="text-right">Meses</th>
                <th className="text-right">Lucro</th>
                <th className="text-right">ROI</th>
                <th className="text-right">TIR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {a.renovationOptions.map((o) => (
                <tr key={o.level} className={o.isSelected ? "bg-accent/5" : ""}>
                  <td>
                    {RENOVATION_LEVEL_LABELS[o.level]} {o.isSelected && <span className="text-xxs text-accent">selecionado</span>}
                  </td>
                  <td className="text-right">
                    <Money cents={o.estimate.total.likely} />
                  </td>
                  <td className="text-right">
                    <Money cents={o.exitValue} />
                  </td>
                  <td className="text-right font-mono">{o.months}</td>
                  <td className="text-right">
                    <Money cents={o.underwriting.metrics.netProfit} />
                  </td>
                  <td className="text-right">
                    <Pct value={o.underwriting.metrics.roi} />
                  </td>
                  <td className="text-right">
                    <Pct value={o.underwriting.metrics.irrAnnual} digits={0} />
                  </td>
                  <td>{o.isBest && <Badge tone="ok">melhor ROI</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
