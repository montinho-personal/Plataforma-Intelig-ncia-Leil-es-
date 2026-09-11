import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { createComparableAction, deleteComparableAction, excludeComparableAction, importComparablesCsvAction, includeComparableAction, setLiquidityAction } from "@/server/actions/comparables";
import { Badge, btnDanger, btnGhost, btnPrimary, Card, Disclosure, Field, Input, Money, Notice, Select, Table, Textarea } from "@/components/ui";

const STANDARDS = ["", "ECONOMICO", "MEDIO", "ALTO", "LUXO"];
const CONDITIONS = ["", "RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"];

export default async function ComparablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { comparables, analysis: a, property: p } = ctx;
  const editable = can(user, "editAnalysis");
  const byId = new Map(a.valuation.comparables.map((c) => [c.id, c]));
  const stats = a.valuation.stats;

  async function importCsv(fd: FormData) {
    "use server";
    await importComparablesCsvAction(id, fd);
  }

  return (
    <div className="space-y-4">
      <Card
        title={`Comparáveis (${comparables.length} · ${stats?.included ?? 0} incluídos · n efetivo ${stats ? stats.effectiveN.toFixed(1) : "0"})`}
        subtitle={
          stats ? (
            <>
              mediana ponderada <span className="font-mono">R$ {Math.round(stats.medianPricePerM2 / 100).toLocaleString("pt-BR")}/m²</span> · média{" "}
              <span className="font-mono">R$ {Math.round(stats.meanPricePerM2 / 100).toLocaleString("pt-BR")}/m²</span> · P25–P75{" "}
              <span className="font-mono">
                {Math.round(stats.p25PricePerM2 / 100).toLocaleString("pt-BR")}–{Math.round(stats.p75PricePerM2 / 100).toLocaleString("pt-BR")}
              </span>{" "}
              · CV <span className="font-mono">{(stats.coefficientOfVariation * 100).toFixed(1)}%</span> · similaridade média <span className="font-mono">{stats.averageSimilarity.toFixed(2)}</span>
              {stats.averageDataAgeDays !== null && <> · dados com {Math.round(stats.averageDataAgeDays)} dias em média</>}
            </>
          ) : (
            "Cadastre ao menos 3 comparáveis similares (mesmo condomínio, rua ou bairro)."
          )
        }
      >
        {a.valuation.status !== "OK" && comparables.length > 0 && <Notice tone={a.valuation.status === "ATYPICAL" ? "bad" : "warn"}>{a.valuation.statusReasons.join(" · ")}</Notice>}
        <Table className="mt-2">
          <thead>
            <tr>
              <th>✓</th>
              <th>Fonte / local</th>
              <th className="text-right">m²</th>
              <th className="text-right">Q</th>
              <th className="text-right">V</th>
              <th>Estado</th>
              <th className="text-right">Preço</th>
              <th className="text-right">R$/m²</th>
              <th className="text-right">Ajustado</th>
              <th className="text-right">Sim.</th>
              <th>Ajustes</th>
              {editable && <th></th>}
            </tr>
          </thead>
          <tbody>
            {comparables.map((c) => {
              const v = byId.get(c.id);
              const loc = c.sameCondo ? "mesmo condomínio" : c.sameStreet ? "mesma rua" : c.distanceM ? `${c.distanceM} m` : c.sameNeighborhood ? "mesmo bairro" : "localização não informada";
              return (
                <tr key={c.id} className={c.excluded ? "opacity-50" : ""}>
                  <td>{c.excluded ? "✗" : v?.weak ? <span title="similaridade baixa">△</span> : "✓"}</td>
                  <td>
                    <div>
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="hover:text-accent">
                          {c.source}
                        </a>
                      ) : (
                        c.source
                      )}{" "}
                      <Badge tone={c.kind === "LISTING" ? "neutral" : "ok"}>{c.kind === "LISTING" ? "anúncio" : c.kind === "SOLD" ? "vendido" : "histórico"}</Badge>
                    </div>
                    <div className="text-xxs text-fg-faint">
                      {loc}
                      {c.address ? ` · ${c.address}` : ""}
                      {c.capturedAt ? ` · ${new Date(c.capturedAt).toLocaleDateString("pt-BR")}` : ""}
                      {c.daysOnMarket ? ` · ${c.daysOnMarket} dias anunciado` : ""}
                      {c.excluded && <span className="text-bad"> · excluído: {c.excludedReason}</span>}
                    </div>
                  </td>
                  <td className="text-right font-mono">{c.usableAreaM2}</td>
                  <td className="text-right font-mono">{c.bedrooms ?? "—"}</td>
                  <td className="text-right font-mono">{c.parking ?? "—"}</td>
                  <td className="text-xxs">{c.condition ?? "—"}</td>
                  <td className="text-right">
                    <Money cents={c.price} />
                  </td>
                  <td className="text-right font-mono">{v ? Math.round(v.rawPricePerM2 / 100).toLocaleString("pt-BR") : "—"}</td>
                  <td className="text-right font-mono">{v ? Math.round(v.adjustedPricePerM2 / 100).toLocaleString("pt-BR") : "—"}</td>
                  <td className="text-right font-mono">{v ? v.similarity.toFixed(2) : "—"}</td>
                  <td className="text-xxs text-fg-muted">{v?.adjustments.map((x) => `${x.note} ${(x.delta * 100).toFixed(0)}%`).join(" · ") || "—"}</td>
                  {editable && (
                    <td className="whitespace-nowrap">
                      {c.excluded ? (
                        <form action={includeComparableAction.bind(null, id, c.id)} className="inline">
                          <button className={btnGhost}>incluir</button>
                        </form>
                      ) : (
                        <form action={excludeComparableAction.bind(null, id, c.id)} className="inline-flex gap-1">
                          <input name="reason" placeholder="motivo" required className="w-28 rounded border border-line-strong bg-bg-raised px-1 py-0.5 text-xxs" />
                          <button className={btnGhost}>excluir</button>
                        </form>
                      )}{" "}
                      <form action={deleteComparableAction.bind(null, id, c.id)} className="inline">
                        <button className={btnDanger} title="Apagar registro (auditado)">
                          ×
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
        <p className="mt-2 text-xxs text-fg-faint">
          Ajustes trazem o comparável ao imóvel-alvo (estado, padrão, vagas, dormitórios, andar) e descontam anúncio→fechamento em anúncios. Coeficientes são hipóteses do perfil. Similaridade combina localização, área, dormitórios, vagas, andar, idade, padrão e estado (média geométrica ponderada); o peso é similaridade².
        </p>
      </Card>

      <Card title="Liquidez do micromercado" subtitle={`Classe atual: ${a.valuation.liquidityClass}${a.valuation.suggestedLiquidityClass ? ` · sugerida pelos dias de anúncio: ${a.valuation.suggestedLiquidityClass}` : ""}`}>
        {editable && (
          <form action={setLiquidityAction.bind(null, id)} className="flex items-end gap-2">
            <Field label="Classe de liquidez">
              <Select name="liquidityClass" defaultValue={p.liquidityClass ?? ""} className="w-40">
                <option value="">— usar MEDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="BAIXA">BAIXA</option>
              </Select>
            </Field>
            <button className={btnGhost}>Salvar</button>
          </form>
        )}
      </Card>

      {editable && (
        <>
          <Card title="Adicionar comparável">
            <form action={createComparableAction.bind(null, id)} className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <Field label="Fonte" className="md:col-span-2">
                <Input name="source" placeholder="ZAP, VivaReal, corretor, venda do grupo…" required />
              </Field>
              <Field label="URL" className="md:col-span-2">
                <Input name="url" />
              </Field>
              <Field label="Tipo">
                <Select name="kind" defaultValue="LISTING">
                  <option value="LISTING">Anúncio</option>
                  <option value="SOLD">Vendido</option>
                  <option value="GROUP_HISTORY">Histórico do grupo</option>
                </Select>
              </Field>
              <Field label="Data de captura">
                <Input name="capturedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="Localização">
                <Select name="location" defaultValue="NEIGHBORHOOD">
                  <option value="CONDO">Mesmo condomínio</option>
                  <option value="STREET">Mesma rua</option>
                  <option value="NEIGHBORHOOD">Mesmo bairro</option>
                  <option value="OTHER">Outra</option>
                </Select>
              </Field>
              <Field label="Distância (m)">
                <Input name="distanceM" inputMode="numeric" />
              </Field>
              <Field label="Endereço" className="md:col-span-2">
                <Input name="address" />
              </Field>
              <Field label="Preço (R$)">
                <Input name="price" required inputMode="decimal" />
              </Field>
              <Field label="Área útil (m²)">
                <Input name="usableAreaM2" required inputMode="decimal" />
              </Field>
              <Field label="Dorm.">
                <Input name="bedrooms" inputMode="numeric" />
              </Field>
              <Field label="Vagas">
                <Input name="parking" inputMode="numeric" />
              </Field>
              <Field label="Andar">
                <Input name="floor" inputMode="numeric" />
              </Field>
              <Field label="Idade (anos)">
                <Input name="ageYears" inputMode="numeric" />
              </Field>
              <Field label="Padrão">
                <Select name="buildingStandard" defaultValue="">
                  {STANDARDS.map((s) => (
                    <option key={s} value={s}>
                      {s || "—"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Estado">
                <Select name="condition" defaultValue="">
                  {CONDITIONS.map((s) => (
                    <option key={s} value={s}>
                      {s || "—"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dias anunciado">
                <Input name="daysOnMarket" inputMode="numeric" />
              </Field>
              <Field label="Condomínio (R$/mês)">
                <Input name="monthlyCondo" inputMode="decimal" />
              </Field>
              <Field label="Observações" className="md:col-span-3">
                <Input name="notes" />
              </Field>
              <div className="flex items-end">
                <button className={btnPrimary}>Adicionar</button>
              </div>
            </form>
          </Card>
          <Disclosure summary="Importar comparáveis por CSV">
            <form action={importCsv} className="space-y-2">
              <Textarea name="csv" rows={6} placeholder={"fonte;preco;area;quartos;vagas;andar;idade;padrao;estado;localizacao;dias;url\nZAP;1290000;96;3;2;8;25;MEDIO;BOM;CONDO;30;https://..."} />
              <p className="break-words text-xxs text-fg-faint">Colunas, nesta ordem: fonte, preço, área, quartos, vagas, andar, idade, padrão, estado, localização, dias anunciado, url. Separador ponto e vírgula ou tabulação. Localização aceita CONDO, STREET, NEIGHBORHOOD ou OTHER. Linhas com erro são ignoradas e relatadas.</p>
              <button className={btnGhost}>Importar</button>
            </form>
          </Disclosure>
        </>
      )}
    </div>
  );
}
