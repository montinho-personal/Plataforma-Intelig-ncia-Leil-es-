import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import { DEFAULT_PROFILE, type InvestmentProfile } from "../profile";
import type { ComparableInput } from "../valuation";
import { analyzeOpportunity } from "./index";

const profile: InvestmentProfile = { ...DEFAULT_PROFILE, id: "p1", groupId: "g1" };

function comp(id: string, price: number, overrides: Partial<ComparableInput> = {}): ComparableInput {
  return { id, kind: "LISTING", priceCents: fromBRL(price), usableAreaM2: 98, bedrooms: 3, parking: 2, floor: 8, ageYears: 25, buildingStandard: "MEDIO", condition: "BOM", sameCondo: true, capturedAt: "2026-09-01", daysOnMarket: 40, ...overrides };
}

const subject = {
  type: "APARTAMENTO" as const,
  usableAreaM2: 98,
  bedrooms: 3,
  parking: 2,
  floor: 8,
  ageYears: 25,
  buildingStandard: "MEDIO" as const,
  condition: "REGULAR" as const,
  occupancy: "DESCONHECIDO" as const,
  monthlyCondo: fromBRL(950),
  monthlyIptu: fromBRL(500),
  condoDebt: fromBRL(10_000),
  iptuDebt: fromBRL(4_300),
  auctionCommissionRate: 0.05,
  liquidityClass: "MEDIA" as const,
};
const comparables = [comp("a", 1_290_000), comp("b", 1_310_000, { condition: "REFORMADO" }), comp("c", 1_250_000, { sameCondo: false, sameStreet: true }), comp("d", 1_330_000, { parking: 3 }), comp("e", 1_270_000, { floor: 3 })];

describe("analyzeOpportunity", () => {
  it("monta a análise completa encadeando os módulos", () => {
    const a = analyzeOpportunity({ subject, comparables, profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(620_000), asOf: "2026-09-11" });
    expect(a.valuation.status).toBe("OK");
    expect(a.exitHorizonDays).toBe(90);
    expect(a.exitValue).toBe(a.valuation.exitValues![90].amount);
    // pós-reforma (REFORMADO) vale mais que o estado atual (REGULAR)
    expect(a.valuation.postRenovationMarket!.amount).toBeGreaterThan(a.valuation.marketValue!.amount);
    expect(a.underwriting!.input.bid).toBe(fromBRL(620_000));
    expect(a.underwriting!.input.evictionMonths).toBe(3);
    expect(a.underwriting!.input.costs!.auctioneerCommissionRate).toBe(0.05);
    expect(a.scenarios).toHaveLength(4);
    expect(a.maxBid!.blocked).toBe(false);
    expect(a.maxBid!.byKey.ABSOLUTE_MAX.bid).toBeGreaterThan(0);
    expect(a.renovationOptions).toHaveLength(6);
    expect(a.renovationOptions.filter((o) => o.isBest)).toHaveLength(1);
    expect(a.renovationOptions.find((o) => o.isSelected)!.level).toBe("MEDIUM");
    expect(a.meta.commission!.status).toBe("FACT");
    expect(a.meta.debts!.status).toBe("FACT");
    expect(a.sensitivityPriceMonths!.cells).toHaveLength(6);
  });

  it("ponto ótimo: reforma maior não é necessariamente melhor", () => {
    const a = analyzeOpportunity({ subject, comparables, profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(620_000), asOf: "2026-09-11" });
    const full = a.renovationOptions.find((o) => o.level === "FULL")!;
    const best = a.renovationOptions.find((o) => o.isBest)!;
    expect(best.level).not.toBe("FULL");
    expect(best.underwriting.metrics.roi!).toBeGreaterThan(full.underwriting.metrics.roi!);
    // cada opção mostra custo, saída, prazo e retorno
    for (const o of a.renovationOptions) {
      expect(o.exitValue).toBeGreaterThan(0);
      expect(o.months).toBeGreaterThanOrEqual(1);
    }
  });

  it("imóvel desocupado não carrega desocupação", () => {
    const a = analyzeOpportunity({ subject: { ...subject, occupancy: "DESOCUPADO" }, comparables, profile, renovationLevel: "LIGHT", referenceBid: fromBRL(620_000), asOf: "2026-09-11" });
    expect(a.underwriting!.input.evictionMonths).toBe(0);
    expect(a.underwriting!.input.evictionCost).toBe(0);
    expect(a.months).toBeLessThan(analyzeOpportunity({ subject, comparables, profile, renovationLevel: "LIGHT", referenceBid: fromBRL(620_000), asOf: "2026-09-11" }).months);
  });

  it("sem comparáveis suficientes: bloqueia lance máximo e triagem fica preliminar", () => {
    const a = analyzeOpportunity({ subject, comparables: comparables.slice(0, 2), profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(620_000), asOf: "2026-09-11" });
    expect(a.valuation.status).toBe("INSUFFICIENT_DATA");
    expect(a.maxBid!.blocked).toBe(true);
    expect(a.screening.reasons.join(" ")).toMatch(/insuficientes/);
    const none = analyzeOpportunity({ subject, comparables: [], profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(620_000), asOf: "2026-09-11" });
    expect(none.underwriting).toBeNull();
    expect(none.screening.verdict).toBe("SEM_DADOS");
  });

  it("triagem descarta quando o ROI no lance de referência não atinge o mínimo", () => {
    const a = analyzeOpportunity({ subject, comparables, profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(1_100_000), asOf: "2026-09-11" });
    expect(a.screening.verdict).toBe("DESCARTAR");
    expect(a.screening.reasons[0]).toMatch(/ROI preliminar/);
    const good = analyzeOpportunity({ subject, comparables, profile, renovationLevel: "MEDIUM", referenceBid: fromBRL(540_000), asOf: "2026-09-11" });
    expect(["MERECE_ANALISE", "ANALISAR_COM_RESSALVAS"]).toContain(good.screening.verdict);
  });
});
