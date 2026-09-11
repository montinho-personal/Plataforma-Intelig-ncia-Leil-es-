import type { PropertyRecord } from "@/data/types";
import { btnPrimary, Field, Input, Select, Textarea } from "@/components/ui";

const TYPES = ["APARTAMENTO", "CASA", "TERRENO", "COMERCIAL", "RURAL", "OUTRO"];
const STANDARDS = ["", "ECONOMICO", "MEDIO", "ALTO", "LUXO"];
const CONDITIONS = ["", "RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"];
const OCC = ["DESCONHECIDO", "DESOCUPADO", "OCUPADO"];
const LIQ = ["", "ALTA", "MEDIA", "BAIXA"];
const STATUS = ["RADAR", "TRIAGEM", "EM_ANALISE", "APROVADO", "REPROVADO", "ARREMATADO", "ENCERRADO", "DESCARTADO"];

function reais(cents: number | null | undefined) {
  return cents === null || cents === undefined ? "" : (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function dateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 16) : "";
}

export function PropertyForm({ action, property, submitLabel }: { action: (fd: FormData) => Promise<void>; property?: PropertyRecord | null; submitLabel: string }) {
  const p = property;
  const a = property?.auction;
  return (
    <form action={action} className="space-y-6">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Título / identificação" className="md:col-span-2">
          <Input name="title" defaultValue={p?.title ?? ""} required placeholder="Apto 98 m² · Rua X, 120" />
        </Field>
        <Field label="Tipo">
          <Select name="type" defaultValue={p?.type ?? "APARTAMENTO"}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={p?.status ?? "RADAR"}>
            {STATUS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Endereço" className="md:col-span-2">
          <Input name="address" defaultValue={p?.address ?? ""} />
        </Field>
        <Field label="Bairro">
          <Input name="neighborhood" defaultValue={p?.neighborhood ?? ""} />
        </Field>
        <Field label="Condomínio">
          <Input name="condoName" defaultValue={p?.condoName ?? ""} />
        </Field>
        <Field label="Cidade">
          <Input name="city" defaultValue={p?.city ?? ""} required />
        </Field>
        <Field label="UF">
          <Input name="state" defaultValue={p?.state ?? "SP"} maxLength={2} />
        </Field>
        <Field label="Área útil (m²)" hint="Base do valuation e da reforma">
          <Input name="usableAreaM2" defaultValue={p?.usableAreaM2 ?? ""} required inputMode="decimal" />
        </Field>
        <Field label="Área na matrícula (m²)" hint="Divergência > 15% marca caso atípico">
          <Input name="registryAreaM2" defaultValue={p?.registryAreaM2 ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Dormitórios">
          <Input name="bedrooms" defaultValue={p?.bedrooms ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Suítes">
          <Input name="suites" defaultValue={p?.suites ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Vagas">
          <Input name="parking" defaultValue={p?.parking ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Andar">
          <Input name="floor" defaultValue={p?.floor ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Idade aprox. (anos)">
          <Input name="ageYears" defaultValue={p?.ageYears ?? ""} inputMode="numeric" />
        </Field>
        <Field label="Padrão construtivo">
          <Select name="buildingStandard" defaultValue={p?.buildingStandard ?? ""}>
            {STANDARDS.map((t) => (
              <option key={t} value={t}>
                {t || "— não informado"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estado de conservação">
          <Select name="condition" defaultValue={p?.condition ?? ""}>
            {CONDITIONS.map((t) => (
              <option key={t} value={t}>
                {t || "— não informado"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ocupação" hint="Desconhecido = risco e meses de desocupação nos cenários">
          <Select name="occupancy" defaultValue={p?.occupancy ?? "DESCONHECIDO"}>
            {OCC.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Classe de liquidez" hint="Define a curva de desconto por prazo de saída">
          <Select name="liquidityClass" defaultValue={p?.liquidityClass ?? ""}>
            {LIQ.map((t) => (
              <option key={t} value={t}>
                {t || "— usar MEDIA"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Condomínio mensal (R$)">
          <Input name="monthlyCondo" defaultValue={reais(p?.monthlyCondo)} inputMode="decimal" />
        </Field>
        <Field label="IPTU mensal (R$)">
          <Input name="monthlyIptu" defaultValue={reais(p?.monthlyIptu)} inputMode="decimal" />
        </Field>
        <div className="flex flex-col gap-2 pt-4 text-xs md:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="woodConstruction" defaultChecked={p?.woodConstruction} /> Construção em madeira (caso atípico)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="irregularConstruction" defaultChecked={p?.irregularConstruction} /> Construção irregular / sem habite-se (caso atípico)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isFavorite" defaultChecked={p?.isFavorite} /> Favorito
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Leilão (dados do edital = fatos do edital)</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Modalidade">
            <Select name="modality" defaultValue={a?.modality ?? "EXTRAJUDICIAL"}>
              <option value="">— sem leilão cadastrado</option>
              <option value="JUDICIAL">JUDICIAL</option>
              <option value="EXTRAJUDICIAL">EXTRAJUDICIAL</option>
            </Select>
          </Field>
          <Field label="Leiloeiro">
            <Input name="auctioneer" defaultValue={a?.auctioneer ?? ""} />
          </Field>
          <Field label="Processo (judicial)">
            <Input name="courtCaseNumber" defaultValue={a?.courtCaseNumber ?? ""} />
          </Field>
          <Field label="URL do lote">
            <Input name="auctionUrl" defaultValue={a?.url ?? ""} />
          </Field>
          <Field label="1ª praça (data)">
            <Input name="firstCallAt" type="datetime-local" defaultValue={dateInput(a?.firstCallAt)} />
          </Field>
          <Field label="Lance mínimo 1ª praça (R$)">
            <Input name="firstCallMinBid" defaultValue={reais(a?.firstCallMinBid)} inputMode="decimal" />
          </Field>
          <Field label="2ª praça (data)">
            <Input name="secondCallAt" type="datetime-local" defaultValue={dateInput(a?.secondCallAt)} />
          </Field>
          <Field label="Lance mínimo 2ª praça (R$)" hint="Lance de referência inicial">
            <Input name="secondCallMinBid" defaultValue={reais(a?.secondCallMinBid)} inputMode="decimal" />
          </Field>
          <Field label="Avaliação do edital (R$)" hint="Exibida como fato do edital; NUNCA usada como valor de mercado">
            <Input name="appraisalValue" defaultValue={reais(a?.appraisalValue)} inputMode="decimal" />
          </Field>
          <Field label="Comissão do leiloeiro (%)">
            <Input name="commissionRate" defaultValue={a?.commissionRate !== null && a?.commissionRate !== undefined ? (a.commissionRate * 100).toLocaleString("pt-BR") : ""} inputMode="decimal" />
          </Field>
          <Field label="Débito de condomínio (R$)" hint="Vazio = AUSENTE (não é zero)">
            <Input name="condoDebt" defaultValue={reais(a?.condoDebt)} inputMode="decimal" />
          </Field>
          <Field label="Débito de IPTU (R$)">
            <Input name="iptuDebt" defaultValue={reais(a?.iptuDebt)} inputMode="decimal" />
          </Field>
        </div>
      </section>

      <Field label="Observações">
        <Textarea name="notes" rows={3} defaultValue={p?.notes ?? ""} />
      </Field>

      <button className={btnPrimary} type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
