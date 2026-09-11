# 02 — PRD (Product Requirements Document)

Versão 1.0 · Escopo completo com marcação de fase. A Fase 1 é o MVP (ver `10-mvp.md`).

Convenções:
- **[F1]…[F5]** = fase de entrega.
- **Problema / Usuário / Dados / Cálculos / Riscos** = os cinco itens obrigatórios por funcionalidade.
- Estados epistêmicos usados em toda a interface: `FATO` · `ESTIMATIVA` · `HIPÓTESE` · `AUSENTE`.
- Estados de extração documental: `CONFIRMADO` · `PROVÁVEL` · `INCERTO` · `NÃO LOCALIZADO` · `NECESSITA REVISÃO HUMANA`.

---

## 0. Requisitos transversais

### 0.1 Autenticação e grupos [F1]
- Login por e-mail + senha (Supabase Auth) com MFA opcional (TOTP) [F2].
- Todo dado pertence a um **grupo** (tenant). Usuária pode pertencer a mais de um grupo.
- Convite por e-mail feito por ADMIN do grupo. Sem cadastro aberto.

### 0.2 RBAC [F1]
Papéis por grupo: `ADMIN`, `ANALISTA`, `INVESTIDOR`, `JURIDICO`, `FINANCEIRO`, `VISUALIZACAO`.

| Ação | ADMIN | ANALISTA | INVESTIDOR | JURIDICO | FINANCEIRO | VISUALIZACAO |
|---|---|---|---|---|---|---|
| Ver oportunidades e memorandos | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Cadastrar / editar imóvel | ✔ | ✔ | – | – | – | – |
| Editar comparáveis, valuation, reforma, underwriting | ✔ | ✔ | – | – | – | – |
| Editar análise jurídica / riscos jurídicos | ✔ | ✔ | – | ✔ | – | – |
| Votar no comitê | ✔ | ✔ | ✔ | ✔ | ✔ | – |
| Aprovar teto de lance | ✔ | – | – | – | – | – |
| Lançar aportes/despesas/distribuições | ✔ | – | – | – | ✔ | – |
| Editar perfil de investimento e taxas | ✔ | – | – | – | – | – |
| Gerenciar usuárias | ✔ | – | – | – | – | – |

Regra: **INVESTIDOR não altera underwriting**. Pode comentar e votar.

### 0.3 Auditoria [F1]
Toda alteração em valuation, lance máximo, custos, retorno, aportes, despesas e distribuições registra
`quem · quando · valor anterior · valor novo · motivo (opcional)`. Implementado em banco (trigger), não só na aplicação.

### 0.4 Dinheiro e datas [F1]
- Todo valor monetário carrega `valor (centavos inteiros) · moeda · data de referência · origem`.
- Percentuais armazenados como decimal (0.34 = 34%). Nunca inteiros ambíguos.
- Datas em ISO; prazos em meses com fração permitida no cálculo, exibidos em dias/meses.

### 0.5 Fato × estimativa [F1]
Todo campo relevante para decisão tem um `epistemic_status` e uma `origem` (edital p. X, comparável #Y,
tabela de referência, informado pela usuária). A UI renderiza cada status com tratamento visual próprio.

---

## 1. MÓDULO 01 — Radar / Garimpo [F4, cadastro manual e CSV em F1]

**Problema:** horas perdidas varrendo lotes. **Usuário:** ANALISTA. **Dados:** lotes cadastrados (manual, CSV, API permitida, extensão), perfil de investimento do grupo, valuation preliminar. **Cálculos:** ranking decomponível 0–100. **Riscos:** dados de portais desatualizados; ranking virar caixa-preta; coleta violar termos de uso.

