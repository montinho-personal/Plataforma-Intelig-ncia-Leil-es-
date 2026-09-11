# Leilão OS

Sistema operacional privado de decisão para investimento em leilões imobiliários.
Transforma **muitos imóveis** em **poucos que merecem análise** e **muitas incertezas** em **uma decisão documentada**.

Documentação de produto e arquitetura em [`docs/`](docs/):

| # | Documento |
|---|---|
| 01 | [Product Vision](docs/01-product-vision.md) |
| 02 | [PRD](docs/02-prd.md) |
| 03 | [Jornada da usuária](docs/03-user-journey.md) |
| 04 | [Arquitetura de informação](docs/04-information-architecture.md) |
| 05 | [Modelo de dados](docs/05-data-model.md) |
| 06 | [Arquitetura técnica e motor financeiro](docs/06-technical-architecture.md) |
| 07 | [Wireframes textuais](docs/07-wireframes.md) |
| 08 | [Análise crítica: o que pode causar prejuízo](docs/08-critical-analysis-financial-loss.md) |
| 09 | [Análise crítica: o que não será usado](docs/09-critical-analysis-unused.md) |
| 10 | [MVP](docs/10-mvp.md) |
| 11 | [Backlog priorizado](docs/11-backlog.md) |

## Estado atual (Fase 1)

Jornada implementada: cadastro do imóvel → comparáveis → valuation (mercado ≠ saída por prazo, faixa, confiança, atipicidade) → reforma (faixa por categoria, ponto ótimo) → underwriting → cenários e sensibilidade → lance máximo (4 patamares) → riscos → memorando → decisão registrada → teto aprovado (precommitment). Perfil de investimento e custos configuráveis, RBAC, auditoria e home "o que precisa da minha atenção".

Não implementado ainda (fases 2–5): extração de documentos por IA, comitê com votos, comparador, war room, cotização, ledger, radar automático, integrações, pós-arrematação, previsto × realizado, memória do grupo.

## Rodar localmente (modo local, sem Supabase)

```bash
pnpm install
cp .env.example .env.local           # DATA_BACKEND=local já é o padrão
pnpm seed:local                      # cria um imóvel de demonstração com comparáveis
pnpm dev                             # http://localhost:3000
```

O modo local grava em `.data/local.json`, não tem autenticação e serve para desenvolvimento e demonstração.
Para testar papéis: `LOCAL_USER=local-analista pnpm dev` (também `local-investidora`).

## Rodar com Supabase (produção)

1. Crie um projeto no Supabase e aplique `supabase/migrations/0001_schema.sql` (SQL Editor ou `supabase db push`).
2. Crie a usuária no Auth e rode `supabase/seed.sql` ajustando o e-mail (cria grupo e papel ADMIN).
3. Configure `.env.local` com `DATA_BACKEND=supabase`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. `pnpm dev`. O perfil de investimento padrão é criado na primeira visita.

Segurança: RLS por grupo em todas as tabelas, RBAC por papel nas políticas e nas server actions, auditoria por trigger, ledger append-only, segredos apenas no servidor.

## Testes

```bash
pnpm test        # 61 testes de domínio (dinheiro, TIR, valuation, reforma, underwriting, lance máximo, cenários, análise)
pnpm typecheck
pnpm test:sql    # isolamento RLS/RBAC/auditoria/append-only (requer Postgres com a migração + tests/sql/auth_stub.sql fora do Supabase)
node tests/e2e/smoke.mjs <propertyId>   # fumaça end-to-end contra `pnpm build && pnpm start` em modo local
```

## Estrutura

```
src/domain/      lógica pura (sem React/banco): money, irr, valuation, renovation, underwriting, maxBid, scenarios, analysis, profile
src/data/        Repository + adaptadores local (JSON) e Supabase
src/server/      auth/RBAC, carregador da análise, memorando, server actions
src/app/         rotas (App Router)
src/components/  UI própria (Money, Pct, Epistemic, Card, Stat, Table…)
supabase/        migração SQL e seed
docs/            documentação de produto
tests/           SQL (RLS) e e2e
```

## Princípios que o código impõe

- O lance máximo nasce do **valor de saída** no prazo-alvo, nunca do valor de mercado nem da avaliação do edital.
- Toda estimativa tem **valor, faixa e confiança**; com dados insuficientes ou caso atípico, o teto é bloqueado.
- Nenhum percentual de retorno, taxa ou custo vive no código: tudo é **perfil configurável** (os defaults são hipóteses editáveis).
- **Fato ≠ estimativa ≠ hipótese ≠ ausente**, visível em cada linha.
- Decisões e tetos aprovados são **versões imutáveis** com quem/quando; alterações sensíveis ficam na **auditoria**.
