import { getRepository } from "@/data";
import { updateProfileCostsAction } from "@/server/actions/profile";
import { can, requireUser } from "@/server/auth";
import { btnPrimary, Card, Field, Input, Notice, Select } from "@/components/ui";

const pctIn = (v: number | null | undefined) => (v === null || v === undefined ? "" : (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 3 }));
const reais = (v: number | null | undefined) => (v === null || v === undefined ? "" : (v / 100).toLocaleString("pt-BR"));

export default async function CostsPage() {
  const user = await requireUser();
  const repo = await getRepository();
  const p = await repo.getDefaultProfile(user.groupId);
  const c = p.costs;
  const editable = can(user, "editProfile");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Taxas e custos padrão</h1>
        <p className="text-xs text-fg-faint">Defaults do underwriting. Valores do edital (comissão, débitos) sobrescrevem por imóvel e viram fato.</p>
      </header>
      {!editable && <Notice tone="accent">Somente ADMIN edita. Seu papel: {user.role}.</Notice>}
      <form action={updateProfileCostsAction}>
        <fieldset disabled={!editable} className="space-y-4">
          <Card title="Aquisição (dependem do lance)">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Comissão do leiloeiro (%)"><Input name="auctioneerCommissionRate" defaultValue={pctIn(c.auctioneerCommissionRate)} inputMode="decimal" /></Field>
              <Field label="ITBI (%)"><Input name="itbiRate" defaultValue={pctIn(c.itbiRate)} inputMode="decimal" /></Field>
              <Field label="Registro (%)"><Input name="registryRate" defaultValue={pctIn(c.registryRate)} inputMode="decimal" /></Field>
              <Field label="Registro fixo (R$)"><Input name="registryFixed" defaultValue={reais(c.registryFixed)} inputMode="decimal" /></Field>
              <Field label="Carta de arrematação / escritura (R$)"><Input name="deedFixed" defaultValue={reais(c.deedFixed)} inputMode="decimal" /></Field>
              <Field label="Custas (R$)"><Input name="courtCostsFixed" defaultValue={reais(c.courtCostsFixed)} inputMode="decimal" /></Field>
              <Field label="Advogado fixo (R$)"><Input name="lawyerFixed" defaultValue={reais(c.lawyerFixed)} inputMode="decimal" /></Field>
              <Field label="Advogado (% do lance)"><Input name="lawyerRateOfBid" defaultValue={pctIn(c.lawyerRateOfBid)} inputMode="decimal" /></Field>
              <Field label="Assessoria (R$)"><Input name="advisoryFixed" defaultValue={reais(c.advisoryFixed)} inputMode="decimal" /></Field>
              <Field label="Engenharia / laudos (R$)"><Input name="engineeringFixed" defaultValue={reais(c.engineeringFixed)} inputMode="decimal" /></Field>
              <Field label="Documentação e certidões (R$)"><Input name="documentationFixed" defaultValue={reais(c.documentationFixed)} inputMode="decimal" /></Field>
              <Field label="Seguro mensal (R$)"><Input name="insuranceMonthly" defaultValue={reais(c.insuranceMonthly)} inputMode="decimal" /></Field>
              <Field label="Contingência geral (%)" hint="sobre custos de aquisição, carregamento e desocupação"><Input name="contingencyRate" defaultValue={pctIn(c.contingencyRate)} inputMode="decimal" /></Field>
            </div>
          </Card>
          <Card title="Venda e tributos">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Corretagem (% da venda)"><Input name="brokerageRate" defaultValue={pctIn(c.brokerageRate)} inputMode="decimal" /></Field>
              <Field label="Marketing (R$)"><Input name="marketingFixed" defaultValue={reais(c.marketingFixed)} inputMode="decimal" /></Field>
              <Field label="Taxas de venda (R$)"><Input name="saleFeesFixed" defaultValue={reais(c.saleFeesFixed)} inputMode="decimal" /></Field>
              <Field label="IR sobre ganho de capital (%)" hint="PF 15% padrão; PJ e isenções: validar com contador"><Input name="capitalGainsTaxRate" defaultValue={pctIn(c.capitalGainsTaxRate)} inputMode="decimal" /></Field>
              <label className="flex items-end gap-2 pb-2 text-xs"><input type="checkbox" name="renovationDeductible" defaultChecked={c.renovationDeductible} /> reforma documentada deduz do ganho</label>
              <Field label="Custo do capital (% a.a.)" hint="custo de oportunidade"><Input name="capitalCostAnnualRate" defaultValue={pctIn(c.capitalCostAnnualRate)} inputMode="decimal" /></Field>
            </div>
          </Card>
          <Card title="Taxa de gestão / assessoria da equipe" subtitle="Remuneração por garimpo, análise, execução e acompanhamento. Entra no retorno.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Regra">
                <Select name="teamFeeType" defaultValue={p.teamFee.type}>
                  <option value="PCT_OF_BID">% da arrematação</option>
                  <option value="PCT_OF_PROFIT">% do lucro</option>
                  <option value="FIXED">valor fixo</option>
                  <option value="COMBINED">combinação</option>
                  <option value="NONE">nenhuma</option>
                </Select>
              </Field>
              <Field label="% da arrematação"><Input name="teamPctOfBid" defaultValue={pctIn(p.teamFee.pctOfBid)} inputMode="decimal" /></Field>
              <Field label="% do lucro"><Input name="teamPctOfProfit" defaultValue={pctIn(p.teamFee.pctOfProfit)} inputMode="decimal" /></Field>
              <Field label="Valor fixo (R$)"><Input name="teamFixed" defaultValue={reais(p.teamFee.fixed)} inputMode="decimal" /></Field>
            </div>
          </Card>
          {editable && <button className={btnPrimary} type="submit">Salvar custos</button>}
        </fieldset>
      </form>
    </div>
  );
}
