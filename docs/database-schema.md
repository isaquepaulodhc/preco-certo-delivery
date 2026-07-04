# Modelo De Dados E Banco

## Diretrizes Gerais

O banco deve ser Supabase Postgres, com SQL migrations como fonte da verdade. Nao usar Prisma nem outro ORM.

Regras gerais:

- A migration inicial `supabase/migrations/0001_initial_schema.sql` deve criar o schema completo do MVP, mesmo que algumas telas e fluxos sejam implementados somente em fases posteriores.
- Usar UUID como chave primaria.
- Usar `gen_random_uuid()` quando aplicavel.
- Usar `timestamptz` para `created_at` e `updated_at`.
- Usar trigger automatica para atualizar `updated_at`.
- Usar `numeric(12,2)` para valores monetarios finais, precos e totais.
- Usar `numeric(12,4)` para quantidades.
- Usar `numeric(14,6)` para custo unitario.
- Usar `numeric(7,6)` para percentuais armazenados como decimal.
- Percentuais sao armazenados como decimal: 16,69% = `0.1669`.
- Habilitar RLS nas tabelas de dados do cliente.
- Criar indice em todo `business_id`.
- Criar indices nas FKs usadas em joins.

## Multi-Tenancy

No MVP:

- 1 usuario comum = 1 negocio.
- 1 negocio = 1 dono principal.
- Nao implementar equipes.
- Nao implementar convites.
- Nao implementar multiplos negocios por usuario.
- Nao criar tabela `business_members`.

A relacao principal e:

```sql
businesses.owner_user_id = auth.users.id
```

Todas as tabelas de dados do cliente devem ter `business_id`, exceto `businesses`, `admins` e tabelas globais justificadas.

## Tabelas

### businesses

Tabela ancora do tenant.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `owner_user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `segment text`
- `city text`
- `whatsapp text`
- `business_logo_url text`
- `average_monthly_revenue numeric(12,2) default 0`
- `target_monthly_revenue numeric(12,2) default 0`
- `desired_profit_margin numeric(7,6) default 0.200000`
- `ifood_plan text default 'basic'`
- `ifood_commission_percentage numeric(7,6) default 0.120000`
- `ifood_payment_fee_percentage numeric(7,6) default 0.032000`
- `ifood_receivables_advance_percentage numeric(7,6) default 0`
- `ifood_monthly_fee numeric(12,2) default 0`
- `ifood_paid_online_by_default boolean default true`
- `card_fee_percentage numeric(7,6) default 0.039900`
- `average_coupon_percentage numeric(7,6) default 0`
- `free_delivery_percentage numeric(7,6) default 0`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints e indices:

- `unique(owner_user_id)`
- CHECK de `ifood_plan in ('basic', 'delivery', 'custom')`
- indice em `owner_user_id`

### subscriptions

Assinatura do negocio.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `plan text not null`
- `status text not null`
- `payment_method text not null default 'manual_pix'`
- `amount numeric(12,2) not null default 0`
- `started_at date`
- `paid_until date`
- `last_payment_at timestamptz`
- `external_provider text`
- `external_subscription_id text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

CHECK constraints:

- `status in ('trial', 'active', 'expired', 'blocked', 'cancelled')`
- `payment_method in ('manual_pix', 'credit_card', 'mercado_pago', 'stripe', 'other')`

### payment_requests

