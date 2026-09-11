import { getRepository } from "@/data";
import { updateProfileCriteriaAction } from "@/server/actions/profile";
import { can, requireUser } from "@/server/auth";
import { btnPrimary, Card, Field, Input, Notice, Select, Table } from "@/components/ui";

const pctIn = (v: number | null | undefined) => (v === null || v === undefined ? "" : (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
const reais = (v: number | null | undefined) => (v === null || v === undefined ? "" : (v / 100).toLocaleString("pt-BR"));

export default async function ProfilePage() {
  const user = await requireUser();
  const repo = await getRepository();
  const p = await repo.getDefaultProfile(user.groupId);
  const editable = can(user, "editProfile");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Perfil de investimento</h1>
        <p className="text-xs text-fg-faint">Nenhum percentual vive no código. Estes valores afetam triagem, cenários e lance máximo de todas as oportunidades.</p>
      </header>
      {!editable && <Notice tone="accent">Somente ADMIN edita o perfil. Seu papel: {user.role}.</Notice>}
      <form action={updateProfileCriteriaAction} className="space-y-4">
        <fieldset disabled={!editable} className="space-y-4">
          <Card title="Critérios de retorno">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Nome do perfil">
                <Input name="name" defaultValue={p.name} />
              </Field>
              <Field label="ROI mínimo (%)" hint="Define o LIMITE e o MÁXIMO ABSOLUTO">
                <Input name="minRoi" defaultValue={pctIn(p.minRoi)} inputMode="decimal" required />
              </Field>
              <Field label="ROI alvo (%)" hint="Define o IDEAL e o CONFORTÁVEL">
                <Input name="targetRoi" defaultValue={pctIn(p.targetRoi)} inputMode="decimal" required />
              </Field>
              <Field label="TIR mínima (% a.a.)">
                <Input name="minIrrAnnual" defaultValue={pctIn(p.minIrrAnnual)} inputMode="decimal" />
              </Field>
              <Field label="Lucro mínimo (R$)">
                <Input name="minProfit" defaultValue={reais(p.minProfit)} inputMode="decimal" />
              </Field>
              <Field label="Capital máximo por negócio (R$)">
                <Input name="maxCapital" defaultValue={reais(p.maxCapital)} inputMode="decimal" />
              </Field>
              <Field label="Prazo máximo (meses)">
                <Input name="maxMonths" defaultValue={p.maxMonths ?? ""} inputMode="numeric" />
              </Field>
              <Field label="Prazo de saída padrão">
                <Select name="defaultExitHorizonDays" defaultValue={String(p.defaultExitHorizonDays)}>
                  {[30, 60, 90, 120, 180].map((h) => (
                    <option key={h} value={h}>
                      {h} dias
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="text-xs">
                <div className="mb-1 text-xxs uppercase tracking-wider text-fg-faint">Modalidades aceitas</div>
                {["JUDICIAL", "EXTRAJUDICIAL"].map((m) => (
                  <label key={m} className="mr-3 inline-flex items-center gap-1">
                    <input type="checkbox" name="acceptedModalities" value={m} defaultChecked={p.acceptedModalities.includes(m as never)} /> {m}
                  </label>
                ))}
              </div>
              <div className="text-xs md:col-span-3">
                <div className="mb-1 text-xxs uppercase tracking-wider text-fg-faint">Tipos de imóvel aceitos</div>
                {["APARTAMENTO", "CASA", "TERRENO", "COMERCIAL", "RURAL", "OUTRO"].map((t) => (
                  <label key={t} className="mr-3 inline-flex items-center gap-1">
                    <input type="checkbox" name="acceptedPropertyTypes" value={t} defaultChecked={p.acceptedPropertyTypes.includes(t as never)} /> {t}
                  </label>
                ))}
              </div>
            </div>
          </Card>

          <Card title="Prazos e desocupação (hipóteses padrão)">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Meses de venda após obra">
                <Input name="defaultHoldingMonths" defaultValue={p.defaultHoldingMonths} inputMode="numeric" />
              </Field>
              <Field label="Meses de desocupação se ocupado/desconhecido">
                <Input name="defaultEvictionMonthsIfOccupied" defaultValue={p.defaultEvictionMonthsIfOccupied} inputMode="numeric" />
              </Field>
              <Field label="Custo de desocupação padrão (R$)">
                <Input name="defaultEvictionCostIfOccupied" defaultValue={reais(p.defaultEvictionCostIfOccupied)} inputMode="decimal" />
              </Field>
              <Field label="Fator regional de reforma" hint="1,0 = tabela base">
                <Input name="regionFactor" defaultValue={p.regionFactor} inputMode="decimal" />
              </Field>
            </div>
          </Card>

          <Card title="Valuation: descontos e curva de liquidez" subtitle="Hipóteses. Com histórico do grupo (Fase 5) o sistema sugere valores calibrados com n e período.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Desconto anúncio → fechamento (%)" hint="aplicado a comparáveis do tipo anúncio">
                <Input name="askingToClosingDiscount" defaultValue={pctIn(p.valuation.askingToClosingDiscount)} inputMode="decimal" />
              </Field>
              <Field label="Concessão de saída do investidor (%)" hint="mercado → provável de venda">
                <Input name="investorExitMargin" defaultValue={pctIn(p.valuation.investorExitMargin)} inputMode="decimal" />
              </Field>
            </div>
            <Table className="mt-3">
              <thead>
                <tr>
                  <th>Classe de liquidez</th>
                  {[180, 120, 90, 60, 30].map((h) => (
                    <th key={h} className="text-right">
                      {h} d
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["ALTA", "MEDIA", "BAIXA"] as const).map((cls) => (
                  <tr key={cls}>
                    <td>{cls}</td>
                    {([180, 120, 90, 60, 30] as const).map((h) => (
                      <td key={h} className="text-right">
                        <Input name={`liq_${cls}_${h}`} defaultValue={pctIn(p.valuation.liquidityCurve[cls][h])} inputMode="decimal" className="w-16 text-right" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="mt-1 text-xxs text-fg-faint">Desconto (%) sobre o valor provável de venda para vender dentro do prazo.</p>
          </Card>
          {editable && (
            <button className={btnPrimary} type="submit">
              Salvar perfil
            </button>
          )}
        </fieldset>
      </form>
    </div>
  );
}