Requisitos:
- R1.1 Cadastro manual de lote com campos mínimos: endereço, cidade, bairro, tipo, área útil, quartos, vagas, tipo de leilão (judicial/extrajudicial), leiloeiro, datas de 1ª/2ª praça, lance mínimo por praça, valor de avaliação do leilão, ocupação (conhecida/desconhecida), link da origem. [F1]
- R1.2 Importação CSV com mapeamento de colunas e relatório de erros por linha. [F1]
- R1.3 Filtros: cidade, bairro, condomínio, tipo, modalidade, valor, desconto sobre avaliação, ROI/ROE/TIR estimados, capital necessário, m², quartos, risco, ocupação, leiloeiro, data do leilão, liquidez, nível de reforma, status. [F4; subconjunto em F1]
- R1.4 Ranking interno 0–100 com faixas: ≥85 FORTE CANDIDATO · 70–84 ANALISAR · 50–69 BAIXA PRIORIDADE · <50 DESCARTAR. Faixas configuráveis por grupo. [F4]
- R1.5 Decomposição obrigatória do ranking: cada fator mostra peso, valor observado, pontos atribuídos e por quê. [F4]
- R1.6 Fatores iniciais: desconto sobre valor de mercado estimado (não sobre avaliação do leilão), ROI preliminar vs perfil, capital vs teto do perfil, liquidez da região/tipologia, ocupação, sinal de atipicidade, proximidade da data, completude de dados (penaliza dado ausente). [F4]
- R1.7 Integrações externas somente após checklist de conformidade (API, termos, robots.txt, LGPD). Sem API, oferecer CSV/bookmarklet/extensão autorizada. [F4]

---

## 2. MÓDULO 02 — Valuation Engine [F1]

**Problema:** "quanto esse imóvel realmente vale?" e "por quanto nós vendemos?". **Usuário:** ANALISTA. **Dados:** comparáveis (manuais/CSV), atributos do imóvel, perfil de liquidez, histórico do grupo (F5). **Cálculos:** ajustes por característica, mediana ponderada por similaridade, dispersão, confiança, valor de saída por prazo. **Riscos:** comparáveis ruins; ancoragem no valor de avaliação; falsa precisão; casos atípicos.

### 2.1 Conceitos separados (obrigatório)
| Conceito | Definição | Uso |
|---|---|---|
| Preço anunciado | O que aparece em portais para imóveis similares | Entrada |
| Valor de avaliação do leilão | O que o edital diz | Exibido como FATO do edital, **nunca usado como valor de mercado** |
| Valor de mercado estimado | Negociação normal, estado atual | Referência |
| Valor conservador | Limite inferior da faixa de mercado | Cenário conservador |
| Valor provável de venda | Mercado × (1 − desconto anúncio→fechamento) | Base do valor de saída |
| Valor de venda rápida | Provável × (1 − desconto de liquidez para prazo curto) | Cenário pessimista |
| Valor otimista | Limite superior da faixa | Cenário otimista |
| Valor pós-reforma | Mercado recalculado com estado de conservação "reformado" no padrão-alvo | Ponto ótimo de reforma |
| **Valor de saída (por prazo)** | Provável pós-reforma × (1 − desconto de liquidez(prazo, classe de liquidez)) | **Base do lance máximo** |

### 2.2 Comparáveis
- R2.1 Cada comparável armazena: fonte, URL, data de captura, distância (m) ou mesma rua/condomínio, tipologia, área útil, quartos, suítes, vagas, andar, vista, idade aprox., padrão, estado de conservação, condomínio (R$/mês), preço anunciado, preço por m², tempo de anúncio (se houver), tipo (anúncio ativo / vendido / histórico do grupo), observações.
- R2.2 Comparável pode ser excluído da análise com motivo; fica registrado (não é apagado).
- R2.3 Exibir mediana, média, faixa, R$/m², dispersão (coeficiente de variação e IQR) e n efetivo.

### 2.3 Metodologia de ajuste (não é média simples)
1. **Similaridade** `s_i ∈ [0,1]` por comparável, a partir de distâncias normalizadas em: localização (mesmo condomínio > mesma rua > mesmo bairro > raio), área (±%), quartos, vagas, andar, idade, padrão, estado. Pesos configuráveis por grupo com defaults documentados.
2. **Ajustes** aplicados ao R$/m² do comparável para "trazê-lo" ao imóvel-alvo: coeficientes por atributo (ex.: vaga adicional ±x%, estado "original" vs "reformado" ±y%, andar alto +z% quando aplicável). Coeficientes são **hipóteses** configuráveis e exibidas.
3. **Desconto anúncio→fechamento** aplicado a comparáveis do tipo "anúncio" (default 6%, substituído pelo histórico do grupo quando houver n ≥ 5 vendas).
4. **Estatística robusta**: mediana ponderada por `s_i` do R$/m² ajustado; faixa = P25–P75 ponderado; valor = R$/m² × área útil.
5. **Confiança 0–100**: função de n efetivo (Σ s_i), dispersão, similaridade média, idade média dos dados, completude de atributos, e penalidade por flags atípicas. Cada fator mostra contribuição (+/−).
6. **Guardrails**: n efetivo < 2,5 ou CV > 25% → `DADOS INSUFICIENTES PARA VALUATION CONFIÁVEL` (mostra estatística, mas bloqueia uso no lance máximo até override justificado do ADMIN). Flags atípicas críticas → `CASO ATÍPICO — NECESSITA VALIDAÇÃO ESPECIALIZADA`.

