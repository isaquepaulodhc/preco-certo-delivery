# Roadmap Oficial

Nao avancar de fase sem autorizacao expressa.

## Fase 1 - Fundacao Tecnica

Entra:

- Projeto Next.js com App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Supabase client.
- Estrutura de pastas.
- `.env.example`.
- Landing page simples.
- Pagina de login.
- Pagina de cadastro.
- Protecao de rotas.
- Onboarding inicial do negocio.
- RPC `create_business_with_trial(...)`.
- Dashboard interno simples.
- Migration SQL inicial com schema completo.
- CHECK constraints.
- Indices principais.
- RLS.
- Policy especial de `businesses`.
- Trigger de `updated_at`.
- Funcao `current_business_id()`.
- Sequence/funcao para `payment_code`.
- Documentacao inicial.
- Setup inicial do Vitest.

Nao entra:

- CRUD completo de ingredientes.
- CRUD completo de produtos.
- Combos.
- Simulador.
- Upload real de logo.
- PIX manual completo.
- Painel admin completo.
- Gateway de pagamento.

## Fase 2 - Perfil Da Loja, Configuracao Financeira E Custos Fixos

Entra:

- Tela Perfil da Loja.
- Bucket `business-logos`.
- Policies de Storage.
- Upload e preview de logo.
- Exibicao da logo no layout interno.
- Edicao de dados basicos do negocio.
- Tela de configuracao financeira.
- Edicao de campos financeiros em `businesses`.
- Selecao de plano iFood: Basico, Entrega ou Personalizado.
- Preenchimento automatico de taxas padrao do iFood.
- Edicao manual de taxas iFood.
- CRUD de custos fixos.
- Calculo de custo fixo total.
- Calculo de percentual de custo fixo.
- Alertas de faturamento medio zerado e custo fixo acima de 40%.
- Validacao com Zod.
- Testes dos calculos correspondentes.

Nao entra antes desta fase:

- Upload real de logo.
- CRUD de custos fixos.
- Edicao completa das configuracoes financeiras.

## Fase 3 - Ingredientes

Entra:

- CRUD de ingredientes.
- Calculo automatico de `unit_cost`.
- Conversao de unidades.
- `correction_factor`.
- Historico de preco gravado pela aplicacao.
- Validacoes.
- Testes de unidade e custo.

Nao entra antes desta fase:

- Cadastro real de ingredientes.
- Historico de preco de ingredientes.
- Edicao de insumos em ficha tecnica.

## Fase 4 - Produtos E Ficha Tecnica

Entra:

- CRUD de produtos.
- Produto produzido.
- Produto de revenda.
- Ficha tecnica.
- Selecao de ingredientes.
- Quantidades por ingrediente.
- Custo da receita.
- Custo de seguranca.
- CMV.
- Preco sugerido para canal proprio.
- Preco sugerido iFood.
- Regra de iFood baseada em `ifood_paid_online_by_default`.
- Regra de entrega gratis por plano iFood.
- Margem de contribuicao.
- Margem liquida estimada.
- Diagnostico.

Nao entra antes desta fase:

- CRUD completo de produtos.
- Ficha tecnica operacional.
- Diagnostico individual de produto.

## Fase 5 - Combos

Entra:

- CRUD de combos.
- Selecao de produtos.
- Quantidade por produto.
- Calculo de custo total.
- Custo de seguranca.
- Preco sugerido para canal proprio.
- Preco sugerido iFood.
- Regras iFood.
- Margem de contribuicao.
- Margem liquida estimada.
- Diagnostico.

Nao entra antes desta fase:

- Cadastro real de combos.
- Calculo de combo baseado em produtos.

## Fase 6 - Simulador

Entra:

- Selecao de produto ou combo.
- Simulacao por canal.
- WhatsApp.
- iFood.
- Balcao.
- Cupom.
- Taxa cartao.
- Comissao iFood.
- Taxa de pagamento online iFood.
- Antecipacao iFood.
- Entrega gratis percentual.
- Entrega gratis fixa.
- Diagnostico visual.

Nao entra antes desta fase:

- Simulacao interativa de canais.
- Sobrescrita de cenarios para cupom, pagamento online e entrega gratis.

## Fase 7 - Dashboard E Saude Da Operacao

Entra:

- Cards principais.
- Status da assinatura.
- Status efetivo da assinatura.
- Proximos passos.
- Indicador fixo de Saude da Operacao.
- Estados neutro, verde, amarelo e vermelho.
- Precedencia deterministica.
- Saude calculada pelo canal proprio.
- Rankings de margem e lucro estimado.
- Alertas de configuracao incompleta.
- Alertas de produtos sem preco.
- Diagnostico de Margem do Cardapio.
- Balao fixo com dica de reajuste gradual.
- Calculo em lote no servidor, sem N+1 queries.

Nao entra antes desta fase:

- Saude da Operacao completa.
- Ranking de margem.
- Diagnostico agregado do cardapio.

## Fase 8 - Assinatura PIX Manual

Entra:

- Tela de planos.
- Criacao de `payment_request`.
- Geracao segura de `payment_code`.
- Tela com chave PIX.
- Instrucao para envio de comprovante.
- Status cru e efetivo da assinatura.
- `hasActiveAccess`.
- Bloqueio por vencimento.
- Renovacao manual.
- Estrutura para upload de comprovante, se simples.

Nao entra antes desta fase:

- Fluxo completo de renovacao via PIX.
- Bloqueio completo por assinatura vencida.
- Criacao manual completa de pagamentos pelo cliente.

## Fase 9 - Painel Admin

Entra:

- Protecao de rota admin.
- Validacao na tabela `admins`.
- Listagem de clientes.
- Listagem de assinaturas.
- Status efetivo da assinatura.
- Listagem de pagamentos pendentes.
- Aprovar pagamento.
- Rejeitar pagamento.
- Liberar 7 dias.
- Liberar 30 dias.
- Bloquear cliente.
- Alterar plano.

Nao entra antes desta fase:

- Painel admin completo.
- Aprovacao/rejeicao operacional de pagamentos.
- Alteracao administrativa de plano.

