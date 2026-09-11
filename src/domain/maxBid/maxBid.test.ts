import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import { computeUnderwriting, type UnderwritingInput } from "../underwriting";
import { bidImpact, computeMaxBid, solveBidFor, type BidInputFactory } from "./index";

const factory: BidInputFactory = (bid, exitValue): UnderwritingInput => ({
  bid,
  exitValue,
  months: 8,
  renovation: fromBRL(104_000),
  renovationMonths: 2,
  monthlyCondo: fromBRL(950),
  monthlyIptu: fromBRL(500),
  condoDebt: fromBRL(10_000),
  iptuDebt: fromBRL(4_300),
  evictionCost: fromBRL(9_000),
  evictionMonths: 2,
});

const exits = { conservative: fromBRL(1_170_000), base: fromBRL(1_220_000) };
const constraints = { minRoi: 0.2, targetRoi: 0.27 };

describe("maxBid", () => {
  it("solver encontra o lance em que o ROI iguala o alvo (tolerância de R$ 1)", () => {
    const r = solveBidFor((b) => computeUnderwriting(factory(b, exits.base)).metrics.roi, 0.27, exits.base);
    expect(r.feasible).toBe(true);
    const roiAt = computeUnderwriting(factory(r.bid, exits.base)).metrics.roi!;
    const roiAbove = computeUnderwriting(factory(r.bid + 200, exits.base)).metrics.roi!;
    expect(roiAt).toBeGreaterThanOrEqual(0.27);
    expect(roiAbove).toBeLessThan(0.27);
    expect(r.bid % 100).toBe(0);
  });

  it("ROI é estritamente decrescente no lance (monotonicidade que sustenta a bisseção)", () => {
    let prev = Number.POSITIVE_INFINITY;
    for (let b = fromBRL(100_000); b <= fromBRL(1_000_000); b += fromBRL(50_000)) {
      const roi = computeUnderwriting(factory(b, exits.base)).metrics.roi!;
      expect(roi).toBeLessThan(prev);
      prev = roi;
    }
  });

  it("quatro patamares ordenados, com valor de saída (nunca mercado) como base", () => {
    const r = computeMaxBid(factory, exits, constraints);
    expect(r.blocked).toBe(false);
    const [ideal, comfortable, limit, max] = r.tiers;
    expect(ideal!.bid).toBeLessThanOrEqual(comfortable!.bid);
    expect(comfortable!.bid).toBeLessThanOrEqual(limit!.bid);
    expect(limit!.bid).toBeLessThanOrEqual(max!.bid);
    expect(r.byKey.IDEAL.underwriting.metrics.roi!).toBeGreaterThanOrEqual(0.27);
    expect(r.byKey.ABSOLUTE_MAX.underwriting.metrics.roi!).toBeGreaterThanOrEqual(0.2);
    expect(r.byKey.ABSOLUTE_MAX.underwriting.input.exitValue).toBe(exits.base);
    expect(r.byKey.IDEAL.underwriting.input.exitValue).toBe(exits.conservative);
    expect(r.byKey.ABSOLUTE_MAX.bid).toBeGreaterThan(fromBRL(500_000));
    expect(r.byKey.ABSOLUTE_MAX.bid).toBeLessThan(fromBRL(900_000));
  });

  it("restrições adicionais reduzem o teto e a restrição ativa é reportada", () => {
    const free = computeMaxBid(factory, exits, constraints);
    const capped = computeMaxBid(factory, exits, { ...constraints, maxCapital: fromBRL(700_000) });
    expect(capped.byKey.ABSOLUTE_MAX.bid).toBeLessThan(free.byKey.ABSOLUTE_MAX.bid);
    expect(capped.byKey.ABSOLUTE_MAX.bindingConstraint).toBe("capital máximo");
    expect(capped.byKey.ABSOLUTE_MAX.underwriting.metrics.capitalNeeded).toBeLessThanOrEqual(fromBRL(700_000));

    const profitCapped = computeMaxBid(factory, exits, { ...constraints, minProfit: fromBRL(300_000) });
    expect(profitCapped.byKey.ABSOLUTE_MAX.bindingConstraint).toBe("lucro mínimo");
    expect(profitCapped.byKey.ABSOLUTE_MAX.underwriting.metrics.netProfit).toBeGreaterThanOrEqual(fromBRL(300_000));

    const irrCapped = computeMaxBid(factory, exits, { ...constraints, minIrrAnnual: 0.9 });
    expect(irrCapped.byKey.ABSOLUTE_MAX.bindingConstraint).toBe("TIR mínima");
    expect(irrCapped.byKey.ABSOLUTE_MAX.underwriting.metrics.irrAnnual!).toBeGreaterThanOrEqual(0.9);
  });

  it("retorno inatingível resulta em lance zero com aviso", () => {
    const r = computeMaxBid(factory, exits, { minRoi: 50, targetRoi: 60 });
    expect(r.tiers.every((t) => t.bid === 0)).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/Nenhum lance/);
  });

  it("bloqueia quando o valuation tem dados insuficientes, salvo override justificado", () => {
    const blocked = computeMaxBid(factory, exits, constraints, { valuationStatus: "INSUFFICIENT_DATA" });
    expect(blocked.blocked).toBe(true);
    expect(blocked.blockedReason).toMatch(/DADOS INSUFICIENTES/);
    expect(blocked.tiers.every((t) => t.bid === 0)).toBe(true);
    const over = computeMaxBid(factory, exits, constraints, { valuationStatus: "INSUFFICIENT_DATA", overrideJustification: "comparáveis validados presencialmente" });
    expect(over.blocked).toBe(false);
    expect(over.warnings[0]).toMatch(/override/);
    const atypical = computeMaxBid(factory, exits, constraints, { valuationStatus: "ATYPICAL" });
    expect(atypical.blockedReason).toMatch(/ATÍPICO/);
  });

  it("loss framing: subir o lance reduz o lucro e o ROI", () => {
    const i = bidImpact(factory, exits.base, fromBRL(680_000), fromBRL(685_000));
    expect(i.profitDelta).toBeLessThan(0);
    expect(i.roiTo!).toBeLessThan(i.roiFrom!);
    // R$ 5.000 a mais no lance custa mais de R$ 5.000 (comissão, ITBI, registro, taxa e contingência acompanham)
    expect(-i.profitDelta).toBeGreaterThan(fromBRL(5_000));
  });

  it("alerta quando ROI alvo < ROI mínimo", () => {
    const r = computeMaxBid(factory, exits, { minRoi: 0.3, targetRoi: 0.2 });
    expect(r.warnings.join(" ")).toMatch(/ROI alvo menor/);
    // ainda assim os patamares saem ordenados
    for (let i = 1; i < r.tiers.length; i++) expect(r.tiers[i]!.bid).toBeGreaterThanOrEqual(r.tiers[i - 1]!.bid);
  });
});
