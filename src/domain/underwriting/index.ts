import { irr, annualize } from "../irr";
import { applyRate, roundCents, sumCents } from "../money";
import type { Cents, EpistemicStatus, Rate } from "../types";
import { DEFAULT_COST_TABLE, DEFAULT_TEAM_FEE, type CostTable, type TeamFee } from "./config";

export * from "./config";

export interface Financing {
  amount: Cents;
  annualRate: Rate;
}

export interface UnderwritingInput {
  /** Lance (valor de arrematação) */
  bid: Cents;
  /** Valor de saída do investidor no prazo-alvo (NUNCA o valor de mercado nem a avaliação do leilão) */
  exitValue: Cents;
  /** Prazo total da operação, da arrematação ao recebimento da venda, em meses */
  months: number;
  renovation: Cents;
  renovationMonths: number;
  monthlyCondo: Cents;
  monthlyIptu: Cents;
  /** Débitos assumidos pelo arrematante (do edital) */
  condoDebt: Cents;
  iptuDebt: Cents;
  /** Custo direto de desocupação (acordo, ação, mudança) */
  evictionCost: Cents;
  evictionMonths: number;
  costs?: Partial<CostTable>;
  teamFee?: TeamFee;
  financing?: Financing | null;
  /** Multiplicador geral de custos para cenários (1,0 = base) */
  costMultiplier?: number;
  /** Origem/estado por campo, para exibição */
  meta?: Partial<Record<string, { status: EpistemicStatus; source: string }>>;
}

export type CostBasis = "BID" | "EXIT" | "PROFIT" | "FIXED" | "MONTHLY" | "GAIN" | "DERIVED";

export interface CostLine {
  key: string;
  label: string;
  group: "AQUISICAO" | "OPERACAO" | "VENDA" | "TRIBUTOS" | "EQUIPE" | "CAPITAL";
  basis: CostBasis;
  rate?: Rate;
  amount: Cents;
  status: EpistemicStatus;
  source: string;
}

export interface UnderwritingMetrics {
  capitalNeeded: Cents;
  equity: Cents;
  acquisitionCosts: Cents;
  operationCosts: Cents;
  saleCosts: Cents;
  capitalGainsTax: Cents;
  teamFee: Cents;
  interest: Cents;
  totalCost: Cents;
  grossProfit: Cents;
  netProfit: Cents;
  capitalCost: Cents;
  economicProfit: Cents;
  roi: Rate | null;
  roe: Rate | null;
  margin: Rate | null;
  monthlyEquivalent: Rate | null;
  annualized: Rate | null;
  irrAnnual: Rate | null;
  capitalMonths: number;
  profitPerMonth: Cents;
  months: number;
}

export interface UnderwritingResult {
  input: UnderwritingInput;
  costs: CostTable;
  lines: CostLine[];
  metrics: UnderwritingMetrics;
  cashflow: Cents[];
  warnings: string[];
}

function m(input: UnderwritingInput, key: string, fallback: { status: EpistemicStatus; source: string }) {
  return input.meta?.[key] ?? fallback;
}

/**
 * Underwriting completo de uma operação de flip em leilão.
 * Todas as linhas são explícitas e rastreáveis. O lucro líquido é de caixa; o custo do capital
 * (oportunidade) aparece separado como lucro econômico, para não esconder capital parado.
 */
