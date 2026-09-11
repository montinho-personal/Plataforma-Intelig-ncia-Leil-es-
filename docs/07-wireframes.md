# 07 — WIREFRAMES TEXTUAIS DAS PRINCIPAIS TELAS

Convenções: `[ ]` botão · `( )` chip/estado · `▸` expansível · `■` FATO · `≈` ESTIMATIVA · `?` HIPÓTESE · `—` AUSENTE.
Estética: fundo escuro neutro, tipografia monoespaçada para números, cores só para semântica (verde/âmbar/laranja/vermelho), densidade alta, zero decoração.

---

## W1 — Home: "O que precisa da minha atenção?"

```
┌────────────────────────────────────────────────────────────────────────────┐
│ LEILÃO OS   Grupo: Investidoras SP        ▾           Ana (ANALISTA)  [⚙] │
├──────────────┬─────────────────────────────────────────────────────────────┤
│ VISÃO GERAL  │  HOJE, 11 SET 2026                                          │
│ OPORTUNIDADES│                                                             │
│  Radar       │  ● 3 oportunidades fortes aguardando triagem     [ver]      │
│  Favoritos   │  ● 2 análises aguardando jurídico                [ver]      │
│  Em análise  │  ● 1 leilão em 5 dias — #184 Rua X, teto R$ 702.000 [war]  │
│  Comparador  │  ● 2 aportes pendentes — Projeto #171            [ver]      │
│ NEGÓCIOS     │  ● 1 reforma 18% acima do orçamento — #163       [ver]      │
│ INTELIGÊNCIA │  ● 4 valuations com DADOS INSUFICIENTES          [ver]      │
│ FINANCEIRO   │                                                             │
│ DOCUMENTOS   │  FUNIL DO MÊS   cadastrados 48 → triados 19 → analisados 7  │
│ CONFIG       │                 → aprovados 2 → arrematados 1               │
└──────────────┴─────────────────────────────────────────────────────────────┘
```

## W2 — Radar (lista)

```
 RADAR                                     [+ Cadastrar] [Importar CSV] [Filtros ▾]
 cidade: SP ▾  tipo: apto ▾  modalidade: todas ▾  status: radar ▾  ordenar: score ▾
┌────┬──────────────────────────┬─────────┬──────────┬───────────┬────────┬──────────┬─────────┐
│ #  │ Imóvel                   │ Leilão  │ 2ª praça │ Mercado ≈ │ Desc.  │ ROI prel │ Score   │
├────┼──────────────────────────┼─────────┼──────────┼───────────┼────────┼──────────┼─────────┤
│184 │ Apto 98m² · Perdizes     │ Extraj. │ 620.000  │ 1,25M ≈78%│ −50%   │ 27% ≈    │ 94 ●    │
│187 │ Casa 210m² · Butantã     │ Judic.  │ 810.000  │ — insuf.  │ —      │ —        │ 63 ○    │
│190 │ Casa madeira · Cotia     │ Judic.  │ 140.000  │ ATÍPICO   │ —      │ —        │ ⚠ valid.│
└────┴──────────────────────────┴─────────┴──────────┴───────────┴────────┴──────────┴─────────┘
 ▸ Score 94: desconto s/ mercado +32 · ROI vs perfil +28 · capital ok +15 · liquidez alta +12 · ocupação desconhecida −5 · dados 92% +12
```

## W3 — Oportunidade: cabeçalho fixo + aba Resumo (camada DECISÃO)

```
 #184 · Apto 98 m² · Rua X, 120 · Perdizes · SP              (EM ANÁLISE)  [Favoritar] [Memorando]
 Leilão extrajudicial · 2ª praça 16/09 · lance mín. R$ 620.000 ■ edital p.2 · avaliação do leilão R$ 1.100.000 ■ (não é valor de mercado)
 ─────────────────────────────────────────────────────────────────────────────────────────────
 [Resumo] [Imóvel] [Comparáveis 9] [Valuation ✔] [Reforma ✔] [Underwriting ✔] [Cenários ✔] [Lance máx ✔] [Riscos 2!] [Memorando]

 VALOR DE SAÍDA (90 d)      CUSTO TOTAL PROJETADO     LUCRO LÍQUIDO PROVÁVEL      ROI        TIR
 R$ 1.220.000 ≈             R$ 893.000 ≈              R$ 247.000 ≈                27,7%      41% a.a.
 faixa 1,17M–1,27M · conf. 82%                         faixa 198k–301k

 REFORMA (média)            RISCO                     LANCE IDEAL      LANCE MÁXIMO ABSOLUTO
 R$ 92k – 118k ≈            MÉDIO · 1 crítico!        R$ 654.000       R$ 702.000  ← acima: NÃO ARREMATAR

 ▸ POR QUÊ (6 fatores)     ▸ EVIDÊNCIAS
```

