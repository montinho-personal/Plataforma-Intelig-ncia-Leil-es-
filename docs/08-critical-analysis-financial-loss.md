# 08 — ANÁLISE CRÍTICA: "O QUE ESTAMOS ESQUECENDO QUE PODERIA CAUSAR PREJUÍZO FINANCEIRO?"

Cada item: risco → como o produto o cobre (ou decisão de cobrir em qual fase).

## Jurídico e documental
1. **Débitos propter rem (condomínio) e IPTU.** Em extrajudicial frequentemente ficam com o arrematante; em judicial depende do edital. → Linha de custo "débitos" com responsabilidade por modalidade e origem no edital; extração F2 marca `NÃO LOCALIZADO` quando o edital silencia (e isso vira risco, não zero).
2. **Ocupação e desocupação.** Imóvel ocupado pode levar 6–18 meses. → Ocupação `DESCONHECIDO` é risco crítico por default; cenários carregam meses de desocupação; histórico do grupo (F5) calibra.
3. **Ônus não baixados, indisponibilidade, penhoras de outros processos, usufruto, hipoteca.** → Matrícula IA (F2) com checklist de ônus; campo "ônus" `NÃO LOCALIZADO` bloqueia aprovação sem reconhecimento explícito.
4. **Anulação do leilão / embargos / recurso do executado.** Capital parado por meses, às vezes devolvido sem correção. → Risco JURÍDICO com probabilidade por modalidade; cenário pessimista inclui "prazo +N meses sem venda".
5. **Direito de preferência do condômino/locatário; bem de família; imóvel arrematado com fração ideal.** → Checklist de edital (F2) e campo "fração/percentual" no imóvel.
6. **Área divergente entre matrícula, IPTU e anúncio.** → Flag atípica automática > 15%; valuation usa área da matrícula quando houver.
7. **Falta de "habite-se" / construção irregular.** → Flag atípica; custo de regularização como linha de custo.
8. **Prazo e forma de pagamento do edital (à vista em 24h, parcelamento com juros).** → `payment_terms` no leilão; capital necessário considera pagamento à vista por default.
9. **Comissão do leiloeiro fora do lance (5%) e custas.** → Sempre linha separada, nunca "dentro" do lance.

## Valuation e mercado
10. **Ancoragem no valor de avaliação do edital.** → Exibido como fato do edital e explicitamente ignorado no valuation.
11. **Preço anunciado ≠ preço fechado.** → Desconto anúncio→fechamento aplicado só a comparáveis LISTING; calibrado pelo histórico.
12. **Comparáveis "sobreviventes" (só os que não vendem ficam no portal).** → Peso menor para `days_on_market` alto; preferência por SOLD e histórico do grupo.
13. **Micromercado (mesma rua/condomínio vale muito mais do que bairro).** → Similaridade de localização com níveis (condomínio > rua > bairro > raio).
14. **Liquidez ≠ preço.** → Valor de saída por prazo transforma liquidez em dinheiro; o teto usa o prazo-alvo.
15. **Sazonalidade e ciclo de juros.** → Só com evidência (F5); não inventar.
16. **Concorrência de estoque (muitos similares anunciados).** → Campo "estoque similar" (contagem) reduz classe de liquidez; F4 automatiza.

## Reforma e engenharia
17. **Patologias ocultas (infiltração, estrutura, elétrica antiga).** → Fator idade/estado eleva faixa alta e contingência; pesada/integral em atípico exige orçamento profissional antes de aprovar.
18. **Reforma como custo, não como criação de valor.** → Ponto ótimo de reforma compara níveis.
19. **Prazo de obra atrasa a venda (carregamento + custo de capital).** → Semanas de obra entram nos meses totais.
20. **Autorizações de condomínio e horários de obra.** → Item de tarefa no pipeline (F5).

## Financeiro e tributário
21. **Imposto sobre ganho de capital.** PF 15% (faixas progressivas acima de R$ 5M), isenções (venda única < R$ 440k em 5 anos, reinvestimento em 180 dias) e PJ com regras próprias. → Linha configurável com nota "validar com contador"; nunca assumir isenção.
22. **ITBI com base no maior entre lance e valor venal de referência (varia por município).** → Base configurável.
23. **Custo do capital / custo de oportunidade ignorado.** → Linha explícita (econômica), com ROI apresentado com e sem ela.
24. **Capital parado por mais tempo do que o previsto.** → TIR, retorno mensal equivalente e capital-meses, não só ROI.
25. **Taxa da equipe não considerada no retorno.** → Linha obrigatória com regra configurável.
26. **Investimento coletivo: aportes em datas diferentes sem ajuste temporal.** → Ledger com data; distribuição pode ponderar por capital-dias (F3, opção do grupo, não default silencioso).
27. **Despesas pagas por uma pessoa e esquecidas.** → Ledger imutável com `paid_by`, reembolso explícito, prestação de contas gerada.
28. **Arredondamento em participações (soma ≠ 100%).** → Método do maior resto; testes.
29. **Distribuição antes de encerrar custos (IR, corretagem).** → Distribuição só com projeto ENCERRADO ou como "parcial" marcada.

## Comportamental
30. **Ultrapassar o teto no calor do leilão.** → Precommitment, war room com PARE, fricção (justificativa + segunda pessoa), loss framing.
31. **Escalation após gastar horas de análise.** → Custo afundado explicitado: "tempo já investido não altera o valor do imóvel".
32. **Excesso de confiança em valuation com 3 comparáveis.** → Confiança numérica, `DADOS INSUFICIENTES` bloqueia teto.

## Operacional e sistema
33. **Editar valuation depois da aprovação e "mudar o passado".** → Versionamento; snapshot imutável na aprovação; audit log.
34. **Erro de fórmula silencioso.** → Testes com casos de ouro validados em planilha; monotonicidade do solver.
35. **Perda de documentos / acesso indevido.** → Bucket privado, URLs assinadas, hash, backup.
36. **Coleta automática que viola termos e gera bloqueio ou passivo.** → Checklist de conformidade; sem contornar proteção.
37. **Dependência de um único provedor de IA.** → Interface provider-agnostic; log de execuções para reprocessar.

## Itens conscientemente adiados (com risco aceito)
- Financiamento/alavancagem (F2): modelado no schema, não no cálculo do MVP.
- Aluguel como estratégia de saída (F5): o MVP foca em flip; modelo de renda (cap rate, vacância) entra depois.
- Seguro de obra e responsabilidade civil: linha fixa opcional; sem cálculo dedicado.
