/**
 * Seed de demonstração para o modo local (DATA_BACKEND=local).
 * Cria um imóvel completo com comparáveis para percorrer a jornada cadastro → memorando.
 * Uso: pnpm seed:local
 */
import { LocalJsonRepository } from "../src/data/local";
import { fromBRL } from "../src/domain/money";

async function main() {
  const repo = new LocalJsonRepository();
  const user = (await repo.getCurrentUser())!;
  const existing = await repo.listProperties(user.groupId);
  if (existing.length > 0) {
    console.log(`Já existem ${existing.length} imóveis; nada a fazer.`);
    return;
  }
  await repo.getDefaultProfile(user.groupId);
  const p = await repo.createProperty(
    user.groupId,
    {
      status: "EM_ANALISE",
      type: "APARTAMENTO",
      title: "Apto 98 m² · Rua Cardoso de Almeida, 1200",
      address: "Rua Cardoso de Almeida, 1200, ap. 82",
      neighborhood: "Perdizes",
      city: "São Paulo",
      state: "SP",
      condoName: "Ed. Vila Pompeia",
      usableAreaM2: 98,
      registryAreaM2: 98.4,
      bedrooms: 3,
      suites: 1,
      parking: 2,
      floor: 8,
      ageYears: 25,
      buildingStandard: "MEDIO",
      condition: "REGULAR",
      occupancy: "DESCONHECIDO",
      liquidityClass: "MEDIA",
      woodConstruction: false,
      irregularConstruction: false,
      monthlyCondo: fromBRL(950),
      monthlyIptu: fromBRL(420),
      isFavorite: true,
      notes: "Exemplo de demonstração. Dados fictícios.",
      auction: {
        modality: "EXTRAJUDICIAL",
        auctioneer: "Leiloeiro Exemplo",
        courtCaseNumber: null,
        firstCallAt: "2026-09-02T14:00",
        firstCallMinBid: fromBRL(1_100_000),
        secondCallAt: "2026-09-16T14:00",
        secondCallMinBid: fromBRL(620_000),
        appraisalValue: fromBRL(1_100_000),
        commissionRate: 0.05,
        condoDebt: fromBRL(10_000),
        iptuDebt: fromBRL(4_300),
        url: "https://exemplo.invalid/lote/184",
      },
    },
    user.id,
  );
  const comps = [
    { source: "ZAP", price: 1_290_000, area: 96, condition: "BOM", sameCondo: true, days: 30, url: "https://exemplo.invalid/zap/1" },
    { source: "VivaReal", price: 1_450_000, area: 104, condition: "REFORMADO", sameCondo: false, sameStreet: true, distanceM: 220, days: 75, url: "https://exemplo.invalid/vr/2" },
    { source: "Corretor local (vendido)", price: 1_240_000, area: 98, condition: "BOM", sameCondo: true, kind: "SOLD" as const, days: null, url: null },
    { source: "OLX", price: 1_330_000, area: 100, condition: "BOM", parking: 3, sameCondo: false, distanceM: 600, days: 45, url: "https://exemplo.invalid/olx/4" },
    { source: "ZAP", price: 1_270_000, area: 95, condition: "REGULAR", floor: 3, sameCondo: false, distanceM: 350, days: 120, url: "https://exemplo.invalid/zap/5" },
    { source: "Imobiliária X", price: 2_100_000, area: 150, condition: "BOM", parking: 3, bedrooms: 4, sameCondo: false, distanceM: 900, days: 60, url: null },
  ];
  for (const c of comps) {
    await repo.createComparable(
      user.groupId,
      {
        propertyId: p.id,
        source: c.source,
        url: c.url,
        capturedAt: "2026-09-01",
        kind: c.kind ?? "LISTING",
        address: null,
        distanceM: c.distanceM ?? null,
        sameCondo: c.sameCondo ?? false,
        sameStreet: c.sameStreet ?? false,
        sameNeighborhood: true,
        usableAreaM2: c.area,
        bedrooms: c.bedrooms ?? 3,
        parking: c.parking ?? 2,
        floor: c.floor ?? 8,
        ageYears: 25,
        buildingStandard: "MEDIO",
        condition: c.condition as never,
        monthlyCondo: null,
        price: fromBRL(c.price),
        daysOnMarket: c.days,
        notes: null,
        excluded: false,
        excludedReason: null,
      },
      user.id,
    );
  }
  const all = await repo.listComparables(user.groupId, p.id);
  const big = all.find((c) => c.usableAreaM2 === 150)!;
  await repo.updateComparable(user.groupId, big.id, { excluded: true, excludedReason: "área muito diferente (150 m²)" }, user.id);
  await repo.createRisk(
    user.groupId,
    { propertyId: p.id, category: "OCUPACAO", fact: "Edital não informa ocupação (p. 3)", risk: "Imóvel ocupado: desocupação pode levar 6–12 meses", impact: "Capital parado; custo de carregamento; ação de imissão na posse", recommendedAction: "Visita ao local e consulta ao condomínio antes do leilão", probability: 3, impactScore: 4, isCritical: false, status: "ABERTO" },
    user.id,
  );
  console.log(`Seed criado: imóvel #${p.code} (${p.id}) com ${comps.length} comparáveis.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
