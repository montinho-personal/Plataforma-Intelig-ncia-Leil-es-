"use server";

import { guarded } from "@/server/action-errors";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/data";
import type { MemberRole } from "@/data/types";
import { requirePermission } from "@/server/auth";
import { dec, enumOf, int, money, pct, str } from "@/server/forms";

export async function updateProfileCriteriaAction(fd: FormData) {
  return guarded("/config/perfil", async () => {
    const user = await requirePermission("editProfile");
    const repo = await getRepository();
    const p = await repo.getDefaultProfile(user.groupId);
    const minRoi = pct(fd, "minRoi");
    const targetRoi = pct(fd, "targetRoi");
    if (minRoi === null || targetRoi === null || minRoi < 0 || targetRoi < 0) throw new Error("ROI mínimo e ROI alvo são obrigatórios.");
    const modalities = fd.getAll("acceptedModalities").map(String).filter((m) => m === "JUDICIAL" || m === "EXTRAJUDICIAL") as ("JUDICIAL" | "EXTRAJUDICIAL")[];
    const types = fd.getAll("acceptedPropertyTypes").map(String) as typeof p.acceptedPropertyTypes;
    const horizon = int(fd, "defaultExitHorizonDays");
    const next = {
      ...p,
      name: str(fd, "name") ?? p.name,
      minRoi,
      targetRoi,
      minIrrAnnual: pct(fd, "minIrrAnnual"),
      minProfit: money(fd, "minProfit"),
      maxCapital: money(fd, "maxCapital"),
      maxMonths: int(fd, "maxMonths"),
      acceptedModalities: modalities.length ? modalities : p.acceptedModalities,
      acceptedPropertyTypes: types.length ? types : p.acceptedPropertyTypes,
      defaultExitHorizonDays: (([30, 60, 90, 120, 180] as const).find((h) => h === horizon) ?? p.defaultExitHorizonDays),
      defaultHoldingMonths: int(fd, "defaultHoldingMonths") ?? p.defaultHoldingMonths,
      defaultEvictionMonthsIfOccupied: int(fd, "defaultEvictionMonthsIfOccupied") ?? p.defaultEvictionMonthsIfOccupied,
      defaultEvictionCostIfOccupied: money(fd, "defaultEvictionCostIfOccupied") ?? p.defaultEvictionCostIfOccupied,
      regionFactor: dec(fd, "regionFactor") ?? p.regionFactor,
      valuation: {
        ...p.valuation,
        askingToClosingDiscount: pct(fd, "askingToClosingDiscount") ?? p.valuation.askingToClosingDiscount,
        investorExitMargin: pct(fd, "investorExitMargin") ?? p.valuation.investorExitMargin,
        liquidityCurve: {
          ALTA: curve(fd, "ALTA", p.valuation.liquidityCurve.ALTA),
          MEDIA: curve(fd, "MEDIA", p.valuation.liquidityCurve.MEDIA),
          BAIXA: curve(fd, "BAIXA", p.valuation.liquidityCurve.BAIXA),
        },
      },
    };
    await repo.updateProfile(user.groupId, next, user.id);
    revalidatePath("/config/perfil");
    revalidatePath("/oportunidades");
  });
}

function curve(fd: FormData, cls: string, current: Record<30 | 60 | 90 | 120 | 180, number>) {
  const out = { ...current };
  for (const h of [30, 60, 90, 120, 180] as const) {
    const v = pct(fd, `liq_${cls}_${h}`);
    if (v !== null) out[h] = v;
  }
  return out;
}

export async function updateProfileCostsAction(fd: FormData) {
  return guarded("/config/custos", async () => {
    const user = await requirePermission("editProfile");
    const repo = await getRepository();
    const p = await repo.getDefaultProfile(user.groupId);
    const c = p.costs;
    const teamType = enumOf(fd, "teamFeeType", ["PCT_OF_BID", "PCT_OF_PROFIT", "FIXED", "COMBINED", "NONE"] as const) ?? p.teamFee.type;
    const next = {
      ...p,
      costs: {
        ...c,
        auctioneerCommissionRate: pct(fd, "auctioneerCommissionRate") ?? c.auctioneerCommissionRate,
        itbiRate: pct(fd, "itbiRate") ?? c.itbiRate,
        registryRate: pct(fd, "registryRate") ?? c.registryRate,
        registryFixed: money(fd, "registryFixed") ?? c.registryFixed,
        deedFixed: money(fd, "deedFixed") ?? c.deedFixed,
        courtCostsFixed: money(fd, "courtCostsFixed") ?? c.courtCostsFixed,
        lawyerFixed: money(fd, "lawyerFixed") ?? c.lawyerFixed,
        lawyerRateOfBid: pct(fd, "lawyerRateOfBid") ?? c.lawyerRateOfBid,
        advisoryFixed: money(fd, "advisoryFixed") ?? c.advisoryFixed,
        engineeringFixed: money(fd, "engineeringFixed") ?? c.engineeringFixed,
        documentationFixed: money(fd, "documentationFixed") ?? c.documentationFixed,
        insuranceMonthly: money(fd, "insuranceMonthly") ?? c.insuranceMonthly,
        marketingFixed: money(fd, "marketingFixed") ?? c.marketingFixed,
        saleFeesFixed: money(fd, "saleFeesFixed") ?? c.saleFeesFixed,
        brokerageRate: pct(fd, "brokerageRate") ?? c.brokerageRate,
        capitalGainsTaxRate: pct(fd, "capitalGainsTaxRate") ?? c.capitalGainsTaxRate,
        renovationDeductible: fd.get("renovationDeductible") === "on",
        capitalCostAnnualRate: pct(fd, "capitalCostAnnualRate") ?? c.capitalCostAnnualRate,
        contingencyRate: pct(fd, "contingencyRate") ?? c.contingencyRate,
      },
      teamFee: {
        type: teamType,
        pctOfBid: pct(fd, "teamPctOfBid") ?? p.teamFee.pctOfBid,
        pctOfProfit: pct(fd, "teamPctOfProfit") ?? p.teamFee.pctOfProfit,
        fixed: money(fd, "teamFixed") ?? p.teamFee.fixed,
      },
    };
    await repo.updateProfile(user.groupId, next, user.id);
    revalidatePath("/config/custos");
    revalidatePath("/oportunidades");
  });
}

export async function updateMemberRoleAction(userId: string, fd: FormData) {
  return guarded("/config/usuarias", async () => {
    const user = await requirePermission("manageMembers");
    const repo = await getRepository();
    const role = enumOf(fd, "role", ["ADMIN", "ANALISTA", "INVESTIDOR", "JURIDICO", "FINANCEIRO", "VISUALIZACAO"] as const) as MemberRole | null;
    if (!role) throw new Error("Papel inválido");
    if (userId === user.id && role !== "ADMIN") throw new Error("Você não pode remover o próprio papel de ADMIN.");
    await repo.updateMemberRole(user.groupId, userId, role);
    revalidatePath("/config/usuarias");
  });
}