## W4 — Aba Comparáveis

```
 COMPARÁVEIS (9 · 7 incluídos · n efetivo 5,8)                  [+ Adicionar] [Importar CSV] [Reprocessar valuation]
 mediana pond. R$ 12.480/m² · média R$ 12.910/m² · faixa P25–P75 11.900–13.200 · CV 9,4% · dados: 11 dias em média
┌───┬──────────────────────────┬──────┬────┬────┬────────┬────────────┬──────────┬───────┬──────┬────────┐
│ ✓ │ Endereço / fonte         │ m²   │ Q  │ V  │ Estado │ Preço      │ R$/m²    │ Ajust.│ Sim. │ Dist.  │
├───┼──────────────────────────┼──────┼────┼────┼────────┼────────────┼──────────┼───────┼──────┼────────┤
│ ✓ │ Mesmo condomínio · ZAP   │ 96   │ 3  │ 2  │ Bom    │ 1.290.000  │ 13.437   │ −6%   │ 0,94 │ 0 m    │
│ ✓ │ Rua Y, 80 · VivaReal     │ 104  │ 3  │ 2  │ Reform.│ 1.450.000  │ 13.942   │ −12%  │ 0,71 │ 220 m  │
│ ✗ │ Rua Z, 5 · OLX  (excl.)  │ 150  │ 4  │ 3  │ Bom    │ 2.100.000  │ 14.000   │  —    │ 0,31 │ 900 m  │ motivo: área muito diferente
└───┴──────────────────────────┴──────┴────┴────┴────────┴────────────┴──────────┴───────┴──────┴────────┘
 ▸ ajustes aplicados (hipóteses ?): estado reformado→bom −6% · vaga extra −3% · anúncio→fechamento −6% · andar alto +2%
```

## W5 — Aba Valuation

```
 VALUATION v3 · método comparativo ajustado · confiança 82%            [Salvar versão] [Ver v2]
 ┌────────────────────────────┬──────────────┬─────────────────────────┐
 │ Preço anunciado (mediana)  │ R$ 1.330.000 │ referência ■            │
 │ Avaliação do leilão        │ R$ 1.100.000 │ edital p.2 ■ (ignorado) │
 │ Valor de mercado           │ R$ 1.250.000 │ 1,19M – 1,31M ≈         │
 │ Conservador                │ R$ 1.190.000 │                         │
 │ Provável de venda          │ R$ 1.175.000 │ −6% anúncio→fechamento ?│
 │ Venda rápida (30 d)        │ R$ 1.034.000 │                         │
 │ Otimista                   │ R$ 1.310.000 │                         │
 ├────────────────────────────┼──────────────┼─────────────────────────┤
 │ Pós-reforma (média)        │ R$ 1.350.000 │ estado→reformado +8% ?  │
 │ SAÍDA 180 d                │ R$ 1.270.000 │ liquidez média −2%      │
 │ SAÍDA 120 d                │ R$ 1.245.000 │ −4%                     │
 │ SAÍDA  90 d  ◀ prazo-alvo  │ R$ 1.220.000 │ −6%  · usado no teto    │
 │ SAÍDA  60 d                │ R$ 1.170.000 │ −10%                    │
 └────────────────────────────┴──────────────┴─────────────────────────┘
 CONFIANÇA 82%  ▸ +18 n efetivo 5,8 · +12 dispersão 9% · +9 similaridade 0,78 · +5 dados recentes · −7 sem andar/vista · 0 atípico
 Prazo-alvo: (30) (60) (90●) (120) (180) (custom)
```

## W6 — Aba Reforma

