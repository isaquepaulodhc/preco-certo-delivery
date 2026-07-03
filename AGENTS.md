# Preco Certo Delivery - Regras Permanentes

Este arquivo define as regras permanentes para qualquer agente ou pessoa que trabalhe neste repositorio.

## Papel Do Projeto

Preco Certo Delivery e um SaaS para pequenos deliveries calcularem preco correto, CMV, margem, lucro por produto, impacto de taxas, combos, entrega gratis, iFood, custos fixos, custos variaveis e saude geral da operacao.

O produto deve nascer como SaaS real, com login, isolamento por negocio, persistencia em banco, assinatura e base preparada para evolucao.

## Stack Obrigatoria

- Next.js com App Router.
- TypeScript em modo estrito.
- Tailwind CSS.
- shadcn/ui.
- Supabase Auth.
- Supabase Postgres.
- Supabase Storage.
- Row Level Security no Supabase.
- `supabase-js`.
- React Hook Form.
- Zod.
- Recharts.
- date-fns.
- lucide-react.
- Vitest para testes unitarios.

## Proibicoes Tecnicas

- Nao usar Prisma.
- Nao usar outro ORM.
- Nao usar Firebase.
- Nao usar MongoDB.
- Nao usar Redux.
- Nao criar app mobile nativo no MVP.
- Nao integrar gateway de pagamento na primeira versao.
- Nao integrar iFood automaticamente no MVP.
- Nao usar IA na primeira versao.
- Nao criar sistema paralelo de migrations por ORM.

A fonte da verdade do banco deve ser SQL/Supabase migrations.

## Antiobjetivos Do MVP

Nao construir no MVP:

- ERP completo.
- PDV.
- Controle fiscal.
- Emissao de nota fiscal.
- Integracao bancaria.
- Assinatura por cartao.
- Controle completo de estoque.
- Gestao de funcionarios.
- Marketplace de fornecedores.
- Permissoes complexas de equipe.
- Multiempresa avancado.
- Importacao automatica de nota fiscal.
- Conciliacao automatica de pagamentos.
- Automacoes avancadas de WhatsApp.

## Regras De Fase

- A execucao oficial vai da Fase 1 a Fase 9.
- Nao avancar de fase sem autorizacao expressa do usuario.
- Nao implementar funcionalidades de uma fase futura apenas porque a estrutura existe.
- A migration inicial deve criar/prever o schema completo do MVP, mas as telas e fluxos devem respeitar a fase autorizada.

## Seguranca E Multi-Tenancy

- Todo dado relevante do cliente deve ser persistido no Supabase Postgres.
- Dados principais nao podem viver apenas em `localStorage`, cookies, estado do navegador ou cache local.
- Todo dado de cliente deve estar isolado por `business_id`, exceto tabelas globais ou administrativas justificadas.
- RLS deve estar habilitado nas tabelas de dados do cliente.
- Usuario comum so pode acessar o proprio negocio.
- No MVP: 1 usuario comum = 1 negocio.
- No MVP: nao criar `business_members`, equipes, convites ou multiplos negocios por usuario.
- A tabela `businesses` e a ancora do tenant e deve usar policy propria baseada em `owner_user_id = auth.uid()`.
- `SUPABASE_SERVICE_ROLE_KEY` nunca pode ser exposta no frontend.
- Chaves privadas devem ser usadas apenas server-side.

## Regras De Banco

- Usar UUIDs como chave primaria.
- Usar `gen_random_uuid()` quando aplicavel.
- Usar `timestamptz` para `created_at` e `updated_at`.
- Criar trigger automatica de `updated_at` em tabelas que possuem esse campo.
- Nao criar trigger para `ingredient_price_history`; o historico deve ser gravado pela aplicacao.
- Usar `numeric(12,2)` para valores monetarios finais, precos e totais.
- Usar `numeric(12,4)` para quantidades.
- Usar `numeric(14,6)` para custos unitarios.
- Usar `numeric(7,6)` para percentuais armazenados como decimal.
- Criar CHECK constraints ou enums para campos fechados.
- Criar indices em todos os `business_id`, FKs e joins usados em calculos.

## Regras De Calculo

- Todos os calculos devem ser centralizados em `/lib/calculations`.
- Nao espalhar formulas em componentes visuais.
- Funcoes de calculo devem ser puras e testaveis.
- A interface pode formatar resultados, mas nao deve ser dona da regra de negocio.
- Produtos, combos, CMV, margens, diagnosticos e precos sugeridos devem ser calculados on read.
- Nao persistir CMV, margem, preco sugerido ou diagnostico como verdade definitiva.
- Vendas, historico de precos e pagamentos aprovados sao snapshots e nao devem ser recalculados retroativamente.

## Regras De Assinatura

- O acesso efetivo deve ser derivado por funcao centralizada `hasActiveAccess(subscription, today)`.
- `hasActiveAccess` deve retornar verdadeiro somente quando `status` for `trial` ou `active` e `paid_until >= today`.
- Nao depender de scheduler para bloquear assinatura vencida.
- Nunca apagar dados do cliente por vencimento.

## Qualidade

- Componentes pequenos.
- Nomes descritivos.
- Validacoes com Zod.
- Formularios com React Hook Form.
- Tratamento de loading, erro e estados vazios.
- Acessibilidade basica.
- Evitar duplicacao de formula.
- Evitar overengineering.
- Evitar N+1 queries em dashboard, produtos, combos e saude da operacao.
- Manter documentacao atualizada.

## Comunicacao Obrigatoria Ao Final De Cada Entrega

Sempre informar:

- arquivos criados;
- arquivos alterados;
- comandos executados;
- variaveis de ambiente necessarias;
- como testar;
- testes executados;
- pendencias;
- riscos tecnicos;
- proxima fase recomendada.