### 2.4 Casos atípicos
Regras (qualquer uma dispara a flag, com severidade): construção em madeira; imóvel rural; idade > 60 anos sem reforma; área divergente entre matrícula e anúncio > 15%; comercial incomum; padrão raro no micromercado; área muito fora do intervalo dos comparáveis; terreno com construção irregular / sem "habite-se".

### 2.5 Valor de saída e prazo
- R2.4 Investidora informa prazo desejado de venda: 30/60/90/120/180 dias ou personalizado.
- R2.5 Curva de desconto de liquidez por prazo e classe de liquidez (alta/média/baixa), configurável no perfil. Default inicial (hipótese): alta: 180d 1% · 120d 2% · 90d 4% · 60d 7% · 30d 12%; média: 2/4/6/10/16; baixa: 4/7/10/15/22.
- R2.6 Exibir tabela: mercado · provável · saída 180 · saída 120 · saída 90 · saída 60 (com faixa e confiança em cada linha).

---

## 3. MÓDULO 03 — Estimador de Reforma [F1]

**Problema:** prever custo de reforma sem vistoria. **Usuário:** ANALISTA. **Dados:** área, tipo, padrão, idade, estado, nível de intervenção, tabela de referência regional (editável), histórico do grupo (F5). **Cálculos:** custo por categoria × nível × padrão × área, fatores de idade/estado/região, contingência. **Riscos:** patologia oculta; estimativa sem vistoria tratada como fato.

- R3.1 Níveis: `SEM_REFORMA` · `COSMETICA` · `LEVE` · `MEDIA` · `PESADA` · `INTEGRAL`.
- R3.2 Categorias: pintura, elétrica, hidráulica, pisos, revestimentos, cozinha, banheiros, marcenaria, iluminação, gesso, climatização, paisagismo, fachada, telhado, estrutura, limpeza, demolição, caçamba, mão de obra, projeto, contingência.
- R3.3 Cada categoria tem valores de referência (baixo/provável/alto) por nível e padrão; usuária pode sobrescrever qualquer item com "orçamento real" (vira FATO com fonte).
- R3.4 Saída sempre em três números: **baixa · provável · alta**. Nunca um número só.
- R3.5 Contingência default por nível (cosmética 8%, leve 10%, média 15%, pesada 20%, integral 25%) configurável.
- R3.6 Tempo estimado de obra por nível (semanas), entra no prazo do underwriting.
- R3.7 Flags: reforma pesada/integral em imóvel atípico → exige orçamento profissional antes de aprovar.
- R3.8 **Ponto ótimo de reforma**: para cada nível, calcular custo, valor de saída esperado, tempo adicional, lucro, ROI, TIR; destacar o nível com melhor ROI ajustado ao risco e mostrar que "mais reforma" não é necessariamente melhor.

---

## 4. MÓDULO 04 — Document Intelligence [F2]

**Problema:** ler edital, matrícula e processo com método. **Usuário:** ANALISTA, JURIDICO. **Dados:** PDFs, fotos. **Cálculos:** extração estruturada com citação; RAG com referências. **Riscos:** alucinação; OCR ruim; documento incompleto; afirmar segurança jurídica.

- R4.1 Upload de edital, matrícula, processo, laudos, fotos, complementares. Armazenamento privado por grupo.
- R4.2 Pipeline: OCR (quando necessário) → segmentação por página → extração estruturada (LLM com schema) → cada campo com `valor · fonte · página · trecho · estado`.
- R4.3 Campos-alvo: dados do imóvel, datas, valores, credor, devedor, ônus, ocupação, débitos de condomínio, IPTU, forma de pagamento, comissão, responsabilidades do arrematante, prazos, condições, riscos.
- R4.4 Nunca inventar. Campo sem evidência = `NÃO LOCALIZADO`. Campo com evidência ambígua = `INCERTO` ou `NECESSITA REVISÃO HUMANA`.
- R4.5 Toda conclusão jurídica no formato: FATO · FONTE · RISCO · IMPACTO · AÇÃO RECOMENDADA · NÍVEL DE CONFIANÇA, com link para o trecho.
- R4.6 Log de toda análise (modelo, versão do prompt, hash do documento, saída) para auditoria e reprocessamento.
- R4.7 Provider-agnostic (interface única; adaptadores por provedor). Chaves apenas no servidor.

