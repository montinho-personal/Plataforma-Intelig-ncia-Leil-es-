# 10 — DEFINIÇÃO DO MVP (FASE 1)

## Objetivo do MVP
Responder com evidência, para um imóvel cadastrado manualmente, em menos de 30 minutos de trabalho da analista:

1. Este imóvel merece ser analisado?
2. Quanto ele realmente vale?
3. Por quanto conseguimos vendê-lo após a reforma, no prazo que queremos?
4. Quanto vamos gastar?
5. Quanto podemos pagar (quatro patamares)?
6. Devemos arrematar? (memorando de uma tela)

E impedir que o grupo gaste horas de jurídico em imóveis que não passam da triagem econômica.

## Escopo (Fase 1)

| # | Funcionalidade | Problema | Usuária | Dados | Cálculos | Riscos |
|---|---|---|---|---|---|---|
| 1 | Autenticação + grupos + papéis | Sistema privado | Todas | users, groups, group_members | – | Acesso indevido → RLS + RBAC |
| 2 | Cadastro do imóvel (manual + CSV) | Estruturar o que hoje é planilha | ANALISTA | properties, auctions | Desconto sobre mercado, flags atípicas | Dado ausente tratado como zero → status AUSENTE |
| 3 | Perfil de investimento | Critérios diferem por pessoa/modalidade | ADMIN | investment_profiles | – | Hardcode → tudo configurável |
| 4 | Comparáveis (manual + CSV, exclusão com motivo) | Precificação manual sem método | ANALISTA | market_comparables | Similaridade, ajustes, estatística robusta | Comparável ruim → similaridade baixa, exclusão registrada |
| 5 | Valuation (mercado, provável, saída por prazo, confiança) | "Quanto vale?" e "por quanto vendemos?" | ANALISTA | valuations | Ver arquitetura §4.8 | Falsa precisão → faixa + confiança + bloqueios |
| 6 | Reforma (faixa por categoria, ponto ótimo) | Prever custo sem vistoria | ANALISTA | renovation_estimates/items | Tabela × fatores × contingência | Patologia oculta → faixa alta + orçamento profissional |
| 7 | Underwriting | Custo econômico real | ANALISTA | underwritings | §4.1–4.6 | Custo esquecido → checklist completo configurável |
| 8 | Cenários + sensibilidade | Ver o que dá errado | ANALISTA/INVESTIDOR | underwriting_scenarios | §8 do PRD | Cenário otimista virar base → base = provável |
| 9 | Lance máximo (4 patamares) | "Quanto podemos pagar?" | ANALISTA → ADMIN | max_bid_calculations | Solver §4.7 | Usar valor de mercado → usa valor de saída |
| 10 | Memorando + registro de decisão e teto | Decisão documentada antes do leilão | Todas | investment_decisions, bid_approvals | – | Alterar depois → snapshot imutável |
| + | Home "atenção" · Auditoria · Riscos manuais (lista curta) · Configurações | | | | | |

## Fora do MVP (explícito)
Extração de documentos por IA, risk engine automático, comparador, comitê com votação, cotização, ledger, war room, radar automático, integrações, pós-arrematação, previsto × realizado, memória do grupo.

## Critérios de aceite do MVP
- [ ] Todo cálculo financeiro coberto por testes unitários com casos de ouro (ver `tests/`).
- [ ] Um imóvel completo (cadastro → memorando) em menos de 30 minutos por uma analista sem treinamento.
- [ ] Memorando compreensível em 60 segundos (teste com 3 usuárias).
- [ ] Valuation com < 3 comparáveis válidos exibe `DADOS INSUFICIENTES` e bloqueia o teto.
- [ ] Imóvel com flag atípica crítica exibe `CASO ATÍPICO` no cabeçalho e no memorando.
- [ ] Nenhum percentual de retorno, taxa ou custo hardcoded no código de domínio: tudo vem do perfil (os defaults do seed são hipóteses editáveis).
- [ ] Alterações em valuation, teto, custos registradas em `audit_logs` com antes/depois.
- [ ] RLS ativa em todas as tabelas; teste automatizado de que usuária de outro grupo não lê dados.
