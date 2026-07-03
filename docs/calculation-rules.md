# Regras De Calculo

Todos os calculos devem ficar centralizados em `/lib/calculations`. Componentes visuais nao devem conter formulas de negocio.

As funcoes devem ser puras, testaveis e reutilizadas por produtos, combos, simulador, dashboard e saude da operacao.

## Unidades

Unidades permitidas no MVP:

- Massa: `kg`, `g`.
- Volume: `l`, `ml`.
- Unidade: `un`.

Regras:

- `kg` converte com `g`.
- `l` converte com `ml`.
- `un` so e compativel com `un`.
- Nao converter unidade para massa ou volume.
- Nao converter massa para volume.
- Nao converter volume para massa.
- Unidade incompativel deve retornar erro claro.

## `correction_factor`

`correction_factor` representa fator de correcao/rendimento do ingrediente.

Ele e fator multiplicador, nao percentual.

Exemplos:

- Sem perda: `1.0`.
- Custo 10% maior apos limpeza/rendimento: `1.1`.
- Custo 25% maior: `1.25`.

Regras:

- Valor maior que 1 aumenta custo unitario.
- Valor igual a 1 mantem custo.
- Valor menor ou igual a 0 e invalido.
- Nao confundir com `loss_percentage`.

`correction_factor` e aplicado ao ingrediente. `loss_percentage` e aplicado ao produto ou combo como margem de seguranca operacional.

## Custo Unitario Do Ingrediente

```text
convertedPurchaseQuantity = convertQuantity(purchaseQuantity, purchaseUnit, usageUnit)
unitCost = (purchasePrice * correctionFactor) / convertedPurchaseQuantity
```

Guardas:

- Se `purchaseQuantity <= 0`, retornar erro.
- Se unidade for incompativel, retornar erro.
- Se `correctionFactor <= 0`, retornar erro.

Exemplo:

- Compra: 1 kg de bacon por R$ 40,00.
- Unidade de uso: g.
- Quantidade convertida: 1000 g.
- Custo unitario: 40 / 1000 = R$ 0,04 por g.
- Uso na receita: 80 g.
- Custo na receita: 80 * 0,04 = R$ 3,20.

## Custo De Produto Produzido

```text
ingredientUsageQuantity = convertQuantity(quantity, productIngredient.unit, ingredient.usage_unit)
ingredientCost = ingredient.unitCost * ingredientUsageQuantity
recipeCost = soma de ingredientCost
```

## Custo De Produto De Revenda

```text
recipeCost = resaleUnitCost
```

Produto de revenda deve ter `loss_percentage` padrao 0.

## Custo De Combo

```text
comboCost = soma(productCost * comboItem.quantity)
```

O custo final deve ser calculado on read. Nao persistir custo final do combo como verdade definitiva.

## Custo De Seguranca

```text
safeCost = recipeCost * (1 + lossPercentage)
```

## Custos Fixos

```text
fixedCostsTotal = soma de fixed_costs ativos + ifood_monthly_fee
```

Regras:

- Nao contar `ifood_monthly_fee` duas vezes.
- Se a mensalidade do iFood estiver em `businesses.ifood_monthly_fee`, nao criar custo fixo automatico duplicado.

Simplificacao consciente do MVP:

- `ifood_monthly_fee`, quando usada em `fixedCostsTotal`, sera rateada por todos os canais por meio de `averageMonthlyRevenue`, inclusive WhatsApp e balcao.

## Percentual De Custo Fixo

```text
fixedCostPercentage = fixedCostsTotal / averageMonthlyRevenue
```

Guardas:

- Se `averageMonthlyRevenue <= 0`, nao calcular.
- Exibir alerta: "Informe faturamento medio para calcular preco com custos fixos."
- Se `fixedCostPercentage > 0.4`, exibir alerta de custo fixo alto.

## Taxas iFood

Planos:

- `basic`: 12% de comissao + 3,2% de pagamento online.
- `delivery`: 23% de comissao + 3,2% de pagamento online.
- `custom`: cliente informa taxas manualmente.

Regras:

