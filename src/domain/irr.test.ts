import { describe, expect, it } from "vitest";
import { annualize, irr, irrAnnualFromMonthly, xirr } from "./irr";

describe("irr", () => {
  it("resolve TIR simples de um período", () => {
    // -100 hoje, +110 em 1 período → 10%
    expect(irr([-100, 110])!).toBeCloseTo(0.1, 10);
  });

  it("resolve fluxo com múltiplos períodos (caso de ouro de planilha)", () => {
    // Referência independente (bisseção em Python): 0.0889633947
    expect(irr([-1000, 300, 400, 500])!).toBeCloseTo(0.0889633947, 8);
  });

  it("retorna null sem mudança de sinal", () => {
    expect(irr([-100, -50, -10])).toBeNull();
    expect(irr([100, 50])).toBeNull();
    expect(irr([-100])).toBeNull();
  });

  it("anualiza taxa mensal", () => {
    expect(annualize(0.01, 12)).toBeCloseTo(0.126825, 5);
    expect(irrAnnualFromMonthly([-100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 112.6825])!).toBeCloseTo(0.126825, 4);
  });

  it("suporta TIR negativa (prejuízo)", () => {
    expect(irr([-100, 90])!).toBeCloseTo(-0.1, 10);
  });

  it("xirr bate com planilha para fluxos datados", () => {
    // Excel XIRR: -10000 em 2008-01-01, 2750 em 2008-03-01, 4250 em 2008-10-30, 3250 em 2009-02-15, 2750 em 2009-04-01 = 0.373362535
    const r = xirr([
      { date: "2008-01-01", amount: -10000 },
      { date: "2008-03-01", amount: 2750 },
      { date: "2008-10-30", amount: 4250 },
      { date: "2009-02-15", amount: 3250 },
      { date: "2009-04-01", amount: 2750 },
    ]);
    expect(r!).toBeCloseTo(0.3733625, 5);
  });
});
