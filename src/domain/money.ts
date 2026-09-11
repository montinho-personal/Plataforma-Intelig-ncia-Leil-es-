import type { Cents, Rate } from "./types";

/** Arredonda para centavo inteiro (half away from zero), evitando ruído de ponto flutuante. */
export function roundCents(value: number): Cents {
  if (!Number.isFinite(value)) throw new Error(`Valor monetário inválido: ${value}`);
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  // 1e-9 corrige casos como 2.675 * 100 = 267.49999999999997
  return sign * Math.round(abs + 1e-9);
}

/** Aplica uma taxa sobre um valor em centavos. */
export function applyRate(amount: Cents, rate: Rate): Cents {
  return roundCents(amount * rate);
}

/** Converte reais (número decimal) em centavos. */
export function fromBRL(reais: number): Cents {
  return roundCents(reais * 100);
}

export function toBRL(cents: Cents): number {
  return cents / 100;
}

export function sumCents(values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Divisão segura; retorna null quando o denominador é zero. */
export function safeDiv(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function formatBRL(cents: Cents | null | undefined, opts: { cents?: boolean } = {}): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  return opts.cents ? brlCents.format(cents / 100) : brl.format(Math.round(cents / 100));
}

/** Formato compacto para números grandes: R$ 1,25M · R$ 870k */
export function formatBRLCompact(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const reais = cents / 100;
  const abs = Math.abs(reais);
  const sign = reais < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000).toLocaleString("pt-BR")}k`;
  return `${sign}R$ ${Math.round(abs).toLocaleString("pt-BR")}`;
}

export function formatPct(rate: Rate | null | undefined, digits = 1): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/**
 * Distribui um total inteiro (centavos) proporcionalmente a pesos, pelo método do maior resto.
 * Garante que a soma das partes seja exatamente o total. Usado em participações e distribuições.
 */
export function allocateLargestRemainder(total: Cents, weights: number[]): Cents[] {
  if (weights.length === 0) return [];
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW <= 0) throw new Error("Pesos devem somar valor positivo");
  if (weights.some((w) => w < 0)) throw new Error("Pesos não podem ser negativos");
  const sign = total < 0 ? -1 : 1;
  const absTotal = Math.abs(total);
  const raw = weights.map((w) => (absTotal * w) / sumW);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = absTotal - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remainder -= 1;
  }
  return floors.map((f) => f * sign);
}

/** Converte participações (frações) em percentuais que somam exatamente 100,00% (em centésimos de %). */
export function sharesToBasisPoints(weights: number[]): number[] {
  return allocateLargestRemainder(10_000, weights);
}
