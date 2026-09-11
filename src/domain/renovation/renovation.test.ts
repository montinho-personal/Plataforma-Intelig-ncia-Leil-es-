import { describe, expect, it } from "vitest";
import { fromBRL } from "../money";
import { conditionAfterRenovation, estimateRenovation } from "./index";

const apto = { type: "APARTAMENTO" as const, usableAreaM2: 100, ageYears: 20, condition: "BOM" as const, targetStandard: "MEDIO" as const };

describe("renovation", () => {
  it("nível NONE retorna zero com aviso", () => {
    const e = estimateRenovation(apto, "NONE");
    expect(e.total).toEqual({ low: 0, likely: 0, high: 0 });
    expect(e.items).toHaveLength(0);
    expect(e.warnings[0]).toMatch(/Sem reforma/);
  });

  it("sempre devolve três números ordenados e a soma dos itens bate com o total", () => {
    for (const level of ["COSMETIC", "LIGHT", "MEDIUM", "HEAVY", "FULL"] as const) {
      const e = estimateRenovation(apto, level);
      expect(e.total.low).toBeLessThan(e.total.likely);
      expect(e.total.likely).toBeLessThan(e.total.high);
      const sum = e.items.reduce((a, i) => a + i.likely, 0);
      expect(sum).toBe(e.total.likely);
      expect(e.items.reduce((a, i) => a + i.low, 0)).toBe(e.total.low);
      expect(e.items.reduce((a, i) => a + i.high, 0)).toBe(e.total.high);
    }
  });

  it("cosmética em 100 m² padrão médio: pintura 65×... = tabela × área", () => {
    const e = estimateRenovation(apto, "COSMETIC");
    const pintura = e.items.find((i) => i.category === "PINTURA")!;
    expect(pintura.likely).toBe(fromBRL(45 * 100));
    expect(pintura.low).toBe(fromBRL(45 * 100 * 0.85));
    expect(pintura.high).toBe(fromBRL(45 * 100 * 1.2));
    expect(pintura.epistemicStatus).toBe("HYPOTHESIS");
    expect(e.contingencyRate).toBe(0.08);
    const cont = e.items.find((i) => i.category === "CONTINGENCIA")!;
    expect(cont.likely).toBe(Math.round(e.subtotal.likely * 0.08));
  });

  it("apartamento não recebe telhado/fachada/paisagismo; casa recebe", () => {
    const a = estimateRenovation(apto, "HEAVY");
    expect(a.items.find((i) => i.category === "TELHADO")).toBeUndefined();
    const casa = estimateRenovation({ ...apto, type: "CASA" }, "HEAVY");
    expect(casa.items.find((i) => i.category === "TELHADO")).toBeDefined();
    expect(casa.total.likely).toBeGreaterThan(a.total.likely);
  });

  it("padrão, idade, estado e região escalam o custo", () => {
    const base = estimateRenovation(apto, "MEDIUM").total.likely;
    expect(estimateRenovation({ ...apto, targetStandard: "ALTO" }, "MEDIUM").total.likely).toBeGreaterThan(base);
    expect(estimateRenovation({ ...apto, ageYears: 55 }, "MEDIUM").total.likely).toBeGreaterThan(base);
    expect(estimateRenovation({ ...apto, condition: "RUIM" }, "MEDIUM").total.likely).toBeGreaterThan(base);
    expect(estimateRenovation(apto, "MEDIUM", { regionFactor: 1.2 }).total.likely).toBeGreaterThan(base);
    // fator de idade só afeta categorias sensíveis
    const old = estimateRenovation({ ...apto, ageYears: 55 }, "MEDIUM");
    const young = estimateRenovation(apto, "MEDIUM");
    expect(old.items.find((i) => i.category === "PINTURA")!.likely).toBe(young.items.find((i) => i.category === "PINTURA")!.likely);
    expect(old.items.find((i) => i.category === "ELETRICA")!.likely).toBeGreaterThan(young.items.find((i) => i.category === "ELETRICA")!.likely);
  });

  it("orçamento real substitui a tabela e vira FATO", () => {
    const e = estimateRenovation(apto, "MEDIUM", {
      overrides: [{ category: "COZINHA", low: fromBRL(20_000), likely: fromBRL(22_000), high: fromBRL(25_000), source: "Marcenaria X, orçamento 05/09", basis: "QUOTE" }],
    });
    const coz = e.items.find((i) => i.category === "COZINHA")!;
    expect(coz.likely).toBe(fromBRL(22_000));
    expect(coz.epistemicStatus).toBe("FACT");
    expect(coz.source).toMatch(/Marcenaria X/);
  });

  it("exige orçamento profissional em reforma pesada de imóvel atípico", () => {
    expect(estimateRenovation({ ...apto, atypicalCritical: true }, "HEAVY").requiresProfessionalQuote).toBe(true);
    expect(estimateRenovation({ ...apto, atypicalCritical: true }, "LIGHT").requiresProfessionalQuote).toBe(false);
  });

  it("estimativa média para ~100 m² fica na ordem de grandeza esperada (dezenas de milhares)", () => {
    const e = estimateRenovation(apto, "MEDIUM");
    expect(e.total.likely).toBeGreaterThan(fromBRL(70_000));
    expect(e.total.likely).toBeLessThan(fromBRL(150_000));
    expect(e.durationWeeks.likely).toBe(8);
  });

  it("estado após reforma segue o nível", () => {
    expect(conditionAfterRenovation("RUIM", "COSMETIC")).toBe("REGULAR");
    expect(conditionAfterRenovation("BOM", "COSMETIC")).toBe("BOM");
    expect(conditionAfterRenovation("RUIM", "LIGHT")).toBe("BOM");
    expect(conditionAfterRenovation("REGULAR", "MEDIUM")).toBe("REFORMADO");
    expect(conditionAfterRenovation(null, "FULL")).toBe("NOVO");
    expect(conditionAfterRenovation("REGULAR", "NONE")).toBe("REGULAR");
  });
});