Solicitacoes de pagamento via PIX manual.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `subscription_id uuid references subscriptions(id) on delete set null`
- `plan text not null`
- `amount numeric(12,2) not null`
- `status text not null default 'pending'`
- `due_date date`
- `proof_url text`
- `payment_code text unique not null`
- `requested_by uuid references auth.users(id)`
- `approved_at timestamptz`
- `approved_by uuid references auth.users(id)`
- `canceled_by uuid references auth.users(id)`
- `canceled_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

CHECK:

- `status in ('pending', 'approved', 'rejected', 'cancelled')`

`payment_code` deve ser gerado por sequence ou funcao SQL segura contra concorrencia, no formato `PCD-00001`.

Na Fase 8, a tabela passa a ser operada por RPCs para evitar valor vindo do cliente, pedido duplicado pendente e aprovacao parcial:

- `create_manual_pix_payment_request(plan_code)`: cria ou retorna o pedido `pending` existente do negocio logado.
- `approve_payment_request(payment_request_id)`: exige admin, aprova apenas pedido `pending`, atualiza assinatura e registra auditoria de aprovacao em uma unica transacao.
- `cancel_payment_request(payment_request_id)`: exige admin, cancela apenas pedido `pending` e nao altera assinatura.

### fixed_costs

Custos fixos ativos ou inativos do negocio.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `name text not null`
- `category text`
- `amount numeric(12,2) not null`
- `active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### ingredients

Insumos usados em fichas tecnicas.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `name text not null`
- `category text`
- `supplier text`
- `purchase_price numeric(12,2) not null`
- `purchase_quantity numeric(12,4) not null`
- `purchase_unit text not null`
- `usage_unit text not null`
- `correction_factor numeric(12,4) default 1`
- `unit_cost numeric(14,6) not null`
- `last_price_update date`
- `active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

`unit_cost` e derivado e nao deve ser editado manualmente pelo usuario.

### ingredient_price_history

Historico snapshot de precos de ingredientes.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `ingredient_id uuid not null references ingredients(id) on delete cascade`
- `business_id uuid not null references businesses(id) on delete cascade`
- `purchase_price numeric(12,2) not null`
- `purchase_quantity numeric(12,4) not null`
- `purchase_unit text not null`
- `usage_unit text not null`
- `correction_factor numeric(12,4) default 1`
- `unit_cost numeric(14,6) not null`
- `created_at timestamptz default now()`

Nao criar trigger automatica para esta tabela. O historico deve ser gravado pela aplicacao.

### products

Produtos produzidos ou de revenda.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `name text not null`
- `type text not null`
- `selling_price numeric(12,2) not null default 0`
- `resale_unit_cost numeric(12,2) default 0`
- `loss_percentage numeric(7,6) default 0`
- `active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

CHECK:

- `type in ('produced', 'resale')`

Custos finais, CMV, margens, diagnosticos e precos sugeridos devem ser calculados on read.

### product_ingredients

Itens da ficha tecnica de produto produzido.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `product_id uuid not null references products(id) on delete cascade`
- `ingredient_id uuid not null references ingredients(id) on delete restrict`
- `quantity numeric(12,4) not null`
- `unit text not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### combos

Combos compostos por produtos.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `name text not null`
- `selling_price numeric(12,2) not null default 0`
- `loss_percentage numeric(7,6) default 0`
- `active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### combo_items

Produtos dentro de combos.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `combo_id uuid not null references combos(id) on delete cascade`
- `product_id uuid not null references products(id) on delete restrict`
- `quantity numeric(12,4) not null default 1`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### sales

Vendas historicas como snapshot.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `date date not null`
- `item_type text not null`
- `item_id uuid not null`
- `item_name text not null`
- `quantity numeric(12,4) not null`
- `unit_price numeric(12,2) not null`
- `channel text not null`
- `discount_percentage numeric(7,6) default 0`
- `revenue numeric(12,2) not null`
- `estimated_cost numeric(12,2) not null`
- `contribution_profit numeric(12,2) not null`
- `estimated_net_profit numeric(12,2) not null`
- `notes text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

CHECK constraints:

- `item_type in ('product', 'combo')`
- `channel in ('whatsapp', 'ifood', 'balcao', 'other')`

`item_id` nao tera FK direta porque pode apontar para produto ou combo.

### expenses

Despesas historicas.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `business_id uuid not null references businesses(id) on delete cascade`
- `date date not null`
- `category text`
- `description text not null`
- `amount numeric(12,2) not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### admins

Usuarios administrativos.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `role text not null default 'admin'`
- `created_at timestamptz default now()`

Constraints:

- `unique(user_id)`
- CHECK de `role in ('admin', 'owner', 'support')`

