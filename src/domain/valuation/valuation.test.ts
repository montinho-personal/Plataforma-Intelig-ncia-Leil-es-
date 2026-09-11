import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import { computeValuation, detectAtypicalFlags, type ComparableInput, type SubjectProperty } from "./index";

const subject: SubjectProperty = {
  type: "APARTAMENTO",
  usableAreaM2: 100,
  bedrooms: 3,
  parking: 2,
  floor: 8,
  ageYears: 20,
  buildingStandard: "MEDIO",
  condition: "BOM",
  liquidityClass: "MEDIA",
};

function comp(id: string, overrides: Partial<ComparableInput> = {}): ComparableInput {
  return {
    id,
    kind: "LISTING",
    priceCents: fromBRL(1_000_000),
    usableAreaM2: 100,
    bedrooms: 3,
    parking: 2,
    floor: 8,
    ageYears: 20,
    buildingStandard: "MEDIO",
    condition: "BOM",
    sameCondo: true,
    capturedAt: "2026-09-01",
    daysOnMarket: 30,
    ...overrides,
  };
}

const ASOF = "2026-09-11";

describe("valuation", () => {
  it("comparáveis idênticos produzem mercado = preço × (1 − desconto anúncio→fechamento)", () => {
    const r = computeValuation(subject, [comp("a"), comp("b"), comp("c"), comp("d")], { asOf: ASOF });
    expect(r.status).toBe("OK");
    // 10.000 R$/m² × 0,94 = 9.400 R$/m² × 100 m² = 940.000
    expect(r.marketValue!.amount).toBe(fromBRL(940_000));
    expect(r.askingReference).toBe(fromBRL(1_000_000));
    expect(r.stats!.coefficientOfVariation).toBe(0);
    // faixa mínima de ±3% quando não há dispersão
    expect(r.marketValue!.low).toBe(fromBRL(940_000 * 0.97));
    expect(r.marketValue!.high).toBe(fromBRL(940_000 * 1.03));
  });

  it("comparáveis vendidos não recebem desconto de anúncio", () => {
    const r = computeValuation(subject, [comp("a", { kind: "SOLD" }), comp("b", { kind: "SOLD" }), comp("c", { kind: "SOLD" })], { asOf: ASOF });
    expect(r.marketValue!.amount).toBe(fromBRL(1_000_000));
  });

  it("ajusta por estado de conservação e vagas (trazendo o comparável ao imóvel-alvo)", () => {
    // comparável REFORMADO (+8%) para alvo BOM (0): ajuste −8% → 10.000 × 0,92 × 0,94
    const r = computeValuation(subject, [comp("a", { kind: "SOLD", condition: "REFORMADO" })], { asOf: ASOF });
    const c = r.comparables[0]!;
    expect(c.adjustments.find((a) => a.factor === "condition")!.delta).toBeCloseTo(-0.08, 10);
    expect(c.adjustedPricePerM2).toBeCloseTo(10_000 * 100 * 0.92, 6);
    // comparável com 1 vaga a menos que o alvo → alvo vale +3%
    const r2 = computeValuation(subject, [comp("a", { kind: "SOLD", parking: 1 })], { asOf: ASOF });
    expect(r2.comparables[0]!.adjustments.find((a) => a.factor === "parking")!.delta).toBeCloseTo(0.03, 10);
  });

  it("usa mediana ponderada por similaridade: comparável distante e diferente pesa menos", () => {
    const comps = [
      comp("near1", { kind: "SOLD" }),
      comp("near2", { kind: "SOLD" }),
      comp("near3", { kind: "SOLD", priceCents: fromBRL(1_020_000) }),
      comp("far", { kind: "SOLD", priceCents: fromBRL(2_000_000), sameCondo: false, distanceM: 3000, usableAreaM2: 100, bedrooms: 5, parking: 4 }),
    ];
    const r = computeValuation(subject, comps, { asOf: ASOF });
    const far = r.comparables.find((c) => c.id === "far")!;
    expect(far.similarity).toBeLessThan(0.5);
    expect(far.weak).toBe(true);
    expect(r.marketValue!.amount).toBeLessThan(fromBRL(1_100_000));
  });

  it("marca DADOS INSUFICIENTES com menos de 3 comparáveis incluídos", () => {
    const r = computeValuation(subject, [comp("a"), comp("b", { excluded: true, excludedReason: "área muito diferente" })], { asOf: ASOF });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.statusReasons[0]).toMatch(/menos de 3/);
    expect(r.comparables[1]!.included).toBe(false);
    expect(r.comparables[1]!.exclusionReason).toBe("área muito diferente");
    // ainda calcula números para exibição
    expect(r.marketValue).not.toBeNull();
  });

  it("marca DADOS INSUFICIENTES com dispersão alta", () => {
    const comps = [
      comp("a", { kind: "SOLD", priceCents: fromBRL(600_000) }),
      comp("b", { kind: "SOLD", priceCents: fromBRL(1_000_000) }),
      comp("c", { kind: "SOLD", priceCents: fromBRL(1_600_000) }),
    ];
    const r = computeValuation(subject, comps, { asOf: ASOF });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.statusReasons.join(" ")).toMatch(/dispersão/);
    expect(r.confidence).toBeLessThan(50);
  });

  it("marca CASO ATÍPICO com flag crítica e reduz a confiança", () => {
    const r = computeValuation(
      { ...subject, atypicalFlags: [{ code: "MADEIRA", severity: "CRITICAL", note: "casa de madeira" }] },
      [comp("a", { kind: "SOLD" }), comp("b", { kind: "SOLD" }), comp("c", { kind: "SOLD" }), comp("d", { kind: "SOLD" })],
      { asOf: ASOF },
    );
    expect(r.status).toBe("ATYPICAL");
    expect(r.statusReasons[0]).toMatch(/CASO ATÍPICO/);
    expect(r.confidenceFactors.find((f) => f.label === "atipicidade")!.value).toBe(-25);
  });

  it("sem comparáveis retorna estrutura vazia com confiança zero", () => {
    const r = computeValuation(subject, [], { asOf: ASOF });
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.marketValue).toBeNull();
    expect(r.exitValues).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it("valor de saída por prazo decresce com o prazo menor e usa base pós-reforma", () => {
    const comps = [comp("a", { kind: "SOLD" }), comp("b", { kind: "SOLD" }), comp("c", { kind: "SOLD" }), comp("d", { kind: "SOLD" })];
    const r = computeValuation(subject, comps, { asOf: ASOF, targetCondition: "REFORMADO" });
    expect(r.marketValue!.amount).toBe(fromBRL(1_000_000));
    // pós-reforma: alvo REFORMADO (+8%) vs comparáveis BOM (0) → +8%
    expect(r.postRenovationMarket!.amount).toBe(fromBRL(1_080_000));
    // provável = pós-reforma × (1 − 2%)
    expect(r.postRenovationProbableSale).toBe(fromBRL(1_080_000 * 0.98));
    const ev = r.exitValues!;
    expect(ev[180].amount).toBeGreaterThan(ev[120].amount);
    expect(ev[120].amount).toBeGreaterThan(ev[90].amount);
    expect(ev[90].amount).toBeGreaterThan(ev[60].amount);
    expect(ev[60].amount).toBeGreaterThan(ev[30].amount);
    // liquidez MEDIA, 90 dias: −6%
    expect(ev[90].amount).toBe(Math.round(1_080_000 * 0.98 * 0.94 * 100));
    expect(ev[90].low).toBeLessThan(ev[90].amount);
    expect(ev[90].high).toBeGreaterThan(ev[90].amount);
    // venda rápida = provável (estado atual) × (1 − 16%)
    expect(r.quickSale).toBe(Math.round(1_000_000 * 0.98 * 0.84 * 100));
  });

  it("confiança é decomposta e limitada a 0–100", () => {
    const comps = Array.from({ length: 8 }, (_, i) => comp(`c${i}`, { kind: "SOLD", priceCents: fromBRL(1_000_000 + i * 5_000) }));
    const r = computeValuation(subject, comps, { asOf: ASOF });
    expect(r.confidence).toBeGreaterThanOrEqual(85);
    expect(r.confidence).toBeLessThanOrEqual(100);
    const sum = 40 + r.confidenceFactors.reduce((a, f) => a + f.value, 0);
    expect(r.confidence).toBe(Math.min(100, sum));
  });

  it("sugere classe de liquidez pelos dias de anúncio", () => {
    const r = computeValuation(subject, [comp("a", { daysOnMarket: 200 }), comp("b", { daysOnMarket: 150 }), comp("c", { daysOnMarket: 130 })], { asOf: ASOF });
    expect(r.suggestedLiquidityClass).toBe("BAIXA");
  });

  it("detecta flags atípicas", () => {
    const flags = detectAtypicalFlags({ type: "CASA", woodConstruction: true, usableAreaM2: 80, registryAreaM2: 120, ageYears: 70, condition: "REGULAR" });
    expect(flags.map((f) => f.code)).toEqual(["MADEIRA", "MUITO_ANTIGO", "AREA_DIVERGENTE"]);
    expect(flags.find((f) => f.code === "AREA_DIVERGENTE")!.severity).toBe("CRITICAL");
    expect(detectAtypicalFlags({ type: "APARTAMENTO", usableAreaM2: 100 })).toEqual([]);
  });
});
