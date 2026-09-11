import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { createRiskAction, updateRiskStatusAction } from "@/server/actions/decisions";
import { Badge, btnGhost, btnPrimary, Card, Field, Input, Select, Table, Textarea } from "@/components/ui";

const CATEGORIES = ["JURIDICO", "FINANCEIRO", "MERCADO", "OCUPACAO", "REFORMA", "LIQUIDEZ", "DOCUMENTAL"];

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { risks, analysis: a, property: p } = ctx;
  const editable = can(user, "editRisks");

  const suggested: string[] = [];
  if (p.occupancy === "DESCONHECIDO") suggested.push("OCUPAÇÃO desconhecida: prazo e custo de desocupação incertos (cenários já carregam meses extras).");
  if (!p.auction?.condoDebt && !p.auction?.iptuDebt) suggested.push("DOCUMENTAL: débitos de condomínio/IPTU não localizados no cadastro — tratados como AUSENTE, não como zero.");
  if (a.valuation.status === "INSUFFICIENT_DATA") suggested.push("MERCADO: valuation com dados insuficientes.");
  if (a.valuation.status === "ATYPICAL") suggested.push("MERCADO/REFORMA: caso atípico, estimativas genéricas pouco confiáveis.");
  if (a.renovation.level === "HEAVY" || a.renovation.level === "FULL") suggested.push("REFORMA: nível pesado/integral sem orçamento profissional.");
  if (a.valuation.liquidityClass === "BAIXA") suggested.push("LIQUIDEZ: micromercado de baixa liquidez; desconto por prazo elevado.");

  return (
    <div className="space-y-4">
      <Card title="Riscos registrados" subtitle="Cada risco: fato · risco · impacto · ação · probabilidade × impacto. Risco crítico nunca é diluído em média: aparece no cabeçalho e no memorando.">
        {risks.length === 0 ? (
          <p className="text-xs text-fg-muted">Nenhum risco registrado.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Fato → risco</th>
                <th>Impacto / ação</th>
                <th className="text-right">P × I</th>
                <th>Status</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id} className={r.status !== "ABERTO" ? "opacity-60" : ""}>
                  <td>
                    <Badge tone={r.isCritical ? "bad" : "neutral"}>{r.category}</Badge>
                  </td>
                  <td>
                    <div className="text-fg-muted">{r.fact}</div>
                    <div>{r.risk}</div>
                  </td>
                  <td className="text-xxs text-fg-muted">
                    {r.impact && <div>{r.impact}</div>}
                    {r.recommendedAction && <div className="text-accent">→ {r.recommendedAction}</div>}
                  </td>
                  <td className="text-right font-mono">
                    {r.probability}×{r.impactScore}={r.probability * r.impactScore}
                    {r.isCritical && <span className="ml-1 text-bad">!</span>}
                  </td>
                  <td className="font-mono text-xxs">{r.status}</td>
                  {editable && (
                    <td>
                      <form action={updateRiskStatusAction.bind(null, id, r.id)} className="flex gap-1">
                        <Select name="status" defaultValue={r.status} className="w-28">
                          {["ABERTO", "MITIGADO", "ACEITO", "ENCERRADO"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                        <button className={btnGhost}>ok</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {suggested.length > 0 && (
        <Card title="Sinais automáticos (não são riscos registrados até você confirmar)">
          <ul className="space-y-1 text-xs text-fg-muted">
            {suggested.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Card>
      )}

      {editable && (
        <Card title="Registrar risco">
          <form action={createRiskAction.bind(null, id)} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Categoria">
              <Select name="category">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Probabilidade (1–5)">
              <Input name="probability" defaultValue={3} inputMode="numeric" />
            </Field>
            <Field label="Impacto (1–5)">
              <Input name="impactScore" defaultValue={3} inputMode="numeric" />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-xs">
              <input type="checkbox" name="isCritical" /> crítico (P×I ≥ 15 marca automaticamente)
            </label>
            <Field label="Fato (com fonte: edital p.X, matrícula, visita)" className="md:col-span-2">
              <Input name="fact" required />
            </Field>
            <Field label="Risco" className="md:col-span-2">
              <Input name="risk" required />
            </Field>
            <Field label="Impacto" className="md:col-span-2">
              <Textarea name="impact" rows={2} />
            </Field>
            <Field label="Ação recomendada" className="md:col-span-2">
              <Textarea name="recommendedAction" rows={2} />
            </Field>
            <div>
              <button className={btnPrimary}>Registrar</button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
