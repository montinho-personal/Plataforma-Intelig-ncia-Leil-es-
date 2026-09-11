"use server";

import { guarded } from "@/server/action-errors";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/data";
import type { PropertyInput } from "@/data/types";
import { requirePermission } from "@/server/auth";
import { bool, dec, enumOf, int, money, pct, str } from "@/server/forms";

const TYPES = ["APARTAMENTO", "CASA", "TERRENO", "COMERCIAL", "RURAL", "OUTRO"] as const;
const STANDARDS = ["ECONOMICO", "MEDIO", "ALTO", "LUXO"] as const;
const CONDITIONS = ["RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"] as const;
const OCCUPANCY = ["DESOCUPADO", "OCUPADO", "DESCONHECIDO"] as const;
const LIQUIDITY = ["ALTA", "MEDIA", "BAIXA"] as const;
const MODALITY = ["JUDICIAL", "EXTRAJUDICIAL"] as const;
const STATUS = ["RADAR", "TRIAGEM", "EM_ANALISE", "APROVADO", "REPROVADO", "ARREMATADO", "ENCERRADO", "DESCARTADO"] as const;

function parseProperty(fd: FormData): PropertyInput {
  const title = str(fd, "title");
  const city = str(fd, "city");
  const usableAreaM2 = dec(fd, "usableAreaM2");
  const type = enumOf(fd, "type", TYPES);
  if (!title || !city || !usableAreaM2 || usableAreaM2 <= 0 || !type) throw new Error("Título, cidade, tipo e área útil são obrigatórios.");
  const modality = enumOf(fd, "modality", MODALITY);
  return {
    status: enumOf(fd, "status", STATUS) ?? "RADAR",
    type,
    title,
    address: str(fd, "address"),
    neighborhood: str(fd, "neighborhood"),
    city,
    state: str(fd, "state") ?? "SP",
    condoName: str(fd, "condoName"),
    usableAreaM2,
    registryAreaM2: dec(fd, "registryAreaM2"),
    bedrooms: int(fd, "bedrooms"),
    suites: int(fd, "suites"),
    parking: int(fd, "parking"),
    floor: int(fd, "floor"),
    ageYears: int(fd, "ageYears"),
    buildingStandard: enumOf(fd, "buildingStandard", STANDARDS),
    condition: enumOf(fd, "condition", CONDITIONS),
    occupancy: enumOf(fd, "occupancy", OCCUPANCY) ?? "DESCONHECIDO",
    liquidityClass: enumOf(fd, "liquidityClass", LIQUIDITY),
    woodConstruction: bool(fd, "woodConstruction"),
    irregularConstruction: bool(fd, "irregularConstruction"),
    monthlyCondo: money(fd, "monthlyCondo"),
    monthlyIptu: money(fd, "monthlyIptu"),
    isFavorite: bool(fd, "isFavorite"),
    notes: str(fd, "notes"),
    auction: modality
      ? {
          modality,
          auctioneer: str(fd, "auctioneer"),
          courtCaseNumber: str(fd, "courtCaseNumber"),
          firstCallAt: str(fd, "firstCallAt"),
          firstCallMinBid: money(fd, "firstCallMinBid"),
          secondCallAt: str(fd, "secondCallAt"),
          secondCallMinBid: money(fd, "secondCallMinBid"),
          appraisalValue: money(fd, "appraisalValue"),
          commissionRate: pct(fd, "commissionRate"),
          condoDebt: money(fd, "condoDebt"),
          iptuDebt: money(fd, "iptuDebt"),
          url: str(fd, "auctionUrl"),
        }
      : null,
  };
}

export async function createPropertyAction(fd: FormData) {
  return guarded("/oportunidades/nova", async () => {
    const user = await requirePermission("editProperty");
    const repo = await getRepository();
    const rec = await repo.createProperty(user.groupId, parseProperty(fd), user.id);
    revalidatePath("/oportunidades");
    redirect(`/oportunidades/${rec.id}/comparaveis`);
  });
}

export async function updatePropertyAction(id: string, fd: FormData) {
  return guarded(`/oportunidades/${id}/imovel`, async () => {
    const user = await requirePermission("editProperty");
    const repo = await getRepository();
    await repo.updateProperty(user.groupId, id, parseProperty(fd), user.id);
    revalidatePath(`/oportunidades/${id}`);
    redirect(`/oportunidades/${id}`);
  });
}

export async function setPropertyStatusAction(id: string, fd: FormData) {
  return guarded(`/oportunidades/${id}`, async () => {
    const user = await requirePermission("editProperty");
    const status = enumOf(fd, "status", STATUS);
    if (!status) throw new Error("Status inválido");
    const repo = await getRepository();
    await repo.updateProperty(user.groupId, id, { status }, user.id);
    revalidatePath(`/oportunidades/${id}`);
    revalidatePath("/oportunidades");
  });
}

export async function toggleFavoriteAction(id: string, current: boolean) {
  const user = await requirePermission("editProperty");
  const repo = await getRepository();
  await repo.updateProperty(user.groupId, id, { isFavorite: !current }, user.id);
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/oportunidades");
}
