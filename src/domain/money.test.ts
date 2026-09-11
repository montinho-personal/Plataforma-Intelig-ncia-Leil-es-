import { describe, expect, it } from "vitest";
import { allocateLargestRemainder, applyRate, formatBRL, formatPct, fromBRL, roundCents, sharesToBasisPoints } from "./money";

describe("money", () => {
  it("arredonda meio centavo para longe de zero e corrige ruído de ponto flutuante", () => {
    expect(roundCents(2.675 * 100)).toBe(268);
    expect(roundCents(-267.5)).toBe(-268);
    expect(roundCents(0.4999999)).toBe(0);
  });

  it("aplica taxas sem drift", () => {
    expect(applyRate(fromBRL(654_000), 0.05)).toBe(fromBRL(32_700));
    expect(applyRate(fromBRL(654_000), 0.03)).toBe(fromBRL(19_620));
    expect(applyRate(100, 0.005)).toBe(1);
  });

  it("formata em pt-BR", () => {
    expect(formatBRL(fromBRL(1_250_000)).replace(/ /g, " ")).toBe("R$ 1.250.000");
    expect(formatPct(0.277)).toBe("27,7%");
    expect(formatBRL(null)).toBe("—");
  });

  it("distribui pelo maior resto somando exatamente o total", () => {
    const parts = allocateLargestRemainder(100, [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    const big = allocateLargestRemainder(1_000_001, [3, 2, 5]);
    expect(big.reduce((a, b) => a + b, 0)).toBe(1_000_001);
    expect(allocateLargestRemainder(-100, [1, 3])).toEqual([-25, -75]);
  });

  it("participações somam 100,00%", () => {
    const bps = sharesToBasisPoints([350_000, 250_000, 400_000]);
    expect(bps).toEqual([3500, 2500, 4000]);
    const odd = sharesToBasisPoints([1, 1, 1]);
    expect(odd.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it("rejeita pesos inválidos", () => {
    expect(() => allocateLargestRemainder(10, [0, 0])).toThrow();
    expect(() => allocateLargestRemainder(10, [-1, 2])).toThrow();
  });
});
