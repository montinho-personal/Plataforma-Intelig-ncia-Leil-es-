/** Verificação do menu em gaveta e da legibilidade em largura de celular. */
import { chromium, devices } from "playwright";
const base = process.env.BASE_URL ?? "http://localhost:3123";
const id = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const results = [];
const check = (n, ok) => { results.push([n, ok]); console.log(ok ? "✔" : "✘", n); };

// ---------- Celular ----------
const phone = await browser.newContext({ ...devices["Pixel 7"] });
const page = await phone.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${base}/oportunidades`, { waitUntil: "networkidle" });
const sidebar = page.locator("aside").first();
const menuBtn = page.getByRole("button", { name: "Abrir menu" });
check("botão de menu visível no celular", await menuBtn.isVisible());
const box = await sidebar.boundingBox();
check("menu fora da tela quando fechado", !box || box.x + box.width <= 1);
const mainW = await page.locator("main").first().evaluate((el) => el.getBoundingClientRect().width);
check(`conteúdo ocupa a largura toda (${Math.round(mainW)}px de ${page.viewportSize().width})`, mainW >= page.viewportSize().width - 1);
const hScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check(`sem rolagem horizontal na página (${hScroll}px)`, hScroll <= 1);
check("radar em cartões no celular (sem tabela densa)", (await page.locator("ul.md\\:hidden li").count()) >= 1 && !(await page.locator("table").first().isVisible()));
await page.screenshot({ path: "/tmp/shots/m1-radar-fechado.png", fullPage: true });

await menuBtn.click();
await page.waitForTimeout(400);
const box2 = await sidebar.boundingBox();
check("menu abre sobre o conteúdo", !!box2 && box2.x >= -1);
await page.screenshot({ path: "/tmp/shots/m2-radar-menu-aberto.png" });

await page.getByRole("link", { name: "Perfil de investimento" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(400);
check("navegou para o perfil", page.url().includes("/config/perfil"));
const box3 = await sidebar.boundingBox();
check("menu fecha ao tocar num link", !box3 || box3.x + box3.width <= 1);
await page.screenshot({ path: "/tmp/shots/m3-perfil.png", fullPage: true });

// fecha pelo fundo escuro
await page.getByRole("button", { name: "Abrir menu" }).click();
await page.waitForTimeout(300);
await page.mouse.click(page.viewportSize().width - 10, 400);
await page.waitForTimeout(400);
const box4 = await sidebar.boundingBox();
check("menu fecha ao tocar fora", !box4 || box4.x + box4.width <= 1);

// páginas densas da oportunidade
for (const [seg, nome] of [["", "resumo"], ["/comparaveis", "comparáveis"], ["/underwriting", "underwriting"], ["/memorando", "memorando"]]) {
  await page.goto(`${base}/oportunidades/${id}${seg}`, { waitUntil: "networkidle" });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${nome}: sem rolagem horizontal (${over}px)`, over <= 1);
  await page.screenshot({ path: `/tmp/shots/m4-${nome}.png`, fullPage: true });
}

// ---------- Desktop ----------
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await desk.newPage();
await dp.goto(`${base}/oportunidades`, { waitUntil: "networkidle" });
check("menu fixo visível no desktop", await dp.locator("aside").first().isVisible());
check("tabela do radar visível no desktop", await dp.locator("table").first().isVisible());
check("sem botão de menu no desktop", !(await dp.getByRole("button", { name: "Abrir menu" }).isVisible()));
await dp.screenshot({ path: "/tmp/shots/d1-desktop.png" });

console.log("erros de página:", errors);
const failed = results.filter(([, ok]) => !ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações OK`);
await browser.close();
process.exit(failed.length ? 1 : 0);
