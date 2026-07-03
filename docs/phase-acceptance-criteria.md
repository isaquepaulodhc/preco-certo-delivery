# Criterios De Aceite Por Fase

## Fase 1 - Fundacao Tecnica

Criterios:

- Aplicacao roda localmente.
- Usuario consegue criar conta.
- Usuario consegue fazer login.
- Usuario consegue criar negocio no onboarding.
- Onboarding cria business e subscription trial atomicamente.
- Usuario logado acessa dashboard.
- Usuario deslogado nao acessa area interna.
- `0001_initial_schema.sql` cria schema completo.
- CHECK constraints existem para campos fechados.
- Indices principais existem.
- Tabelas principais estao definidas.
- RLS esta habilitado e documentado.
- `businesses` tem policy propria.
- `updated_at` possui trigger automatica.
- `current_business_id()` existe.
- `payment_code` tem geracao segura.
- Campos de iFood existem em `businesses`.
- `business_logo_url` existe em `businesses`.
- `.env.example` existe.
- Documentacao inicial existe.
- TypeScript nao apresenta erro critico.
- Projeto possui estrutura organizada.

Testes esperados:

- Verificacao local de build/typecheck quando houver projeto.
- Testes unitarios basicos de utilitarios de unidade/moeda, se ja houver calculos implementados.
- Validacao manual de login, cadastro, onboarding e dashboard.

Restricoes:

- Nao implementar CRUD completo de ingredientes.
- Nao implementar CRUD completo de produtos.
- Nao implementar combos.
- Nao implementar simulador.
- Nao implementar upload real de logo.
- Nao implementar PIX manual completo.
- Nao implementar painel admin completo.
- Nao implementar gateway de pagamento.

## Fase 2 - Perfil Da Loja, Configuracao Financeira E Custos Fixos

Criterios:

- Usuario edita Perfil da Loja.
- Usuario envia logo valida.
- Usuario nao envia logo no diretorio de outro negocio.
- Logo aparece no dashboard/layout.
- Usuario edita configuracao financeira.
- Plano Basico preenche 12% + 3,2%.
- Plano Entrega preenche 23% + 3,2%.
- Plano Personalizado permite edicao manual.
- Usuario cria, edita, desativa e remove custos fixos.
- Total de custos fixos aparece corretamente.
- Percentual de custo fixo aparece corretamente.
- Alertas aparecem nos casos previstos.
- Usuario nao ve dados de outro negocio.

Testes esperados:

- Testes de calculo de custos fixos.
- Testes de percentual de custo fixo.
- Testes de alerta com faturamento zerado.
- Testes de alerta acima de 40%.
- Testes ou validacao de Storage policy.

Restricoes:

- Nao implementar ingredientes, produtos, combos ou simulador.

## Fase 3 - Ingredientes

Criterios:

- Usuario cria ingrediente com `kg/g`, `l/ml` e `un`.
- Sistema calcula custo unitario corretamente.
- Unidade incompativel retorna erro.
- `correction_factor` e aplicado corretamente.
- Atualizacao de ingrediente grava historico.
- Usuario nao edita `unit_cost` manualmente.
- Usuario nao acessa ingredientes de outro negocio.

Testes esperados:

- Conversao `kg -> g`.
- Conversao `g -> kg`.
- Conversao `l -> ml`.
- Conversao `ml -> l`.
- Unidade incompativel.
- Custo unitario.
- `correction_factor` 1.0.
- `correction_factor` 1.1.
- `correction_factor <= 0`.
- Custo com conversao.

Restricoes:

- Nao implementar produtos completos antes da Fase 4.

## Fase 4 - Produtos E Ficha Tecnica

Criterios:

- Produto produzido calcula custo com base na ficha tecnica.
- Produto de revenda calcula custo com `resale_unit_cost`.
- Produto de revenda tem perda padrao 0.
- CMV nao quebra com preco zerado.
- Diagnostico usa margem liquida estimada.
- Preco sugerido respeita custos fixos, variaveis e margem desejada.
- Preco iFood respeita comissao, pagamento online e antecipacao.
- Preco iFood usa `ifood_paid_online_by_default`.
- iFood basic pode aplicar entrega gratis.
- iFood delivery nao aplica entrega gratis por padrao.
- iFood nao aplica taxa de cartao comum.
- Custos finais sao calculados on read.
- Usuario nao acessa produtos de outro negocio.

Testes esperados:

- Custo da receita.
- Produto de revenda.
- Produto produzido com perda sugerida pela UI.
- Custo de seguranca.
- CMV com preco valido.
- CMV com preco zerado.
- Preco sugerido por cenario.
- Denominador inviavel.
- Diagnosticos.

Restricoes:

- Nao implementar combos antes da Fase 5.
- Nao persistir CMV, margem, preco sugerido ou diagnostico como verdade definitiva.

## Fase 5 - Combos

Criterios:

- Usuario cria combo com produtos existentes.
- Combo recalcula custo quando produto muda.
- Combo nao persiste custo final como verdade definitiva.
- Diagnostico usa margem liquida estimada.
- Usuario nao acessa combos de outro negocio.

Testes esperados:

- Custo total de combo.
- Quantidade por produto.
- Custo de seguranca.
- Margem de contribuicao.
- Margem liquida estimada.
- Diagnostico.

Restricoes:

- Nao implementar simulador antes da Fase 6.

## Fase 6 - Simulador

Criterios:

- Simulacao de WhatsApp funciona.
- Simulacao de iFood aplica comissao iFood.
- Simulacao de iFood aplica taxa de pagamento online, se configurada.
- Simulacao de iFood nao aplica taxa de cartao comum.
- Simulacao de iFood delivery nao aplica entrega gratis por padrao.
- Simulacao de iFood basic pode aplicar entrega gratis.
- Desconto reduz lucro.
- Taxa cartao reduz lucro em canais proprios.
- Entrega gratis reduz lucro quando aplicavel.
- Preco zerado nao quebra.
- Diagnostico visual e coerente.

Testes esperados:

- Cupom.
- Taxa cartao.
- Comissao iFood.
- Taxa de pagamento online.
- Antecipacao iFood.
- Entrega gratis percentual.
- Entrega gratis fixa.
- Margem de contribuicao.
- Margem liquida estimada.

Restricoes:

- Nao implementar Saude da Operacao completa antes da Fase 7.

## Fase 7 - Dashboard E Saude Da Operacao

Criterios:

- Dashboard resume a situacao do negocio.
- Indicador de saude aparece no topo da area logada.
- Indicador usa cor, texto e icone.
- Indicador nao depende apenas da cor.
- Estado neutro aparece com dados insuficientes.
- Estado vermelho tem prioridade quando ha item em prejuizo.
- Estado amarelo aparece quando ha item abaixo da margem e nenhum item em prejuizo.
- Estado verde aparece somente quando todos os itens avaliaveis estao na margem.
- Clique no indicador abre diagnostico.
- Diagnostico lista produtos/combos abaixo da margem.
- Balao fixo de dica aparece corretamente.
- Saude e calculada com margem do canal proprio.
- Preco iFood aparece como comparacao, mas nao altera o status global.
- Dados pertencem apenas ao negocio logado.
- Estados vazios sao claros.
- Nao ha erro com base vazia.

Testes esperados:

- Operacao neutra com dados insuficientes.
- Operacao verde.
- Operacao amarela.
- Operacao vermelha.
- Precedencia vermelho antes de amarelo.
- Lista de produtos/combos abaixo da margem.
- Saude calculada com canal proprio.
- Preco iFood nao altera estado global.

Restricoes:

- Nao implementar assinatura PIX completa antes da Fase 8.

## Fase 8 - Assinatura PIX Manual

Criterios:

- Cliente escolhe plano.
- Sistema gera solicitacao de pagamento.
- Codigo `PCD-00001` e gerado com seguranca.
- Tela mostra chave PIX.
- Assinatura vencida bloqueia funcionalidades internas mesmo se status cru ainda for `active`.
- Admin e cliente veem status efetivo corretamente.
- Dados do cliente nao sao apagados.
- Tela de renovacao continua acessivel.

Testes esperados:

- `hasActiveAccess` com trial valido.
- `hasActiveAccess` com active valido.
- `hasActiveAccess` com `paid_until` vencido.
- `hasActiveAccess` com blocked.
- `hasActiveAccess` com cancelled.
- Status efetivo "Vencido" quando status cru for active/trial, mas data passou.

Restricoes:

- Nao implementar gateway de pagamento.
- Nao expor service role no frontend.

## Fase 9 - Painel Admin

Criterios:

- Usuario comum nao acessa admin.
- Admin acessa painel.
- Service role nao aparece no frontend.
- Aprovacao de pagamento ativa assinatura.
- Rejeicao mantem pagamento pendente/rejeitado conforme regra definida.
- Liberacao manual altera `paid_until`.
- Admin visualiza "Vencido" quando `paid_until` expirou, mesmo se status cru ainda estiver `active`.
- Acoes admin sao registradas quando aplicavel.

Testes esperados:

- Protecao de rota admin.
- Validacao em `admins`.
- Aprovacao de pagamento.
- Rejeicao de pagamento.
- Bloqueio de cliente.
- Alteracao de plano.
- Status efetivo.

Restricoes:

- Service role somente server-side.
- Usuario comum nunca pode chamar funcoes administrativas.