```
 REFORMA · nível: (Sem) (Cosmética) (Leve) (Média●) (Pesada) (Integral)   padrão-alvo: Médio-alto ▾   [Orçamento real]
                     BAIXA        PROVÁVEL      ALTA
 TOTAL                R$ 82.000    R$ 104.000    R$ 137.000       prazo 6–9 semanas       contingência 15% ?
┌──────────────┬──────────┬──────────┬──────────┬────────────────────────┐
│ Categoria    │ Baixa    │ Provável │ Alta     │ Base                   │
├──────────────┼──────────┼──────────┼──────────┼────────────────────────┤
│ Pintura      │ 7.800    │ 9.800    │ 12.700   │ tabela ref. 98 m² ?    │
│ Pisos        │ 14.700   │ 19.600   │ 26.400   │ tabela ref. ?          │
│ Cozinha      │ 18.000   │ 22.000   │ 28.000   │ orçamento Marcenaria X ■│
│ …            │          │          │          │                        │
└──────────────┴──────────┴──────────┴──────────┴────────────────────────┘
 PONTO ÓTIMO DE REFORMA
 ┌───────────┬─────────┬───────────┬────────┬──────────┬──────┬──────┐
 │ Nível     │ Custo   │ Saída 90d │ +tempo │ Lucro    │ ROI  │ TIR  │
 │ Sem       │ 0       │ 1,05M     │ 0      │ 121k     │ 19%  │ 31%  │
 │ Leve      │ 70k     │ 1,22M     │ +1 m   │ 185k     │ 27%● │ 38%  │
 │ Pesada    │ 160k    │ 1,34M     │ +3 m   │ 190k     │ 24%  │ 29%  │
 └───────────┴─────────┴───────────┴────────┴──────────┴──────┴──────┘
 → "Mais reforma não é necessariamente melhor: LEVE tem o melhor ROI ajustado ao prazo."
```

## W7 — Aba Underwriting

```
 UNDERWRITING v2 · lance de referência R$ 654.000 · saída 90 d R$ 1.220.000 · 8 meses     perfil: Padrão ▾
 ┌───────────────────────────────┬─────────────┬───────────────────────┐
 │ Lance                         │ 654.000     │ referência             │
 │ Comissão leiloeiro 5%         │ 32.700      │ edital p.4 ■           │
 │ ITBI 3%                       │ 19.620      │ perfil ?               │
 │ Registro + carta              │ 10.400      │ perfil ?               │
 │ Advogado                      │ 8.000       │ perfil ?               │
 │ Débitos condomínio/IPTU       │ 14.300      │ edital p.5 ■           │
 │ Desocupação (2 m)             │ 9.000       │ hipótese ?             │
 │ Reforma (provável)            │ 104.000     │ estimador ≈            │
 │ Carregamento 8 m × 1.450      │ 11.600      │ condomínio+IPTU ■      │
 │ Contingência 5%               │ 10.500      │ perfil ?               │
 │ = CAPITAL NECESSÁRIO          │ 874.120     │                        │
 │ Corretagem 6% s/ venda        │ 73.200      │ perfil ?               │
 │ IR ganho de capital 15%       │ 55.700      │ regra PF ? validar     │
 │ Taxa da equipe 10% s/ lance   │ 65.400      │ perfil ?               │
 │ Custo do capital 12% a.a.     │ 68.100      │ perfil ? (econômico)   │
 │ = CUSTO TOTAL                 │ 1.136.520   │                        │
 ├───────────────────────────────┼─────────────┼───────────────────────┤
 │ LUCRO LÍQUIDO                 │ 247.000     │ ROI 27,7% · ROE 27,7% │
 │ TIR                           │ 41% a.a.    │ margem 20% · 3,1%/mês │
 │ capital-meses 6.993k · lucro/mês de capital R$ 30.900                │
 └───────────────────────────────┴─────────────┴───────────────────────┘
```

## W8 — Aba Lance Máximo

```
 LANCE MÁXIMO · base: VALOR DE SAÍDA 90 d (nunca valor de mercado) · perfil: ROI alvo 34% · ROI mín. 27%
      IDEAL            CONFORTÁVEL          LIMITE            MÁXIMO ABSOLUTO
   R$ 654.000          R$ 702.000         R$ 727.000          R$ 738.500
   ROI alvo · saída    ROI alvo · saída   ROI mín. · saída    ROI mín. · saída base
   conservadora        base               conservadora        ▲ acima: NÃO ARREMATAR
 Restrição ativa: ROI mínimo (capital máximo R$ 1,2M não limita · lucro mínimo R$ 150k não limita)
 Lance mínimo da 2ª praça R$ 620.000 → margem de segurança até o teto: R$ 118.500 (19%)
 [Solicitar aprovação do teto]  (só ADMIN aprova · registra quem/quando · versão imutável)
```

