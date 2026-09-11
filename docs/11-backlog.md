# 11 — BACKLOG PRIORIZADO

P0 = sem isso o MVP não existe · P1 = Fase 1/2, alto valor · P2 = Fases 2/3 · P3 = Fases 4/5 ou condicionado a evidência de uso.

## P0
- [x] Documentação de produto (docs/01–11).
- [x] Domínio: dinheiro em centavos, arredondamento, formatação pt-BR.
- [x] Domínio: TIR/XIRR com testes.
- [x] Domínio: valuation (similaridade, ajustes, mediana ponderada, dispersão, confiança, saída por prazo, atipicidade, dados insuficientes) com testes.
- [x] Domínio: estimador de reforma (tabela de referência, níveis, fatores, contingência, três estimativas, ponto ótimo) com testes.
- [x] Domínio: underwriting (linhas de custo configuráveis, taxa da equipe, IR, custo do capital, métricas) com testes.
- [x] Domínio: lance máximo (solver por bisseção, 4 patamares, restrições, restrição ativa) com testes de monotonicidade.
- [x] Domínio: cenários e sensibilidade com testes.
- [x] Schema SQL (Supabase) com RLS, RBAC, auditoria por trigger, ledger append-only.
- [x] App: autenticação (Supabase) + modo local para desenvolvimento.
- [x] App: cadastro do imóvel; perfil de investimento; comparáveis; valuation; reforma; underwriting; cenários; lance máximo; memorando; home.
- [ ] Importação CSV de imóveis e comparáveis com relatório de erros.
- [ ] Registro de decisão e teto aprovado (versão imutável) na UI.
- [ ] Testes e2e (Playwright) do fluxo cadastro → memorando.
- [ ] Teste automatizado de isolamento RLS entre grupos.

## P1
- [ ] Riscos manuais (lista curta) no memorando com critérios de "crítico".
- [ ] Extração de edital por IA com citação (página/trecho) e estados de extração.
- [ ] Extração de matrícula por IA (ônus, proprietários, área, averbações).
- [ ] Registro de decisão com votos e condições; teto aprovado com validade e versão.
- [ ] War room com progressão de cores, PARE, loss framing e fricção para ultrapassar.
- [ ] Comparador simples (2–3 negócios lado a lado com explicação).
- [ ] Digest diário por e-mail ("o que precisa da minha atenção").
- [ ] MFA opcional.

## P2
- [ ] Cotização: chamada de capital, compromissos, participações, pendências, dados para contrato.
- [ ] Ledger imutável: aportes, despesas (quem pagou), receitas, reembolsos, hash encadeado.
- [ ] Distribuição e equalização (maior resto, opção de ponderar por capital-dias), prestação de contas exportável.
- [ ] Financiamento/alavancagem no underwriting (ROE ≠ ROI).
- [ ] Risk engine com sugestões automáticas a partir de valuation/reforma/documentos.
- [ ] Base de comparáveis do grupo reutilizável entre imóveis (mesmo bairro/condomínio).

## P3
- [ ] Radar com ranking decomponível e faixas configuráveis.
- [ ] Checklist de conformidade de fontes; conectores só com API/termos permitidos; bookmarklet.
- [ ] Pipeline pós-arrematação (checklist por etapa, custos reais).
- [ ] Previsto × realizado por dimensão.
- [ ] Memória do grupo: estatísticas com n/período e sugestão de defaults.
- [ ] Aluguel como estratégia de saída.
- [ ] Extensão de navegador autorizada.