---

## 5. MÓDULO 05 — Risk Engine [F2, riscos manuais em F1]

- R5.1 Categorias: JURÍDICO · FINANCEIRO · MERCADO · OCUPAÇÃO · REFORMA · LIQUIDEZ · DOCUMENTAL.
- R5.2 Cada risco: probabilidade (1–5), impacto (1–5), severidade = função, evidência (link/trecho), mitigação, responsável, status.
- R5.3 Matriz probabilidade × impacto. Risco crítico (severidade ≥ limiar) aparece em destaque em memorando, comparador e war room. **Nunca diluído em média.**
- R5.4 Riscos automáticos sugeridos a partir de valuation (dados insuficientes, atípico), reforma (pesada sem orçamento), documentos (ocupação, ônus), underwriting (capital acima do teto).

---

## 6. MÓDULO 06 — Underwriting Financeiro [F1]

**Problema:** custo econômico real da operação. **Usuário:** ANALISTA; leitura por todas. **Dados:** lance, tabela de custos do perfil, valuation, reforma, prazos. **Cálculos:** ver `06-technical-architecture.md` §Motor financeiro. **Riscos:** custo esquecido; tributação errada; capital parado ignorado.

- R6.1 Linhas de custo configuráveis (default no perfil, override por negócio): comissão do leiloeiro, ITBI, registro, matrícula/certidões, carta de arrematação, custas, advogado, assessoria, tributação, IPTU em atraso, condomínio em atraso, desocupação, acordo, reforma (do módulo 03), engenharia/laudos, documentação, seguros, capital de giro, juros/financiamento, corretagem, marketing, taxas de venda, imposto sobre ganho de capital, custo do capital, meses de carregamento (IPTU + condomínio mensais), contingência, taxa da equipe.
- R6.2 Cada linha: base de cálculo (% do lance, % da venda, % do lucro, fixo, mensal × meses), valor, status epistêmico, origem.
- R6.3 Saídas: capital necessário (pico), custo total, lucro bruto, lucro líquido, ROI, ROE, TIR, margem sobre venda, retorno mensal equivalente, retorno anualizado, capital-meses, lucro por mês de capital imobilizado.
- R6.4 Taxa de gestão/assessoria: `% da arrematação` · `% do lucro` · `valor fixo` · `combinação`. Se % do lucro, resolver a circularidade explicitamente.
- R6.5 ROE = lucro líquido / capital próprio quando houver financiamento; sem financiamento ROE = ROI (exibido com nota).

---

## 7. MÓDULO 07 — Lance Máximo [F1]

- R7.1 Resolver a equação ao contrário: dado retorno exigido, encontrar o lance. Como comissão, ITBI, registro, taxa da equipe e IR dependem do lance, resolver numericamente (bisseção) com tolerância de R$ 1.
- R7.2 Quatro patamares:
  - **IDEAL**: ROI-alvo do perfil sobre valor de saída **conservador**.
  - **CONFORTÁVEL**: ROI-alvo sobre valor de saída **base**.
  - **LIMITE**: ROI mínimo sobre valor de saída **conservador**.
  - **MÁXIMO ABSOLUTO**: ROI mínimo sobre valor de saída **base**. Acima: `NÃO ARREMATAR`.
  - Patamares são ordenados; qualquer inversão entre Confortável e Limite é exibida como aviso.
- R7.3 Restrições adicionais do perfil (lucro mínimo absoluto, TIR mínima, capital máximo) reduzem o teto; o sistema mostra qual restrição está ativa ("teto limitado por: capital máximo").
- R7.4 O teto usa **valor de saída no prazo-alvo**, nunca valor de mercado. Valuation em `DADOS INSUFICIENTES` bloqueia o cálculo (override apenas por ADMIN com justificativa registrada).

---

