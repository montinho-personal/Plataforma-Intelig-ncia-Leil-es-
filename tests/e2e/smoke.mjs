/**
 * Fumaça end-to-end contra um servidor em execução (modo local).
 * Uso: DATA_BACKEND=local pnpm build && pnpm start -p 3123 &; node tests/e2e/smoke.mjs <propertyId>
 */
import { chromium } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:3123";
const id = process.argv[2];
const exe = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const results = [];
const check = (name, ok) => { results.push([name, ok]); console.log(ok ? "✔" : "✘", name); };

/** Clica e espera a server action (POST) terminar e a página re-renderizar. */
async function submit(locator) {
  const resp = page.waitForResponse((r) => r.request().method() === "POST");
  await locator.click();
  const r = await resp;
  await page.waitForLoadState("networkidle");
  // a árvore RSC é aplicada após a resposta; aguarda a re-renderização
  await page.waitForTimeout(1200);
  return r.status();
}

const shots = ["/", "/oportunidades", `/oportunidades/${id}`, `/oportunidades/${id}/comparaveis`, `/oportunidades/${id}/valuation`, `/oportunidades/${id}/reforma`, `/oportunidades/${id}/underwriting`, `/oportunidades/${id}/cenarios`, `/oportunidades/${id}/lance-maximo`, `/oportunidades/${id}/riscos`, `/oportunidades/${id}/memorando`, "/config/perfil", "/config/custos", "/config/usuarias", "/auditoria"];
for (const [i, path] of shots.entries()) {
  const r = await page.goto(base + path, { waitUntil: "networkidle" });
  check(`GET ${path} → ${r.status()}`, r.status() === 200);
  await page.screenshot({ path: `/tmp/shots/${String(i).padStart(2, "0")}-${path.replace(/[^a-z0-9]+/gi, "_") || "home"}.png`, fullPage: true });
}

// adicionar comparável
await page.goto(`${base}/oportunidades/${id}/comparaveis`, { waitUntil: "networkidle" });
const before = await page.locator("tbody tr").count();
await page.fill('input[name="source"]', "E2E Teste");
await page.fill('input[name="price"]', "1300000");
await page.fill('input[name="usableAreaM2"]', "99");
await page.fill('input[name="bedrooms"]', "3");
await page.fill('input[name="parking"]', "2");
await page.selectOption('select[name="location"]', "CONDO");
await page.selectOption('select[name="condition"]', "BOM");
await submit(page.locator('button:has-text("Adicionar")'));
check("comparável adicionado", (await page.locator("tbody tr").count()) === before + 1);

// excluir com motivo
const row = page.locator("tbody tr", { hasText: "E2E Teste" }).last();
await row.locator('input[name="reason"]').fill("teste e2e");
await submit(row.locator('button:has-text("excluir")'));
check("comparável excluído com motivo", (await page.getByText("excluído: teste e2e").count()) >= 1);

// nível de reforma
await page.goto(`${base}/oportunidades/${id}/reforma`, { waitUntil: "networkidle" });
await submit(page.locator('form button:text-is("Leve")'));
check("nível de reforma alterado para Leve", (await page.getByText("Selecionado: Leve").count()) === 1);
await submit(page.locator('form button:text-is("Média")'));

// prazo de saída
await page.goto(`${base}/oportunidades/${id}/valuation`, { waitUntil: "networkidle" });
const row120 = page.locator("tr", { hasText: "120 d" }).first();
await submit(row120.locator('button:text-is("usar")'));
check("prazo-alvo alterado para 120 d", (await page.locator("tr", { hasText: "120 d" }).first().getByText("prazo-alvo").count()) === 1);
const row90 = page.locator("tr", { hasText: "90 d" }).first();
await submit(row90.locator('button:text-is("usar")'));

// underwriting: lance de referência
await page.goto(`${base}/oportunidades/${id}/underwriting`, { waitUntil: "networkidle" });
await page.fill('input[name="referenceBid"]', "650000");
await submit(page.locator('button:has-text("Recalcular")'));
check("lance de referência aplicado", (await page.getByText("lance R$ 650.000").count()) === 1);

// risco crítico + decisão + teto
await page.goto(`${base}/oportunidades/${id}/riscos`, { waitUntil: "networkidle" });
await page.fill('input[name="fact"]', "Matrícula com penhora de terceiro (av. 12)");
await page.fill('input[name="risk"]', "Ônus não baixado pode atrasar registro");
await page.fill('input[name="probability"]', "4");
await page.fill('input[name="impactScore"]', "4");
await submit(page.locator('button:has-text("Registrar")'));
check("risco crítico registrado (P×I=16)", (await page.getByText("4×4=16").count()) === 1);

await page.goto(`${base}/oportunidades/${id}/memorando`, { waitUntil: "networkidle" });
await page.selectOption('select[name="decision"]', "APROVAR_COM_CONDICOES");
await submit(page.locator('button:has-text("Registrar decisão")'));
check("decisão registrada (versão na tabela)", (await page.locator("tbody tr", { hasText: "APROVAR COM CONDIÇÕES" }).count()) >= 1);

// teto sem reconhecer risco crítico deve falhar (error boundary), depois com reconhecimento deve passar
await submit(page.locator('button:has-text("Aprovar teto")'));
const blocked = (await page.getByText("risco(s) crítico(s) em aberto. Reconheça").count()) >= 1 && (await page.getByText("Teto vigente").count()) === 0;
check("teto bloqueado sem reconhecer risco crítico", blocked);
await page.goto(`${base}/oportunidades/${id}/memorando`, { waitUntil: "networkidle" });
await page.check('input[name="acknowledgeCritical"]');
await submit(page.locator('button:has-text("Aprovar teto")'));
check("teto aprovado com reconhecimento", (await page.getByText("Teto vigente").count()) === 1);
await page.screenshot({ path: `/tmp/shots/99-memorando-final.png`, fullPage: true });

// novo imóvel atípico
await page.goto(`${base}/oportunidades/nova`, { waitUntil: "networkidle" });
await page.fill('input[name="title"]', "Casa de madeira E2E 200 m²");
await page.selectOption('select[name="type"]', "CASA");
await page.fill('input[name="city"]', "Cotia");
await page.fill('input[name="usableAreaM2"]', "200");
await page.check('input[name="woodConstruction"]');
await page.fill('input[name="secondCallMinBid"]', "140000");
await submit(page.locator('button:has-text("Cadastrar")'));
check("novo imóvel redireciona para comparáveis", /\/oportunidades\/[0-9a-f-]+\/comparaveis$/.test(page.url()));
check("cabeçalho mostra CASO ATÍPICO", (await page.getByText("CASO ATÍPICO — NECESSITA VALIDAÇÃO ESPECIALIZADA").count()) === 1);

// home lista atenção
await page.goto(base + "/", { waitUntil: "networkidle" });
check("home lista item de atenção", (await page.locator("li").count()) >= 1);
await page.screenshot({ path: `/tmp/shots/98-home-final.png`, fullPage: true });

console.log("errors:", errors);
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} checks OK`);
await browser.close();
process.exit(failed.length ? 1 : 0);
