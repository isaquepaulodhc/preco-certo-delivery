# Plano Do Produto

## Visao Do Produto

Preco Certo Delivery e um SaaS para pequenos negocios de delivery entenderem se estao realmente lucrando. A plataforma deve calcular custo real, CMV, margem, preco sugerido, impacto de taxas, impacto do iFood, combos, entrega gratis, custos fixos e saude geral da operacao.

A promessa central e:

> Cadastre ingredientes, custos, produtos e combos. O sistema mostra quanto cobrar, quanto voce lucra, como o iFood impacta sua margem e quais itens estao matando sua operacao.

O produto nao deve ser uma calculadora descartavel. Ele deve persistir dados, isolar negocios, permitir login, controlar assinatura e preparar evolucao futura para pagamento automatico.

## Publico-Alvo

- Hamburguerias pequenas.
- Marmitarias.
- Pizzarias pequenas.
- Lojas de porcoes.
- Acaiterias.
- Confeitarias.
- Dark kitchens.
- Negocios locais que vendem por WhatsApp, iFood, balcao ou delivery proprio.

## Dores Resolvidas

A dor principal e:

> Eu vendo, mas nao sei se estou lucrando.

Perguntas que o sistema deve responder:

- Quanto custa realmente cada produto?
- Qual e o CMV do produto?
- Qual preco deveria ser cobrado?
- O preco do iFood deveria ser diferente do WhatsApp?
- O Plano Basico ou Entrega do iFood muda a margem?
- Se houver cupom ou entrega gratis, ainda existe lucro?
- Qual combo esta prejudicando a margem?
- Qual produto vende muito, mas lucra pouco?
- Quais itens estao abaixo do preco indicado?
- A operacao esta saudavel, em atencao ou em prejuizo?
- Quanto falta para bater a meta mensal?
- A assinatura esta ativa ou vencida?

## Escopo Do MVP

O MVP deve ser uma aplicacao web responsiva com:

- Landing page publica.
- Login e cadastro.
- Onboarding inicial do negocio.
- Persistencia no Supabase Postgres.
- Area logada do cliente.
- Perfil da loja.
- Upload de foto/logo da loja.
- Configuracao financeira.
- Taxas padrao do iFood.
- Cadastro de custos fixos.
- Cadastro de ingredientes.
- Cadastro de produtos.
- Ficha tecnica de produtos.
- Distincao entre produto produzido e produto de revenda.
- Cadastro de combos.
- Simulador de canais.
- Dashboard inicial.
- Indicador de saude da operacao.
- Diagnostico de margem do cardapio.
- Controle de assinatura via PIX manual.
- Painel administrativo interno para liberar, bloquear e renovar clientes.

## Antiobjetivos

Nao fazem parte do MVP:

- ERP completo.
- PDV.
- Controle fiscal.
- Emissao de nota fiscal.
- Integracao automatica com iFood.
- Integracao bancaria.
- Gateway de pagamento automatico.
- Assinatura por cartao.
- IA.
- App mobile nativo.
- Controle completo de estoque.
- Gestao de funcionarios.
- Marketplace de fornecedores.
- Permissoes complexas de equipe.
- Multiempresa avancado.
- Importacao automatica de nota fiscal.
- Conciliacao automatica de pagamentos.
- Automacoes avancadas de WhatsApp.

Tambem nao e permitido salvar dados principais apenas em `localStorage`, cookies, estado do navegador ou cache local.

## Proposta De Valor

O produto ajuda o dono do delivery a tomar decisoes praticas:

- Saber o custo real de cada item.
- Separar margem de contribuicao de margem liquida estimada.
- Comparar preco do canal proprio com preco necessario no iFood.
- Entender o impacto de cupom, taxa de cartao, comissao, pagamento online e entrega gratis.
- Identificar produtos e combos que precisam de reajuste.
- Ter uma visao simples da saude do cardapio.

## Visao Futura

Apos o MVP, o produto pode evoluir para:

- Pagamento automatico de assinatura.
- Upload de comprovante dentro da plataforma.
- Relatorios historicos mais ricos.
- Importacao de vendas.
- Registro mais completo de vendas e despesas.
- Sugestao gradual de reajuste.
- Permissoes de equipe.
- Multiempresa.
- Integracoes externas, incluindo iFood e meios de pagamento, somente apos autorizacao.