## 8. MÓDULO 08 — Cenários [F1]

- R8.1 Quatro cenários: PESSIMISTA · CONSERVADOR · BASE · OTIMISTA, com variáveis: valor de venda (tier de valuation), prazo total, reforma (baixa/provável/alta), desocupação (meses e custo), custos (multiplicador), corretagem, tributação.
- R8.2 Tabela comparativa com lucro, ROI, ROE, TIR por cenário; delta em R$ vs base (loss framing).
- R8.3 Matriz de sensibilidade: preço de venda (−15%…+10%) × prazo (−2…+6 meses) → ROI; e preço × reforma → lucro.

---

## 9. MÓDULO 09 — Comparador de Negócios [F2]
- Selecionar N oportunidades; comparar capital, retorno, risco, liquidez, reforma, prazo, lucro, ROI, ROE, TIR, lance máximo, margem de segurança (distância entre lance mínimo e teto).
- Responder "se só temos capital para UM, qual tem melhor risco × retorno?" com explicação decomposta.

## 10. MÓDULO 10 — Investment Committee [F2, memorando em F1]
- Memorando do investimento (F1): imóvel, oportunidade, valuation, reforma, jurídico, financeiro, riscos, cenários, lance máximo; camadas decisão → por quê → evidências.
- Decisão: APROVAR · APROVAR COM CONDIÇÕES · REVISAR · REPROVAR; votos com quem/quando/observação; teto aprovado registrado e imutável (nova aprovação gera nova versão).

## 11. MÓDULO 11 — Cotização [F3]
- Capital necessário → chamada de capital; aportes fixo/percentual/variável; participações; dados para contrato (validação por advogado obrigatória); pendências.

## 12. MÓDULO 12 — War Room [F2]
- Tela limpa: lance atual, próximo lance, teto aprovado, margem restante, ROI atual, ROI no próximo lance; progressão verde/amarelo/laranja/vermelho; ao atingir teto: PARE. Ultrapassar exige justificativa escrita + confirmação de segunda pessoa (configurável), tudo registrado.
- Loss framing: "este lance reduz o lucro esperado em R$ X" + "ROI cai de A% para B%".

## 13. MÓDULO 13 — Pós-arrematação [F5]
- Pipeline ARREMATADO → PAGAMENTO → DOCUMENTAÇÃO → REGISTRO → POSSE → DESOCUPAÇÃO → REFORMA → ANÚNCIO → PROPOSTA → VENDA → ENCERRADO; tarefas, responsáveis, datas, custos, documentos, pendências.

## 14. MÓDULO 14 — Previsto × Realizado [F5]
- Reforma, prazo, venda, custo, ROI: previsto (snapshot da aprovação) vs realizado (ledger). Snapshot da aprovação é imutável.

## 15. MÓDULO 15 — Memória do Grupo [F5]
- Agregações sobre histórico: desvio de reforma por perfil, meses extras de desocupação, desconto anúncio→venda, velocidade por condomínio. Alimentam defaults das estimativas como **sugestão com n e período**, nunca alteram dados históricos.

## 16. Home [F1]
- Lista de atenção: oportunidades fortes, análises aguardando jurídico, leilões próximos, aportes pendentes, reformas acima do orçamento, valuations com dados insuficientes. Sem gráficos decorativos.

## 17. Fontes externas e conformidade [F4]
Checklist obrigatório antes de qualquer integração: API oficial? termos de uso? robots.txt? restrições técnicas? LGPD (dados pessoais de devedores em editais)? direitos sobre dados? Sem "sim" em tudo: CSV, bookmarklet, extensão autorizada ou manual.

## 18. Segurança [F1]
HTTPS; RLS por grupo em todas as tabelas; RBAC; MFA opcional; segredos só no servidor; rate limiting em rotas de IA e upload; audit log; backup diário (Supabase PITR); versionamento de documentos; URLs assinadas e curtas para documentos.

## 19. Testes [F1]
Toda fórmula financeira com testes automatizados: arredondamento, percentuais, datas, TIR, participações, distribuições, lance máximo (inclusive monotonicidade e limites), cenários. Casos de ouro com planilha de referência.

## 20. Não-requisitos
- Sem app nativo. Web responsiva (war room usável em celular).
- Sem multi-moeda no MVP (BRL fixo, mas modelado).
- Sem internacionalização (pt-BR).