## W9 — Aba Cenários

```
 CENÁRIOS                       PESSIMISTA    CONSERVADOR    BASE        OTIMISTA
 Valor de venda                 1.034.000     1.170.000      1.220.000   1.290.000
 Prazo total (meses)            14            10             8           6
 Reforma                        137.000       118.000        104.000     92.000
 Desocupação (meses)            6             3              2           0
 Lucro líquido                  −12.000       121.000        247.000     331.000
 Δ vs base                      −259.000      −126.000       —           +84.000
 ROI                            −1,3%         13,4%          27,7%       38,0%
 TIR                            −1%           14%            41%         79%
 SENSIBILIDADE ROI · preço × prazo
            6m     8m     10m    12m    14m
 −15%       9%     8%     6%     5%     3%
 −10%      15%    14%    12%    10%     8%
  −5%      21%    20%    18%    16%    14%
   0%      29%    28%    25%    23%    21%
  +5%      35%    34%    31%    29%    27%
```

## W10 — Memorando (camadas 1 → 2 → 3)

```
 MEMORANDO DO INVESTIMENTO · OPORTUNIDADE #184 · v2 · 11/09/2026
 ──────────────────────────── DECISÃO ────────────────────────────
 VALOR DE SAÍDA PROVÁVEL (90 d)   R$ 1.220.000   conf. 82%
 CUSTO TOTAL PROJETADO            R$ 893.000
 REFORMA                          R$ 92.000 – 118.000
 LUCRO LÍQUIDO PROVÁVEL           R$ 247.000
 ROI 27,7% · TIR 41% a.a. · RISCO MÉDIO (1 crítico: ocupação desconhecida)
 LANCE IDEAL R$ 654.000 · LANCE MÁXIMO R$ 702.000
 RECOMENDAÇÃO DO SISTEMA: APROVAR COM CONDIÇÕES
   • confirmar ocupação   • validar matrícula   • orçamento de reforma   • confirmar comparáveis
 ──────────────────────────── POR QUÊ ─────────────────────────────
 ▸ 7 comparáveis com similaridade média 0,78; desconto de 50% sobre mercado; liquidez média…
 ─────────────────────────── EVIDÊNCIAS ───────────────────────────
 ▸ comparáveis · ▸ reforma por categoria · ▸ underwriting linha a linha · ▸ riscos · ▸ documentos
 [Votar: Aprovar] [Aprovar c/ condições] [Revisar] [Reprovar]     votos: Ana ✔ · Beatriz ✔ · Carla ⏳
```

## W11 — War Room (F2)

```
                    #184 · 2ª PRAÇA · AO VIVO
   LANCE ATUAL              PRÓXIMO LANCE            TETO APROVADO
   R$ 680.000               R$ 685.000               R$ 702.000
   ROI 26,1%                ROI 25,7%                margem restante R$ 17.000
   ████████████████████░░░░  ÂMBAR
   "Este lance reduz seu lucro esperado em R$ 5.100 · ROI de 26,1% → 25,7%"
                            [ CONFIRMAR LANCE R$ 685.000 ]
   ─────────────────────────────────────────────────────────
   ao atingir R$ 702.000:  ■ PARE ■  (para ultrapassar: justificativa + 2ª pessoa + registro)
```

## W12 — Configurações › Perfil de investimento

```
 PERFIL "Padrão do grupo"      afeta: triagem · lance máximo · cenários
 ROI mínimo [27 %]   ROI alvo [34 %]   TIR mínima [30 % a.a.]   Lucro mínimo [R$ 150.000]
 Capital máximo por negócio [R$ 1.200.000]   Prazo máximo [12 meses]   Prazo de saída padrão [90 d]
 Modalidades aceitas (Judicial ✔)(Extrajudicial ✔)   Tipos (Apto ✔)(Casa ✔)(Comercial ✗)(Rural ✗)
 Desconto anúncio→fechamento [6 %] ? (sugerido pelo histórico: 6,7% · n=12)
 Curva de liquidez  alta: 180d 1% · 120d 2% · 90d 4% · 60d 7% · 30d 12%   média: … baixa: …
 Taxa da equipe: (% arrematação [10 %]) (% lucro) (fixo) (combinado)
 Custos padrão: comissão 5% · ITBI 3% · registro 1,25% · advogado R$ 8.000 · corretagem 6% · IR 15% · custo do capital 12% a.a. · contingência 5%
```
