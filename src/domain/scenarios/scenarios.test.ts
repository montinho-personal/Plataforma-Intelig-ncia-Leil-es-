import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import type { UnderwritingInput } from "../underwriting";
import { buildScenarios, sensitivityPriceByMonths, sensitivityPriceByRenovation } from "./index";

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
const exitRange = { amount: fromBRL(1_220_000), low: fromBRL(1_170_000), high: fromBRL(1_270_000) };
const renovationRange = { low: fromBRL(82_000), likely: fromBRL(104_000), high: fromBRL(137_000) };

describe("scenarios", () => {
  it("gera quatro cenários com lucro crescente do pessimista ao otimista", () => {
    const s = buildScenarios({ base, exitRange, quickSale: fromBRL(1_034_000), renovationRange, occupancy: "DESCONHECIDO" });
    expect(s.map((x) => x.key)).toEqual(["PESSIMISTA", "CONSERVADOR", "BASE", "OTIMISTA"]);
    const profits = s.map((x) => x.underwriting.metrics.netProfit);
    expect(profits[0]!).toBeLessThan(profits[1]!);
    expect(profits[1]!).toBeLessThan(profits[2]!);
    expect(profits[2]!).toBeLessThan(profits[3]!);
  });

  it("cenário base reproduz as premissas do underwriting e delta zero", () => {
    const s = buildScenarios({ base, exitRange, quickSale: fromBRL(1_034_000), renovationRange, occupancy: "DESOCUPADO" });
    const b = s.find((x) => x.key === "BASE")!;
    expect(b.assumptions.exitValue).toBe(exitRange.amount);
    expect(b.assumptions.months).toBe(8);
    expect(b.assumptions.renovation).toBe(renovationRange.likely);
    expect(b.profitDeltaVsBase).toBe(0);
    const p = s.find((x) => x.key === "PESSIMISTA")!;
    expect(p.profitDeltaVsBase).toBeLessThan(0);
    expect(p.assumptions.exitValue).toBe(fromBRL(1_034_000));
    expect(p.assumptions.renovation).toBe(renovationRange.high);
  });

  it("ocupação desconhecida adiciona meses de desocupação nos cenários adversos", () => {
    const unknown = buildScenarios({ base, exitRange, quickSale: fromBRL(1_034_000), renovationRange, occupancy: "DESCONHECIDO" });
    const vacant = buildScenarios({ base, exitRange, quickSale: fromBRL(1_034_000), renovationRange, occupancy: "DESOCUPADO" });
    expect(unknown.find((x) => x.key === "PESSIMISTA")!.assumptions.months).toBe(8 + 6 + 4);
    expect(vacant.find((x) => x.key === "PESSIMISTA")!.assumptions.months).toBe(8 + 6);
    expect(unknown.find((x) => x.key === "PESSIMISTA")!.assumptions.evictionMonths).toBe(6);
  });

  it("otimista nunca tem prazo menor que a obra + 1", () => {
    const s = buildScenarios({ base: { ...base, months: 2, renovationMonths: 2 }, exitRange, quickSale: fromBRL(1_034_000), renovationRange });
    expect(s.find((x) => x.key === "OTIMISTA")!.assumptions.months).toBe(3);
  });

  it("matriz de sensibilidade preço × prazo: ROI cresce com preço e cai com prazo", () => {
    const m = sensitivityPriceByMonths(base);
    expect(m.rows).toHaveLength(6);
    expect(m.cols).toEqual([6, 8, 10, 12, 14]);
    for (let r = 1; r < m.rows.length; r++) {
      for (let c = 0; c < m.cols.length; c++) expect(m.cells[r]![c]!.roi!).toBeGreaterThan(m.cells[r - 1]![c]!.roi!);
    }
    for (let r = 0; r < m.rows.length; r++) {
      for (let c = 1; c < m.cols.length; c++) expect(m.cells[r]![c]!.roi!).toBeLessThan(m.cells[r]![c - 1]!.roi!);
    }
    const baseCell = m.cells[3]![1]!;
    expect(baseCell.rowValue).toBe(0);
    expect(baseCell.colValue).toBe(8);
  });

  it("matriz preço × reforma: lucro cai com reforma maior", () => {
    const m = sensitivityPriceByRenovation(base, renovationRange);
    for (const row of m.cells) {
      expect(row[0]!.netProfit).toBeGreaterThan(row[1]!.netProfit);
      expect(row[1]!.netProfit).toBeGreaterThan(row[2]!.netProfit);
    }
  });
});
