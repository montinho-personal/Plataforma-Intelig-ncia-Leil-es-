# 09 — ANÁLISE CRÍTICA: "O QUE ESTAMOS CONSTRUINDO QUE PROVAVELMENTE NÃO SERÁ USADO?"

Critério: um grupo pequeno, com poucos negócios por mês, que hoje usa Smart Leilões e planilhas. Funcionalidade que não reduz tempo, não evita prejuízo ou não melhora uma decisão específica tende a ficar parada.

| Funcionalidade | Probabilidade de não uso | Por quê | Decisão |
|---|---|---|---|
| Radar com dezenas de filtros | Alta no início | Sem integrações, o radar terá poucos lotes; filtros elaborados sobre 10 itens são inúteis | F1 entrega lista simples + 6 filtros; ranking só na F4, quando houver volume |
| Ranking automático 0–100 | Média | Sem dados suficientes, o score vira ruído e gera desconfiança | F4, depois de comparáveis e histórico existirem |
| Comparador de N negócios | Média | Raramente há 3+ negócios competindo pelo mesmo capital ao mesmo tempo | F2, versão simples (2–3 lado a lado) |
| Matriz de risco completa com responsável/status | Média-alta | Grupo pequeno não fará gestão formal de riscos; usará a lista de "o que pode dar errado" | Riscos como lista curta no memorando (F1); matriz completa só se o comitê pedir |
| Módulo de Documentos com RAG conversacional | Média | O valor está na extração estruturada com citação, não em "conversar com o PDF" | Extração estruturada primeiro (F2); chat sobre documentos só depois de validar utilidade |
| Investment Committee com fluxo formal de votação | Média | Decisão real acontece em conversa; a ferramenta precisa **registrar** a decisão, não substituir a conversa | Memorando + registro de decisão/teto (F1-F2); votação assíncrona minimalista |
| Pipeline pós-arrematação com Gantt | Alta | Vira Trello mal feito | Checklist simples por etapa com datas e custos (F5); sem Gantt |
| Dashboards de mercado (inteligência › mercado) | Alta | Sem dados históricos do grupo, será gráfico bonito e vazio | Só na F5, alimentado pelo histórico |
| Extensão de navegador | Média | Útil, mas manutenção contra mudanças de portais é cara | Bookmarklet/CSV primeiro; extensão só se o CSV virar gargalo |
| Multi-moeda | Certa | Operação 100% BRL | Modelado (campo `currency`), não implementado |
| MFA | Média | Grupo pequeno pode não ativar | Opcional, nunca obrigatório por default |
| Aluguel como saída | Média | Pesquisa aponta flip como estratégia principal | F5 |
| Contrato societário gerado | Alta | Advogado sempre vai redigir | Exportar "dados para contrato", não o contrato |
| Notificações push/e-mail em tempo real | Média | Home "o que precisa da minha atenção" resolve na maioria dos casos | Digest diário por e-mail (F3); sem push |

## O que certamente será usado (proteger a qualidade)
1. Cadastro rápido do imóvel + comparáveis (o trabalho manual que já fazem hoje, só que estruturado).
2. Valuation com faixa e confiança e a tabela de valor de saída por prazo.
3. Estimador de reforma em faixa.
4. Underwriting linha a linha com custos configuráveis.
5. Lance máximo em quatro patamares.
6. Memorando de uma tela.
7. Ledger de aportes/despesas com prestação de contas (F3): a dor de investimento coletivo é real e recorrente.

## Regra de corte
Toda funcionalidade fora da lista acima só entra no backlog com: nome da usuária que pediu, situação concreta em que usaria, e o que deixaria de fazer manualmente.