export function computeUnderwriting(input: UnderwritingInput): UnderwritingResult {
  const costs: CostTable = { ...DEFAULT_COST_TABLE, ...(input.costs ?? {}) };
  const teamFee = input.teamFee ?? DEFAULT_TEAM_FEE;
  const mult = input.costMultiplier ?? 1;
  const warnings: string[] = [];
  const B = input.bid;
  const V = input.exitValue;
  const months = Math.max(1, input.months);
  const profileMeta = { status: "HYPOTHESIS" as const, source: "perfil de investimento" };

  const lines: CostLine[] = [];
  const push = (line: CostLine) => {
    if (line.amount !== 0) lines.push(line);
  };

  // AQUISIÇÃO (dependem do lance)
  const commission = applyRate(B, costs.auctioneerCommissionRate);
  push({ key: "commission", label: "Comissão do leiloeiro", group: "AQUISICAO", basis: "BID", rate: costs.auctioneerCommissionRate, amount: commission, ...m(input, "commission", profileMeta) });
  const itbi = applyRate(B, costs.itbiRate);
  push({ key: "itbi", label: "ITBI", group: "AQUISICAO", basis: "BID", rate: costs.itbiRate, amount: itbi, ...m(input, "itbi", profileMeta) });
  const registry = applyRate(B, costs.registryRate) + roundCents(costs.registryFixed * mult);
  push({ key: "registry", label: "Registro e emolumentos", group: "AQUISICAO", basis: "BID", rate: costs.registryRate, amount: registry, ...m(input, "registry", profileMeta) });
  const deed = roundCents(costs.deedFixed * mult);
  push({ key: "deed", label: "Carta de arrematação / escritura", group: "AQUISICAO", basis: "FIXED", amount: deed, ...m(input, "deed", profileMeta) });
  const courtCosts = roundCents(costs.courtCostsFixed * mult);
  push({ key: "courtCosts", label: "Custas", group: "AQUISICAO", basis: "FIXED", amount: courtCosts, ...m(input, "courtCosts", profileMeta) });
  const lawyer = roundCents(costs.lawyerFixed * mult) + applyRate(B, costs.lawyerRateOfBid);
  push({ key: "lawyer", label: "Advogado", group: "AQUISICAO", basis: costs.lawyerRateOfBid > 0 ? "BID" : "FIXED", rate: costs.lawyerRateOfBid || undefined, amount: lawyer, ...m(input, "lawyer", profileMeta) });
  const advisory = roundCents(costs.advisoryFixed * mult);
  push({ key: "advisory", label: "Assessoria", group: "AQUISICAO", basis: "FIXED", amount: advisory, ...m(input, "advisory", profileMeta) });
  const documentation = roundCents(costs.documentationFixed * mult);
  push({ key: "documentation", label: "Documentação e certidões", group: "AQUISICAO", basis: "FIXED", amount: documentation, ...m(input, "documentation", profileMeta) });
  const engineering = roundCents(costs.engineeringFixed * mult);
  push({ key: "engineering", label: "Engenharia / laudos", group: "AQUISICAO", basis: "FIXED", amount: engineering, ...m(input, "engineering", profileMeta) });
  const debts = roundCents((input.condoDebt + input.iptuDebt) * mult);
  push({ key: "debts", label: "Débitos assumidos (condomínio + IPTU)", group: "AQUISICAO", basis: "FIXED", amount: debts, ...m(input, "debts", { status: "MISSING", source: "edital não informado" }) });
  const acquisitionCosts = sumCents([commission, itbi, registry, deed, courtCosts, lawyer, advisory, documentation, engineering, debts]);

  // OPERAÇÃO
  const renovation = roundCents(input.renovation * mult);
  push({ key: "renovation", label: "Reforma", group: "OPERACAO", basis: "FIXED", amount: renovation, ...m(input, "renovation", { status: "ESTIMATE", source: "estimador de reforma" }) });
  const monthlyCarry = input.monthlyCondo + input.monthlyIptu + costs.insuranceMonthly;
  const carrying = roundCents(monthlyCarry * months * mult);
  push({ key: "carrying", label: `Carregamento (${months} m × condomínio + IPTU + seguro)`, group: "OPERACAO", basis: "MONTHLY", amount: carrying, ...m(input, "carrying", { status: "ESTIMATE", source: "condomínio e IPTU mensais" }) });
  const eviction = roundCents(input.evictionCost * mult);
  push({ key: "eviction", label: `Desocupação (${input.evictionMonths} m)`, group: "OPERACAO", basis: "FIXED", amount: eviction, ...m(input, "eviction", { status: "HYPOTHESIS", source: "hipótese" }) });
  const contingencyBase = acquisitionCosts + carrying + eviction;
  const contingency = applyRate(contingencyBase, costs.contingencyRate);
  push({ key: "contingency", label: "Contingência geral", group: "OPERACAO", basis: "DERIVED", rate: costs.contingencyRate, amount: contingency, ...m(input, "contingency", profileMeta) });
  const operationCosts = sumCents([renovation, carrying, eviction, contingency]);

  const capitalNeeded = B + acquisitionCosts + operationCosts;

  // VENDA (dependem do valor de saída)
  const brokerage = applyRate(V, costs.brokerageRate);
  push({ key: "brokerage", label: "Corretagem", group: "VENDA", basis: "EXIT", rate: costs.brokerageRate, amount: brokerage, ...m(input, "brokerage", profileMeta) });
  const marketing = roundCents(costs.marketingFixed * mult);
  push({ key: "marketing", label: "Marketing e anúncio", group: "VENDA", basis: "FIXED", amount: marketing, ...m(input, "marketing", profileMeta) });
  const saleFees = roundCents(costs.saleFeesFixed * mult);
  push({ key: "saleFees", label: "Taxas de venda", group: "VENDA", basis: "FIXED", amount: saleFees, ...m(input, "saleFees", profileMeta) });
  const saleCosts = sumCents([brokerage, marketing, saleFees]);

  // TRIBUTOS
  const acquisitionCostForTax = B + commission + itbi + registry + deed + (costs.renovationDeductible ? renovation : 0);
  const gain = Math.max(0, V - brokerage - acquisitionCostForTax);
  const capitalGainsTax = applyRate(gain, costs.capitalGainsTaxRate);
  push({ key: "capitalGainsTax", label: "Imposto sobre ganho de capital", group: "TRIBUTOS", basis: "GAIN", rate: costs.capitalGainsTaxRate, amount: capitalGainsTax, ...m(input, "capitalGainsTax", { status: "HYPOTHESIS", source: "regra PF; validar com contador (isenções, PJ)" }) });

  // FINANCIAMENTO
  const financing = input.financing ?? null;
  const equity = financing ? Math.max(0, capitalNeeded - financing.amount) : capitalNeeded;
  const interest = financing ? roundCents(financing.amount * (Math.pow(1 + financing.annualRate, months / 12) - 1)) : 0;
  if (interest > 0) push({ key: "interest", label: "Juros do financiamento", group: "CAPITAL", basis: "DERIVED", rate: financing!.annualRate, amount: interest, ...m(input, "interest", { status: "ESTIMATE", source: "financiamento" }) });

  // EQUIPE (resolve circularidade quando é % do lucro)
  const profitBeforeFee = V - saleCosts - capitalGainsTax - capitalNeeded - interest;
  let fee = 0;
  if (teamFee.type === "PCT_OF_BID" || teamFee.type === "COMBINED") fee += applyRate(B, teamFee.pctOfBid);
  if (teamFee.type === "FIXED" || teamFee.type === "COMBINED") fee += teamFee.fixed;
  if (teamFee.type === "PCT_OF_PROFIT" || teamFee.type === "COMBINED") fee += applyRate(Math.max(0, profitBeforeFee), teamFee.pctOfProfit);
  push({ key: "teamFee", label: "Taxa de gestão / assessoria da equipe", group: "EQUIPE", basis: teamFee.type === "PCT_OF_PROFIT" ? "PROFIT" : teamFee.type === "FIXED" ? "FIXED" : "BID", rate: teamFee.type === "PCT_OF_BID" ? teamFee.pctOfBid : teamFee.type === "PCT_OF_PROFIT" ? teamFee.pctOfProfit : undefined, amount: fee, ...m(input, "teamFee", profileMeta) });

  const netProfit = profitBeforeFee - fee;
  const totalCost = capitalNeeded + saleCosts + capitalGainsTax + fee + interest;
  const grossProfit = V - capitalNeeded;

  // CUSTO DO CAPITAL (oportunidade) — econômico, não caixa
  const capitalCost = roundCents(equity * (Math.pow(1 + costs.capitalCostAnnualRate, months / 12) - 1));
  push({ key: "capitalCost", label: `Custo do capital (${(costs.capitalCostAnnualRate * 100).toFixed(1)}% a.a. × ${months} m)`, group: "CAPITAL", basis: "DERIVED", rate: costs.capitalCostAnnualRate, amount: capitalCost, ...m(input, "capitalCost", { ...profileMeta, source: "custo de oportunidade (não é caixa)" }) });
  const economicProfit = netProfit - capitalCost;

  // FLUXO DE CAIXA MENSAL para TIR (mês 0 = arrematação)
  const cashflow = buildCashflow({
    months,
    initial: B + acquisitionCosts + eviction + contingency - (financing?.amount ?? 0),
    renovation,
    renovationStart: Math.min(months - 1, Math.max(0, Math.round(input.evictionMonths))),
    renovationMonths: Math.max(1, Math.round(input.renovationMonths || 1)),
    monthlyCarry: roundCents(monthlyCarry * mult),
    final: V - saleCosts - capitalGainsTax - fee - (financing ? financing.amount + interest : 0),
  });
  const monthlyIrr = irr(cashflow);
  const irrAnnual = monthlyIrr === null ? null : annualize(monthlyIrr, 12);
  if (monthlyIrr === null) warnings.push("TIR indefinida para este fluxo de caixa.");

  const roi = equity > 0 ? netProfit / equity : null;
  const capitalMonths = capitalMonthsFromCashflow(cashflow);

  const metrics: UnderwritingMetrics = {
    capitalNeeded,
    equity,
    acquisitionCosts,
    operationCosts,
    saleCosts,
    capitalGainsTax,
    teamFee: fee,
    interest,
    totalCost,
    grossProfit,
    netProfit,
    capitalCost,
    economicProfit,
    roi: financing ? (capitalNeeded > 0 ? netProfit / capitalNeeded : null) : roi,
    roe: roi,
    margin: V > 0 ? netProfit / V : null,
    monthlyEquivalent: roi === null || roi <= -1 ? null : Math.pow(1 + roi, 1 / months) - 1,
    annualized: roi === null || roi <= -1 ? null : Math.pow(1 + roi, 12 / months) - 1,
    irrAnnual,
    capitalMonths,
    profitPerMonth: roundCents(netProfit / months),
    months,
  };

  if (V <= 0) warnings.push("Valor de saída ausente ou zero: underwriting sem base.");
  if (debts === 0) warnings.push("Débitos de condomínio/IPTU não informados: tratados como zero (dado AUSENTE, não fato).");
  if (netProfit < 0) warnings.push("Operação com prejuízo neste conjunto de premissas.");

  return { input, costs, lines, metrics, cashflow, warnings };
}

function buildCashflow(p: { months: number; initial: Cents; renovation: Cents; renovationStart: number; renovationMonths: number; monthlyCarry: Cents; final: Cents }): Cents[] {
  const flows: Cents[] = new Array(p.months + 1).fill(0);
  flows[0] = -p.initial;
  const perMonth = roundCents(p.renovation / p.renovationMonths);
  let allocated = 0;
  for (let i = 0; i < p.renovationMonths; i++) {
    const t = Math.min(p.months, p.renovationStart + 1 + i);
    const amt = i === p.renovationMonths - 1 ? p.renovation - allocated : perMonth;
    allocated += amt;
    flows[t] = (flows[t] ?? 0) - amt;
  }
  for (let t = 1; t <= p.months; t++) flows[t] = (flows[t] ?? 0) - p.monthlyCarry;
  flows[p.months] = (flows[p.months] ?? 0) + p.final;
  return flows;
}

/** Soma do capital líquido investido em cada mês (capital-meses). */
function capitalMonthsFromCashflow(flows: Cents[]): number {
  let invested = 0;
  let total = 0;
  for (let t = 0; t < flows.length - 1; t++) {
    invested += -(flows[t] ?? 0);
    total += Math.max(0, invested);
  }
  return Math.round(total / 100);
}