- Taxas devem ser editaveis.
- No canal iFood, nao aplicar taxa de cartao comum do restaurante.
- Aplicar comissao iFood.
- Aplicar taxa de pagamento online iFood quando pago pela plataforma.
- Aplicar antecipacao de recebiveis se configurada.
- Aplicar cupom/desconto se houver.
- Aplicar entrega gratis/subsidio apenas quando a regra do canal/plano permitir.

## Taxa De Cartao

```text
cardFeeAmount =
  channel === "ifood"
    ? 0
    : sellingPrice * cardFeePercentage
```

No MVP, vendas iFood nao sofrem taxa de cartao separada. A taxa de pagamento online do iFood e propria do marketplace.

## Comissao iFood

```text
ifoodCommissionAmount =
  channel === "ifood"
    ? sellingPrice * ifoodCommissionPercentage
    : 0
```

## Taxa De Pagamento Online iFood

Para preco sugerido iFood estatico, usar `businesses.ifood_paid_online_by_default`.

```text
ifoodPaymentFeeAmount =
  channel === "ifood" && paidOnlineViaIfood
    ? sellingPrice * ifoodPaymentFeePercentage
    : 0
```

No simulador, o usuario pode sobrescrever `paidOnlineViaIfood`.

## Antecipacao De Recebiveis iFood

```text
ifoodAdvanceFeeAmount =
  channel === "ifood"
    ? sellingPrice * ifoodReceivablesAdvancePercentage
    : 0
```

Simplificacao consciente do MVP:

- `ifoodReceivablesAdvancePercentage` sera tratado como percentual simples sobre o valor da venda.
- Na pratica, a antecipacao pode incidir sobre o valor antecipado conforme contrato do cliente.

## Desconto

```text
discountAmount = sellingPrice * discountPercentage
```

## Entrega Gratis Por Canal E Plano

O simulador deve aceitar valor fixo ou percentual:

```text
freeDeliveryCost = freeDeliveryFixedAmount, se informado
freeDeliveryCost = sellingPrice * freeDeliveryPercentage, caso contrario
```

Aplicar somente quando permitido:

- Canais proprios (`whatsapp`, `balcao`, `other`): podem aplicar entrega gratis.
- iFood `basic`: pode aplicar entrega gratis/subsidio, pois a entrega e propria do lojista.
- iFood `delivery`: nao aplicar entrega gratis por padrao, pois a logistica ja esta embutida na comissao maior.
- iFood `custom`: no MVP, seguir a regra de `basic`, salvo configuracao futura.

## Percentual Variavel Por Cenario

Canal proprio:

```text
ownChannelVariablePercentage =
  cardFeePercentage
  + averageCouponPercentage
  + freeDeliveryPercentage
```

iFood basic:

```text
ifoodBasicVariablePercentage =
  ifoodCommissionPercentage
  + ifoodPaymentFeePercentage, se ifood_paid_online_by_default
  + ifoodReceivablesAdvancePercentage
  + averageCouponPercentage
  + freeDeliveryPercentage
```

iFood delivery:

```text
ifoodDeliveryVariablePercentage =
  ifoodCommissionPercentage
  + ifoodPaymentFeePercentage, se ifood_paid_online_by_default
  + ifoodReceivablesAdvancePercentage
  + averageCouponPercentage
```

Nao incluir `cardFeePercentage` no iFood. Nao incluir `freeDeliveryPercentage` no iFood delivery.

## Preco Sugerido

Formula geral:

```text
suggestedPriceForScenario =
  safeCost / (1 - (fixedCostPercentage + variablePercentageForScenario + desiredProfitMargin))
```

Canal proprio:

```text
suggestedOwnChannelPrice =
  safeCost / (1 - (fixedCostPercentage + ownChannelVariablePercentage + desiredProfitMargin))
```

iFood:

```text
suggestedIfoodPrice =
  safeCost / (1 - (fixedCostPercentage + ifoodVariablePercentage + desiredProfitMargin))
```

Guardas:

- Se denominador <= 0, nao calcular.
- Exibir alerta de configuracao inviavel.
- Nao usar formula simplificada que mistura taxa de cartao e taxa iFood.

## CMV

```text
cmv = safeCost / sellingPrice
```

Guardas:

- Se `sellingPrice <= 0`, nao calcular.
- Exibir: "Informe o preco de venda para calcular CMV e lucro."

