# 01 — PRODUCT VISION

> Plataforma privada de inteligência para investimento em leilões imobiliários.
> Nome de trabalho: **Leilão OS** (sistema operacional de decisão). O nome final é decisão do grupo.

## 1. A frase que define o produto

**Transformar muitos imóveis em poucos que merecem análise, e muitas incertezas em uma decisão documentada.**

Não somos um portal de leilões, um agregador, uma calculadora nem um clone do Smart Leilões.
Somos o **sistema operacional privado de decisão** de um grupo de investidoras que já opera no mercado
e precisa decidir, com evidência e sem viés, **onde colocar o próprio dinheiro e até quanto pagar**.

## 2. O problema real (síntese da pesquisa com as usuárias)

| Dor | O que acontece hoje | Custo real |
|---|---|---|
| Garimpo | Horas varrendo centenas de lotes em portais | Tempo desperdiçado; boas oportunidades passam despercebidas |
| Precificação | Comparação manual em portais imobiliários, planilha e intuição | Erro de valuation vira erro de lance; winner's curse |
| Reforma | Estimativa por "feeling" | Estouro médio de orçamento; ROI real abaixo do previsto |
| Imóveis atípicos | Tratados como se fossem padrão | Falsa precisão em casos que exigiam especialista |
| Jurídico | Leitura de edital e matrícula sem método | Ônus, ocupação e débitos descobertos tarde demais |
| Retorno mínimo | Critérios diferentes por pessoa e por tipo de leilão | Sem regra explícita, o leilão decide pela investidora |
| Investimento coletivo | Aportes desiguais, em datas diferentes, despesas pagas por pessoas diferentes | Prestação de contas frágil; atrito no grupo |
| Custo da equipe | Faixa histórica de 8% a 15% da arrematação, informal | Não entra no cálculo de retorno; surpresas no fechamento |

## 3. Para quem

**Usuárias primárias:** pequeno grupo de mulheres investidoras em imóveis de leilão no Brasil, que já usam
Smart Leilões e portais, investem de forma coletiva e trabalham com metas de rentabilidade explícitas.

**Papéis dentro do grupo:** quem garimpa e analisa, quem aporta capital, quem cuida do jurídico,
quem cuida do financeiro, quem apenas acompanha. Uma pessoa pode acumular papéis.

## 4. O que o produto responde, nesta ordem

1. **Este imóvel merece ser analisado?** (triagem econômica antes de qualquer esforço jurídico)
2. **Quanto ele realmente vale?** (valor de mercado, com faixa e confiança)
3. **Por quanto NÓS conseguimos vendê-lo, no estado em que vamos entregar, no prazo que queremos?** (valor de saída)
4. **Quanto vamos gastar?** (reforma em faixa, custos completos da operação)
5. **Qual é o risco?** (matriz explícita, sem esconder risco grave numa média)
6. **Quanto podemos pagar?** (lance máximo resolvido de trás para frente)
7. **Devemos arrematar?** (memorando e decisão registrada, antes do leilão)

## 5. Princípios inegociáveis

1. **Valor de mercado ≠ valor de saída.** O lance máximo nasce do valor de saída do investidor, nunca do valor de mercado nem do valor de avaliação do leilão.
2. **Sem falsa precisão.** Toda estimativa tem valor, faixa e confiança. Quando os dados não sustentam, o sistema diz "DADOS INSUFICIENTES" ou "CASO ATÍPICO".
3. **Fato ≠ estimativa ≠ hipótese ≠ dado ausente.** Visualmente distintos em toda a interface.
4. **Precommitment.** O teto de lance é definido, aprovado e registrado antes do leilão. Ultrapassar exige justificativa explícita.
5. **Nada de caixa-preta.** Todo score, ranking ou recomendação mostra os fatores que o geraram.
6. **IA como copiloto.** Cita fonte, página e trecho. Nunca inventa dado ausente. Pede validação humana em casos sensíveis.
7. **Histórico financeiro imutável.** Ledger append-only. Correções são novos lançamentos, nunca edições silenciosas.
8. **Progressive disclosure.** Primeira camada: decisão. Segunda: por quê. Terceira: evidências.
9. **Configurável, não hardcoded.** ROI mínimo, taxa da equipe, custos, descontos de liquidez: tudo é perfil, nunca constante.
10. **Coleta de dados responsável.** Sem contornar proteções de terceiros. API oficial, CSV, bookmarklet ou inserção manual.

## 6. Como medimos sucesso

| Métrica | Meta inicial (6 meses) |
|---|---|
| Tempo para responder "merece análise?" para um imóvel novo | < 10 minutos (hoje: horas) |
| Tempo para compreender um memorando (decisão + por quê + teto) | < 60 segundos |
| Lances acima do teto aprovado | 0 sem justificativa registrada |
| Desvio médio reforma prevista × realizada | Medido desde o 1º negócio; meta de reduzir a cada ciclo |
| Desvio médio preço de venda previsto × realizado | Idem |
| Negócios com prestação de contas gerada pelo ledger | 100% |
| Imóveis analisados juridicamente que nunca deveriam ter passado da triagem econômica | Tendendo a zero |

## 7. O que NÃO vamos construir (agora ou nunca)

- Portal público, marketplace ou qualquer coisa voltada a quem não é do grupo.
- Scraping que contorne proteção de terceiros.
- Score único "mágico" sem decomposição.
- Assinatura de contrato societário automatizada sem revisão de advogado.
- Recomendações jurídicas conclusivas ("está seguro"). O sistema aponta fato, fonte, risco, impacto, ação e confiança.
- Gráficos decorativos na home. A home responde "o que precisa da minha atenção?".

## 8. Vantagem competitiva acumulável

Com o tempo, o **histórico do próprio grupo** alimenta as estimativas: desvio real de reforma por perfil,
meses reais de desocupação, desconto real entre anúncio e venda, velocidade de venda por condomínio.
Nenhum portal tem esse dado. Ele só existe porque o grupo registra previsto × realizado no mesmo sistema
em que decidiu.
