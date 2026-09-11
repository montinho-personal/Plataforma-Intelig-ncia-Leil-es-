import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import { computeUnderwriting, type UnderwritingInput } from "./index";

const base: UnderwritingInput = {
  bid: fromBRL(654_000),
  exitValue: fromBRL(1_220_000),
  months: 8,
  renovation: fromBRL(104_000),
  renovationMonths: 2,
  monthlyCondo: fromBRL(950),
  monthlyIptu: fromBRL(500),
  condoDebt: fromBRL(10_000),
  iptuDebt: fromBRL(4_300),
  evictionCost: fromBRL(9_000),
  evictionMonths: 2,
};

describe("underwriting", () => {
  it("calcula linhas de aquisição a partir do lance (caso de ouro)", () => {
    const r = computeUnderwriting(base);
    const line = (k: string) => r.lines.find((l) => l.key === k)!.amount;
    expect(line("commission")).toBe(fromBRL(32_700));
    expect(line("itbi")).toBe(fromBRL(19_620));
    expect(line("registry")).toBe(fromBRL(8_175));
    expect(line("deed")).toBe(fromBRL(2_500));
    expect(line("courtCosts")).toBe(fromBRL(1_500));
    expect(line("lawyer")).toBe(fromBRL(8_000));
    expect(line("documentation")).toBe(fromBRL(1_500));
    expect(line("debts")).toBe(fromBRL(14_300));
    expect(r.metrics.acquisitionCosts).toBe(fromBRL(32_700 + 19_620 + 8_175 + 2_500 + 1_500 + 8_000 + 1_500 + 14_300));
  });

  it("capital necessário = lance + aquisição + operação; custos de venda dependem da saída", () => {
    const r = computeUnderwriting(base);
    const line = (k: string) => r.lines.find((l) => l.key === k)!.amount;
    expect(line("carrying")).toBe(fromBRL(1_450 * 8));
    expect(line("contingency")).toBe(Math.round((r.metrics.acquisitionCosts + fromBRL(1_450 * 8) + fromBRL(9_000)) * 0.05));
    expect(r.metrics.capitalNeeded).toBe(base.bid + r.metrics.acquisitionCosts + r.metrics.operationCosts);
    expect(line("brokerage")).toBe(fromBRL(1_220_000 * 0.06));
  });

  it("IR incide sobre ganho = (saída − corretagem) − custo de aquisição declarável", () => {
    const r = computeUnderwriting(base);
    const line = (k: string) => r.lines.find((l) => l.key === k)!.amount;
    const acquisitionForTax = base.bid + line("commission") + line("itbi") + line("registry") + line("deed") + base.renovation;
    const gain = base.exitValue - line("brokerage") - acquisitionForTax;
    expect(line("capitalGainsTax")).toBe(Math.round(gain * 0.15));
    const noDeduct = computeUnderwriting({ ...base, costs: { renovationDeductible: false } });
    expect(noDeduct.metrics.capitalGainsTax).toBeGreaterThan(r.metrics.capitalGainsTax);
    // sem ganho, sem imposto
    expect(computeUnderwriting({ ...base, exitValue: fromBRL(500_000) }).metrics.capitalGainsTax).toBe(0);
  });

  it("taxa da equipe: % do lance, % do lucro (sem circularidade), fixo e combinado", () => {
    const pctBid = computeUnderwriting({ ...base, teamFee: { type: "PCT_OF_BID", pctOfBid: 0.1, pctOfProfit: 0, fixed: 0 } });
    expect(pctBid.metrics.teamFee).toBe(fromBRL(65_400));
    const pctProfit = computeUnderwriting({ ...base, teamFee: { type: "PCT_OF_PROFIT", pctOfBid: 0, pctOfProfit: 0.2, fixed: 0 } });
    const before = pctProfit.metrics.netProfit + pctProfit.metrics.teamFee;
    expect(pctProfit.metrics.teamFee).toBe(Math.round(before * 0.2));
    const fixed = computeUnderwriting({ ...base, teamFee: { type: "FIXED", pctOfBid: 0, pctOfProfit: 0, fixed: fromBRL(30_000) } });
    expect(fixed.metrics.teamFee).toBe(fromBRL(30_000));
    const combined = computeUnderwriting({ ...base, teamFee: { type: "COMBINED", pctOfBid: 0.05, pctOfProfit: 0.1, fixed: fromBRL(5_000) } });
    const cb = combined.metrics.netProfit + combined.metrics.teamFee;
    expect(combined.metrics.teamFee).toBe(fromBRL(32_700) + fromBRL(5_000) + Math.round(cb * 0.1));
    expect(computeUnderwriting({ ...base, teamFee: { type: "NONE", pctOfBid: 0, pctOfProfit: 0, fixed: 0 } }).metrics.teamFee).toBe(0);
  });

  it("métricas são coerentes entre si", () => {
    const r = computeUnderwriting(base);
    const mt = r.metrics;
    expect(mt.netProfit).toBe(base.exitValue - mt.totalCost);
    expect(mt.grossProfit).toBe(base.exitValue - mt.capitalNeeded);
    expect(mt.roi).toBeCloseTo(mt.netProfit / mt.capitalNeeded, 12);
    expect(mt.roe).toBe(mt.roi);
    expect(mt.margin).toBeCloseTo(mt.netProfit / base.exitValue, 12);
    expect(mt.annualized!).toBeCloseTo(Math.pow(1 + mt.roi!, 12 / 8) - 1, 12);
    expect(mt.monthlyEquivalent!).toBeCloseTo(Math.pow(1 + mt.roi!, 1 / 8) - 1, 12);
    expect(mt.economicProfit).toBe(mt.netProfit - mt.capitalCost);
    expect(mt.profitPerMonth).toBe(Math.round(mt.netProfit / 8));
    expect(mt.roi!).toBeGreaterThan(0.1);
    expect(mt.roi!).toBeLessThan(0.35);
  });

  it("fluxo de caixa soma ao lucro de caixa e produz TIR anual acima do ROI anualizado simples", () => {
    const r = computeUnderwriting(base);
    expect(r.cashflow).toHaveLength(9);
    const sum = r.cashflow.reduce((a, b) => a + b, 0);
    expect(sum).toBe(r.metrics.netProfit);
    expect(r.metrics.irrAnnual).not.toBeNull();
    expect(r.metrics.irrAnnual!).toBeGreaterThan(r.metrics.roi!);
    // reforma começa depois da desocupação (mês 3 e 4)
    expect(r.cashflow[3]!).toBeLessThan(r.cashflow[1]!);
    expect(r.metrics.capitalMonths).toBeGreaterThan(0);
  });

  it("financiamento: ROE sobre capital próprio difere do ROI sobre capital total", () => {
    const r = computeUnderwriting({ ...base, financing: { amount: fromBRL(300_000), annualRate: 0.15 } });
    expect(r.metrics.equity).toBe(r.metrics.capitalNeeded - fromBRL(300_000));
    expect(r.metrics.interest).toBe(Math.round(fromBRL(300_000) * (Math.pow(1.15, 8 / 12) - 1)));
    expect(r.metrics.roe!).toBeGreaterThan(r.metrics.roi!);
    const noFin = computeUnderwriting(base);
    expect(r.metrics.netProfit).toBe(noFin.metrics.netProfit - r.metrics.interest);
  });

  it("multiplicador de custos e avisos", () => {
    const r = computeUnderwriting({ ...base, costMultiplier: 1.1 });
    expect(r.lines.find((l) => l.key === "renovation")!.amount).toBe(Math.round(base.renovation * 1.1));
    // comissão e ITBI dependem só do lance, não do multiplicador
    expect(r.lines.find((l) => l.key === "commission")!.amount).toBe(fromBRL(32_700));
    const loss = computeUnderwriting({ ...base, exitValue: fromBRL(700_000) });
    expect(loss.warnings.join(" ")).toMatch(/prejuízo/);
    const noDebts = computeUnderwriting({ ...base, condoDebt: 0, iptuDebt: 0 });
    expect(noDebts.warnings.join(" ")).toMatch(/AUSENTE/);
  });

  it("linhas carregam estado epistêmico e origem", () => {
    const r = computeUnderwriting({ ...base, meta: { commission: { status: "FACT", source: "edital p.4" } } });
    expect(r.lines.find((l) => l.key === "commission")!.status).toBe("FACT");
    expect(r.lines.find((l) => l.key === "commission")!.source).toBe("edital p.4");
    expect(r.lines.find((l) => l.key === "itbi")!.status).toBe("HYPOTHESIS");
  });
});
