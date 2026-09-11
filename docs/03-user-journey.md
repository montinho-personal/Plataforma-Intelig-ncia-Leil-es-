# 03 — MAPA DA JORNADA DA USUÁRIA

Personas de trabalho (nomes fictícios): **Ana** (garimpo e análise, ANALISTA), **Beatriz** (aporta capital, INVESTIDOR),
**Carla** (jurídico, JURIDICO), **Dani** (financeiro/prestação de contas, FINANCEIRO). Uma pessoa pode acumular papéis.

Cada etapa: **quem · entrada · o que o sistema faz · saída · pergunta respondida · vieses combatidos · fase**.

| # | Etapa | Quem | Entrada | Sistema | Saída | Pergunta | Viés combatido | Fase |
|---|---|---|---|---|---|---|---|---|
| 1 | GARIMPAR | Ana | Portais, CSV, cadastro manual | Radar, filtros pelo perfil, ranking decomposto | Shortlist | Quais merecem olhar? | Sobrecarga, FOMO | F1 manual · F4 auto |
| 2 | TRIAR | Ana | Lote + perfil | Triagem econômica rápida: valuation preliminar (poucos comparáveis), capital estimado vs teto, ROI preliminar | "Merece análise" / "Descartar" com motivo | Merece ser analisado? | Ancoragem no valor de avaliação | F1 |
| 3 | PRECIFICAR | Ana | Comparáveis | Similaridade, ajustes, mediana ponderada, faixa, confiança, atipicidade | Valor de mercado · provável · saída por prazo | Quanto vale? Por quanto vendemos? | Falsa precisão, ancoragem | F1 |
| 4 | ANALISAR | Ana | Fotos, descrição, edital (dados) | Ficha com FATO/ESTIMATIVA/HIPÓTESE/AUSENTE | Ficha completa, lacunas explícitas | O que sabemos e o que não sabemos? | Excesso de confiança | F1 |
| 5 | ESTIMAR REFORMA | Ana | Nível, padrão, estado, área | Estimativa em faixa por categoria; ponto ótimo | Baixa/provável/alta + nível recomendado | Quanto gastar e vale a pena? | Otimismo de planejamento | F1 |
| 6 | ANALISAR DOCUMENTOS | Carla | Edital, matrícula, processo | Extração com citação; conclusões FATO/FONTE/RISCO/IMPACTO/AÇÃO/CONFIANÇA | Lista de achados com trechos | O que pode dar errado juridicamente? | Ilusão de segurança | F2 |
| 7 | CALCULAR RISCO | Ana, Carla | Achados, valuation, reforma | Matriz prob × impacto; risco crítico em destaque | Registro de riscos | Qual é o risco? | Diluição em média | F1 manual · F2 motor |
| 8 | CALCULAR RETORNO | Ana | Lance de referência, custos do perfil | Underwriting completo | Capital, custo total, lucro, ROI, ROE, TIR | Quanto ganhamos? | Custos esquecidos | F1 |
| 9 | COMPARAR | Ana, Beatriz | 2–5 oportunidades | Comparador risco × retorno | Recomendação explicada | Se só um, qual? | Efeito comparação / atratividade relativa | F2 |
| 10 | DECIDIR | Todas | Memorando | Comitê, votos, condições | APROVAR / COM CONDIÇÕES / REVISAR / REPROVAR | Devemos arrematar? | Pressão social, escalation | F1 memo · F2 comitê |
| 11 | DEFINIR LANCE MÁXIMO | Ana → ADMIN | Retorno exigido, valor de saída | Resolve ao contrário; 4 patamares; restrição ativa | Teto aprovado (imutável, versionado) | Quanto podemos pagar? | Winner's curse, ancoragem | F1 |
| 12 | APROVAR INVESTIMENTO | ADMIN | Memorando + teto | Registro de quem/quando/condições | Snapshot da aprovação | Está aprovado com o quê? | Escalation of commitment | F2 |
| 13 | COTIZAR | Beatriz, Dani | Capital necessário | Chamada de capital, participações, pendências | Cotas e dados para contrato | Quem entra com quanto? | Conflito de expectativas | F3 |
| 14 | ARREMATAR | Ana (no leilão) | Lance atual | War room: verde→vermelho, PARE, loss framing, fricção para ultrapassar | Lance dado e registrado | Continuo ou paro? | FOMO, competição, aversão à perda | F2 |
| 15 | ACOMPANHAR EXECUÇÃO | Ana, Dani | Pipeline pós-arrematação | Tarefas, prazos, custos reais no ledger | Status e alertas | O que está atrasado/estourando? | Negligência de acompanhamento | F5 (ledger F3) |
| 16 | VENDER / ALUGAR | Ana | Anúncio, propostas | Registro de propostas vs valor de saída previsto | Venda registrada | Aceitamos esta proposta? | Ancoragem no valor anunciado | F5 |
| 17 | PREVISTO × REALIZADO | Dani | Snapshot da aprovação + ledger | Desvios por dimensão | Relatório de desvio | Onde erramos? | Viés retrospectivo | F5 |
| 18 | APRENDER | Todas | Histórico do grupo | Estatísticas com n e período; sugestões de default | Defaults calibrados | O que muda na próxima? | Amnésia organizacional | F5 |

## Momentos críticos de decisão (onde o sistema precisa de fricção)

1. **Passar da triagem para a análise completa.** Custa horas. O sistema deve tornar o "descartar" fácil e documentado.
2. **Aprovar o teto de lance.** Só ADMIN, com memorando completo, valuation com confiança mínima e riscos críticos reconhecidos um a um.
3. **Ultrapassar o teto no leilão.** Justificativa escrita, segunda pessoa (configurável), registro imutável, loss framing antes de confirmar.
4. **Registrar despesa fora do orçamento.** Sempre permitido (o ledger nunca bloqueia realidade), mas gera alerta de desvio.

## Regra de fluxo econômico antes de jurídico

Um lote só entra na fila jurídica (etapa 6) depois de passar pela triagem (2), precificação (3) e reforma (5) com
resultado "merece análise". O sistema mostra o custo evitado: "N lotes descartados antes de consumir tempo jurídico".
