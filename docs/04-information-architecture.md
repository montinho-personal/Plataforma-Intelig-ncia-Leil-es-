# 04 — ARQUITETURA DE INFORMAÇÃO

## Navegação principal (sidebar)

```
VISÃO GERAL                    /                          [F1]

OPORTUNIDADES
  Radar                        /oportunidades              [F1 lista · F4 ranking]
  Favoritos                    /oportunidades?f=favoritos  [F1]
  Em análise                   /oportunidades?f=analise    [F1]
  Comparador                   /comparador                 [F2]

NEGÓCIOS
  Aprovados                    /negocios/aprovados         [F2]
  Leilões (war room)           /negocios/leiloes           [F2]
  Arrematados                  /negocios/arrematados       [F3]
  Em execução                  /negocios/execucao          [F5]
  Encerrados                   /negocios/encerrados        [F5]

INTELIGÊNCIA
  Mercado                      /inteligencia/mercado       [F5]
  Comparáveis                  /inteligencia/comparaveis   [F1 base de comparáveis do grupo]
  Reformas                     /inteligencia/reformas      [F1 tabela de referência · F5 histórico]
  Histórico                    /inteligencia/historico     [F5]

FINANCEIRO
  Investimentos                /financeiro                 [F3]
  Cotistas                     /financeiro/cotistas        [F3]
  Aportes                      /financeiro/aportes         [F3]
  Despesas                     /financeiro/despesas        [F3]
  Distribuições                /financeiro/distribuicoes   [F3]

DOCUMENTOS                     /documentos                 [F2]

CONFIGURAÇÕES
  Perfil de investimento       /config/perfil              [F1]
  Taxas e custos               /config/custos              [F1]
  Usuárias e papéis            /config/usuarias            [F1]
  Regras (liquidez, ajustes)   /config/regras              [F1]
```

## Página da oportunidade (o objeto central)

`/oportunidades/[id]` com abas, na ordem da jornada. Cada aba tem um **selo de estado** (vazio · rascunho · completo · dados insuficientes · atípico).

```
[Resumo]  [Imóvel]  [Comparáveis]  [Valuation]  [Reforma]  [Underwriting]  [Cenários]  [Lance máximo]  [Riscos]  [Documentos*]  [Memorando]
```
\* F2.

### Camadas (progressive disclosure), válidas em todas as abas
1. **Decisão** — o número ou a recomendação que importa (ex.: "Valor de saída 90d: R$ 1,22M · confiança 82%").
2. **Por quê** — os 3 a 6 fatores que explicam (expansível).
3. **Evidências** — tabela completa, comparável a comparável, linha a linha, trecho a trecho.

## Estados epistêmicos (linguagem visual)

| Estado | Tratamento |
|---|---|
| FATO | Texto sólido, ícone de verificação, fonte ao lado |
| ESTIMATIVA | Texto com faixa e confiança, ícone de intervalo |
| HIPÓTESE | Fundo sutil, ícone de "assumido", editável inline |
| AUSENTE | Traço, fundo hachurado, ação "informar" |

## Tipos de página
- **Lista** (radar, financeiro): tabela densa, filtros persistentes, ordenação, seleção múltipla.
- **Objeto** (oportunidade, negócio): cabeçalho fixo com decisão + abas.
- **Ferramenta** (war room, comparador): tela limpa, poucos números grandes.
- **Configuração**: formulários com explicação de impacto ("este campo afeta lance máximo").

## Home: "o que precisa da minha atenção?"
Lista priorizada (não gráficos): oportunidades fortes · análises aguardando jurídico · leilões nos próximos 7 dias ·
aportes pendentes · reformas acima do orçamento · valuations com dados insuficientes · tetos aprovados vencendo.
Cada item leva à aba exata onde a ação acontece.