Funcao auxiliar:

- `is_admin()`: retorna verdadeiro quando `auth.uid()` existe em `admins` com papel administrativo permitido.

## Indices Obrigatorios

- `businesses(owner_user_id)`
- `subscriptions(business_id)`
- `payment_requests(business_id)`
- `payment_requests(subscription_id)`
- `fixed_costs(business_id)`
- `ingredients(business_id)`
- `ingredient_price_history(business_id)`
- `ingredient_price_history(ingredient_id)`
- `products(business_id)`
- `product_ingredients(business_id)`
- `product_ingredients(product_id)`
- `product_ingredients(ingredient_id)`
- `combos(business_id)`
- `combo_items(business_id)`
- `combo_items(combo_id)`
- `combo_items(product_id)`
- `sales(business_id)`
- `expenses(business_id)`
- `admins(user_id)`

## Funcao `current_business_id()`

Funcao helper obrigatoria:

```sql
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.businesses
  where owner_user_id = auth.uid()
  limit 1
$$;
```

Ela deve ser usada nas policies das tabelas filhas que possuem `business_id`.

## RLS

Toda tabela com `business_id` deve:

- permitir SELECT apenas quando `business_id = current_business_id()`;
- permitir INSERT apenas no proprio `business_id`;
- permitir UPDATE apenas no proprio `business_id`;
- permitir DELETE apenas no proprio `business_id`, quando a exclusao for permitida.

Nao confiar apenas no frontend.

## Policy Especial De `businesses`

`businesses` nao possui `business_id` e nao deve usar a policy generica.

Policies:

- SELECT: `owner_user_id = auth.uid()`
- INSERT: `owner_user_id = auth.uid()`
- UPDATE: `owner_user_id = auth.uid()`
- DELETE: nao permitir no MVP

Nao usar `current_business_id()` para validar o primeiro INSERT em `businesses`, pois o negocio ainda nao existe.

## RPC `create_business_with_trial()`

O onboarding deve criar negocio e assinatura trial em uma unica operacao atomica.

A RPC deve:

- validar usuario autenticado;
- criar registro em `businesses`;
- criar assinatura `trial`;
- definir `paid_until = current_date + interval '7 days'`;
- executar tudo na mesma transacao;
- retornar o business criado e a assinatura criada, ou erro.

O sistema nao pode ficar com negocio criado sem assinatura trial correspondente.

## Storage Para Logo Da Loja

Bucket sugerido:

```text
business-logos
```

Path sugerido:

```text
{business_id}/logo.webp
```

Salvar no banco somente o caminho ou URL em `businesses.business_logo_url`.

Regras:

- Aceitar JPG, PNG e WEBP.
- Limitar tamanho do arquivo.
- Usuario so pode alterar a logo do proprio negocio.
- Nao salvar imagem binaria no Postgres.

O bucket pode ser publico no MVP, pois logo de loja nao e dado sensivel, mas upload/update/delete devem respeitar o diretorio do negocio.

Observacao importante: em `storage.objects`, `bucket_id` armazena `business-logos` e `name` armazena o caminho interno do objeto. Portanto, para a policy abaixo funcionar, o `name` deve comecar com `{business_id}`, por exemplo `{business_id}/logo.webp`. A URL publica pode conter o nome do bucket no caminho completo.

Policy de Storage para INSERT/UPDATE/DELETE:

```sql
bucket_id = 'business-logos'
and (storage.foldername(name))[1] = public.current_business_id()::text
```

## `payment_code`

`payment_requests.payment_code` deve ser unico, obrigatorio e gerado de forma segura contra concorrencia.

Formato:

```text
PCD-00001
```

Usar sequence ou funcao SQL transacional. Dois pagamentos simultaneos nao podem receber o mesmo codigo.

## Trigger De `updated_at`

Todas as tabelas com `updated_at` devem usar trigger automatica para atualizar o campo em updates.

Nao aplicar essa trigger em `ingredient_price_history`, pois ela nao possui `updated_at` e deve ser snapshot imutavel.