## Margem De Contribuicao

Mostra quanto sobra apos custo direto, descontos, taxas de canal e entrega gratis. Ainda nao desconta custo fixo proporcional.

```text
contributionProfit =
  sellingPrice
  - safeCost
  - discountAmount
  - cardFeeAmount
  - ifoodCommissionAmount
  - ifoodPaymentFeeAmount
  - ifoodAdvanceFeeAmount
  - freeDeliveryCost

contributionMargin = contributionProfit / sellingPrice
```

## Margem Liquida Estimada

Mostra quanto sobra apos tambem descontar alocacao proporcional de custo fixo. Deve ser a metrica principal de diagnostico.

```text
allocatedFixedCostAmount = sellingPrice * fixedCostPercentage
estimatedNetProfit = contributionProfit - allocatedFixedCostAmount
estimatedNetMargin = estimatedNetProfit / sellingPrice
```

Guardas:

- Se `sellingPrice <= 0`, nao calcular.
- Se `fixedCostPercentage` nao puder ser calculado, exibir alerta de configuracao financeira incompleta.

## Diagnostico

O diagnostico principal deve usar `estimatedNetMargin` e `estimatedNetProfit`.

Regras:

- Prejuizo: `estimatedNetProfit <= 0`.
- Perigoso: `estimatedNetProfit > 0` e `estimatedNetMargin < desiredProfitMargin * 0.5`.
- Atencao: `estimatedNetProfit > 0` e `estimatedNetMargin < desiredProfitMargin`.
- Saudavel: `estimatedNetMargin >= desiredProfitMargin`.

Mensagens:

- "Esse produto esta saudavel."
- "Esse item precisa de atencao."
- "Esse produto esta perigoso."
- "Esse produto pode estar dando prejuizo."

## Saude Da Operacao

A Saude da Operacao resume o cardapio com base nos produtos e combos ativos.

Regras:

- Usar margem liquida estimada do canal proprio ao preco atual.
- `products.selling_price` representa o preco atual do canal proprio.
- iFood aparece como sugestao/comparacao, mas nao altera o estado global do canal proprio.
- Calculo em lote no servidor, evitando N+1 queries.
- Reutilizar as funcoes centralizadas de margem e diagnostico.

Precedencia:

1. Neutro: dados insuficientes.
2. Vermelho: pelo menos um item com lucro liquido estimado <= 0.
3. Amarelo: nenhum item em prejuizo, mas pelo menos um item abaixo da margem desejada.
4. Verde: todos os itens avaliaveis estao na margem desejada ou acima.

## Assinatura E `hasActiveAccess`

O acesso efetivo deve ser derivado na leitura.

```text
hasActiveAccess =
  subscription.status in ("trial", "active")
  && subscription.paid_until >= today
```

Regras:

- `trial`: liberar se `paid_until >= hoje`.
- `active`: liberar se `paid_until >= hoje`.
- `expired`: bloquear funcionalidades internas e permitir tela de assinatura.
- `blocked`: bloquear acesso e mostrar contato com suporte.
- `cancelled`: bloquear funcionalidades internas e permitir renovacao se aplicavel.
- Nunca apagar dados por vencimento.
- Nao depender de scheduler para bloquear acesso vencido.

## Arredondamento E Formatacao

- Manter precisao interna nos calculos.
- Arredondar apenas na exibicao final.
- Usar `Intl.NumberFormat('pt-BR')` para moeda.
- Usar formato brasileiro para percentuais.
- Aceitar input com virgula decimal.
- Nao implementar arredondamento psicologico para ,90 ou ,99 no MVP, salvo pedido futuro.

## Dados Vivos Versus Snapshots

Dados vivos:

- Ingredientes atuais.
- Produtos atuais.
- Combos atuais.
- CMV atual.
- Margem atual.
- Preco sugerido atual.
- Diagnostico atual.
- Saude atual da operacao.

Snapshots:

- Vendas.
- Pagamentos aprovados.
- Historico de precos.
- `sales.item_name`.
- Relatorios historicos futuros.

Uma venda antiga nunca deve ser recalculada automaticamente quando custos ou nomes mudarem.

