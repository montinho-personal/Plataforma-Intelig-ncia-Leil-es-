/**
 * TIR (IRR) periódica e XIRR por datas.
 * Estratégia: Newton-Raphson com fallback para bisseção; retorna null quando não há
 * mudança de sinal (TIR indefinida) ou não converge.
 */

function npv(rate: number, flows: number[]): number {
  let total = 0;
  for (let t = 0; t < flows.length; t++) {
    total += (flows[t] ?? 0) / Math.pow(1 + rate, t);
  }
  return total;
}

function dnpv(rate: number, flows: number[]): number {
  let total = 0;
  for (let t = 1; t < flows.length; t++) {
    total += (-t * (flows[t] ?? 0)) / Math.pow(1 + rate, t + 1);
  }
  return total;
}

function hasSignChange(flows: number[]): boolean {
  let pos = false;
  let neg = false;
  for (const f of flows) {
    if (f > 0) pos = true;
    if (f < 0) neg = true;
  }
  return pos && neg;
}

/**
 * TIR por período (ex.: mensal quando os fluxos são mensais).
 * @returns taxa por período ou null.
 */
export function irr(flows: number[], options: { tolerance?: number; maxIterations?: number } = {}): number | null {
  const tol = options.tolerance ?? 1e-10;
  const maxIter = options.maxIterations ?? 100;
  if (flows.length < 2 || !hasSignChange(flows)) return null;

  // Newton a partir de um chute razoável
  let rate = 0.01;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(rate, flows);
    const df = dnpv(rate, flows);
    if (Math.abs(f) < tol) return rate;
    if (df === 0 || !Number.isFinite(df)) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < tol) return next;
    rate = next;
  }

  // Bisseção em [-0.99, 10]
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo, flows);
  const fHi = npv(hi, flows);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 500; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < 1e-12) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return null;
}

/** Converte taxa por período em taxa anual equivalente. */
export function annualize(periodRate: number, periodsPerYear: number): number {
  return Math.pow(1 + periodRate, periodsPerYear) - 1;
}

/** TIR anual de fluxos mensais (fluxo[0] no mês 0). */
export function irrAnnualFromMonthly(flows: number[]): number | null {
  const monthly = irr(flows);
  return monthly === null ? null : annualize(monthly, 12);
}

export interface DatedFlow {
  date: Date | string;
  amount: number;
}

/** XIRR: taxa anual a partir de fluxos datados (convenção ACT/365). */
export function xirr(flows: DatedFlow[], options: { tolerance?: number } = {}): number | null {
  if (flows.length < 2) return null;
  const amounts = flows.map((f) => f.amount);
  if (!hasSignChange(amounts)) return null;
  const dates = flows.map((f) => (typeof f.date === "string" ? new Date(f.date) : f.date));
  const t0 = dates[0]!.getTime();
  const years = dates.map((d) => (d.getTime() - t0) / (365 * 24 * 3600 * 1000));
  const tol = options.tolerance ?? 1e-10;

  const f = (r: number) => amounts.reduce((acc, a, i) => acc + a / Math.pow(1 + r, years[i] ?? 0), 0);
  const df = (r: number) =>
    amounts.reduce((acc, a, i) => acc - ((years[i] ?? 0) * a) / Math.pow(1 + r, (years[i] ?? 0) + 1), 0);

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const v = f(rate);
    const d = df(rate);
    if (Math.abs(v) < tol) return rate;
    if (d === 0 || !Number.isFinite(d)) break;
    const next = rate - v / d;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < tol) return next;
    rate = next;
  }
  let lo = -0.99;
  let hi = 10;
  let fLo = f(lo);
  if (fLo * f(hi) > 0) return null;
  for (let i = 0; i < 500; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < 1e-12) return mid;
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return null;
}
