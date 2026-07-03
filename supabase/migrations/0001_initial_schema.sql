create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create sequence if not exists public.payment_code_seq start 1;

create or replace function public.generate_payment_code()
returns text
language sql
volatile
set search_path = public
as $$
  select 'PCD-' || lpad(nextval('public.payment_code_seq')::text, 5, '0')
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  segment text,
  city text,
  whatsapp text,
  business_logo_url text,
  average_monthly_revenue numeric(12,2) not null default 0,
  target_monthly_revenue numeric(12,2) not null default 0,
  desired_profit_margin numeric(7,6) not null default 0.200000,
  ifood_plan text not null default 'basic',
  ifood_commission_percentage numeric(7,6) not null default 0.120000,
  ifood_payment_fee_percentage numeric(7,6) not null default 0.032000,
  ifood_receivables_advance_percentage numeric(7,6) not null default 0,
  ifood_monthly_fee numeric(12,2) not null default 0,
  ifood_paid_online_by_default boolean not null default true,
  card_fee_percentage numeric(7,6) not null default 0.039900,
  average_coupon_percentage numeric(7,6) not null default 0,
  free_delivery_percentage numeric(7,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_owner_user_id_key unique (owner_user_id),
  constraint businesses_ifood_plan_check check (ifood_plan in ('basic', 'delivery', 'custom')),
  constraint businesses_revenue_check check (average_monthly_revenue >= 0 and target_monthly_revenue >= 0),
  constraint businesses_percentages_check check (
    desired_profit_margin >= 0
    and desired_profit_margin < 1
    and ifood_commission_percentage >= 0
    and ifood_commission_percentage < 1
    and ifood_payment_fee_percentage >= 0
    and ifood_payment_fee_percentage < 1
    and ifood_receivables_advance_percentage >= 0
    and ifood_receivables_advance_percentage < 1
    and card_fee_percentage >= 0
    and card_fee_percentage < 1
    and average_coupon_percentage >= 0
    and average_coupon_percentage < 1
    and free_delivery_percentage >= 0
    and free_delivery_percentage < 1
  ),
  constraint businesses_ifood_monthly_fee_check check (ifood_monthly_fee >= 0)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null,
  status text not null,
  payment_method text not null default 'manual_pix',
  amount numeric(12,2) not null default 0,
  started_at date,
  paid_until date,
  last_payment_at timestamptz,
  external_provider text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check check (status in ('trial', 'active', 'expired', 'blocked', 'cancelled')),
  constraint subscriptions_payment_method_check check (payment_method in ('manual_pix', 'credit_card', 'mercado_pago', 'stripe', 'other')),
  constraint subscriptions_amount_check check (amount >= 0)
);

create table public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  plan text not null,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  due_date date,
  proof_url text,
  payment_code text unique not null default public.generate_payment_code(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint payment_requests_amount_check check (amount >= 0)
);

create table public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  amount numeric(12,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixed_costs_amount_check check (amount >= 0)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  supplier text,
  purchase_price numeric(12,2) not null,
  purchase_quantity numeric(12,4) not null,
  purchase_unit text not null,
  usage_unit text not null,
  correction_factor numeric(12,4) not null default 1,
  unit_cost numeric(14,6) not null,
  last_price_update date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_purchase_price_check check (purchase_price >= 0),
  constraint ingredients_purchase_quantity_check check (purchase_quantity > 0),
  constraint ingredients_correction_factor_check check (correction_factor > 0),
  constraint ingredients_unit_cost_check check (unit_cost >= 0),
  constraint ingredients_purchase_unit_check check (purchase_unit in ('kg', 'g', 'l', 'ml', 'un')),
  constraint ingredients_usage_unit_check check (usage_unit in ('kg', 'g', 'l', 'ml', 'un'))
);

create table public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  purchase_price numeric(12,2) not null,
  purchase_quantity numeric(12,4) not null,
  purchase_unit text not null,
  usage_unit text not null,
  correction_factor numeric(12,4) not null default 1,
  unit_cost numeric(14,6) not null,
  created_at timestamptz not null default now(),
  constraint ingredient_price_history_purchase_price_check check (purchase_price >= 0),
  constraint ingredient_price_history_purchase_quantity_check check (purchase_quantity > 0),
  constraint ingredient_price_history_correction_factor_check check (correction_factor > 0),
  constraint ingredient_price_history_unit_cost_check check (unit_cost >= 0),
  constraint ingredient_price_history_purchase_unit_check check (purchase_unit in ('kg', 'g', 'l', 'ml', 'un')),
  constraint ingredient_price_history_usage_unit_check check (usage_unit in ('kg', 'g', 'l', 'ml', 'un'))
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  type text not null,
  selling_price numeric(12,2) not null default 0,
  resale_unit_cost numeric(12,2) not null default 0,
  loss_percentage numeric(7,6) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_type_check check (type in ('produced', 'resale')),
  constraint products_selling_price_check check (selling_price >= 0),
  constraint products_resale_unit_cost_check check (resale_unit_cost >= 0),
  constraint products_loss_percentage_check check (loss_percentage >= 0 and loss_percentage < 1)
);

create table public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(12,4) not null,
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_ingredients_quantity_check check (quantity > 0),
  constraint product_ingredients_unit_check check (unit in ('kg', 'g', 'l', 'ml', 'un')),
  constraint product_ingredients_unique_item unique (product_id, ingredient_id)
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  selling_price numeric(12,2) not null default 0,
  loss_percentage numeric(7,6) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combos_selling_price_check check (selling_price >= 0),
  constraint combos_loss_percentage_check check (loss_percentage >= 0 and loss_percentage < 1)
);

create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,4) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combo_items_quantity_check check (quantity > 0),
  constraint combo_items_unique_item unique (combo_id, product_id)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  item_type text not null,
  item_id uuid not null,
  item_name text not null,
  quantity numeric(12,4) not null,
  unit_price numeric(12,2) not null,
  channel text not null,
  discount_percentage numeric(7,6) not null default 0,
  revenue numeric(12,2) not null,
  estimated_cost numeric(12,2) not null,
  contribution_profit numeric(12,2) not null,
  estimated_net_profit numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_item_type_check check (item_type in ('product', 'combo')),
  constraint sales_channel_check check (channel in ('whatsapp', 'ifood', 'balcao', 'other')),
  constraint sales_quantity_check check (quantity > 0),
  constraint sales_unit_price_check check (unit_price >= 0),
  constraint sales_discount_percentage_check check (discount_percentage >= 0 and discount_percentage < 1),
  constraint sales_amounts_check check (revenue >= 0 and estimated_cost >= 0)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  category text,
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_amount_check check (amount >= 0)
);

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  constraint admins_user_id_key unique (user_id),
  constraint admins_role_check check (role in ('admin', 'owner', 'support'))
);

create index businesses_owner_user_id_idx on public.businesses(owner_user_id);
create index subscriptions_business_id_idx on public.subscriptions(business_id);
create index payment_requests_business_id_idx on public.payment_requests(business_id);
create index payment_requests_subscription_id_idx on public.payment_requests(subscription_id);
create index fixed_costs_business_id_idx on public.fixed_costs(business_id);
create index ingredients_business_id_idx on public.ingredients(business_id);
create index ingredient_price_history_business_id_idx on public.ingredient_price_history(business_id);
create index ingredient_price_history_ingredient_id_idx on public.ingredient_price_history(ingredient_id);
create index products_business_id_idx on public.products(business_id);
create index product_ingredients_business_id_idx on public.product_ingredients(business_id);
create index product_ingredients_product_id_idx on public.product_ingredients(product_id);
create index product_ingredients_ingredient_id_idx on public.product_ingredients(ingredient_id);
create index combos_business_id_idx on public.combos(business_id);
create index combo_items_business_id_idx on public.combo_items(business_id);
create index combo_items_combo_id_idx on public.combo_items(combo_id);
create index combo_items_product_id_idx on public.combo_items(product_id);
create index sales_business_id_idx on public.sales(business_id);
create index expenses_business_id_idx on public.expenses(business_id);
create index admins_user_id_idx on public.admins(user_id);

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger payment_requests_updated_at before update on public.payment_requests
  for each row execute function public.set_updated_at();
create trigger fixed_costs_updated_at before update on public.fixed_costs
  for each row execute function public.set_updated_at();
create trigger ingredients_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_ingredients_updated_at before update on public.product_ingredients
  for each row execute function public.set_updated_at();
create trigger combos_updated_at before update on public.combos
  for each row execute function public.set_updated_at();
create trigger combo_items_updated_at before update on public.combo_items
  for each row execute function public.set_updated_at();
create trigger sales_updated_at before update on public.sales
  for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

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

create or replace function public.create_business_with_trial(
  p_name text,
  p_segment text default null,
  p_city text default null,
  p_whatsapp text default null,
  p_average_monthly_revenue numeric default 0,
  p_target_monthly_revenue numeric default 0,
  p_desired_profit_margin numeric default 0.2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses;
  v_subscription public.subscriptions;
begin
  if v_user_id is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if exists (select 1 from public.businesses where owner_user_id = v_user_id) then
    raise exception 'Usuario ja possui um negocio cadastrado.';
  end if;

  insert into public.businesses (
    owner_user_id,
    name,
    segment,
    city,
    whatsapp,
    average_monthly_revenue,
    target_monthly_revenue,
    desired_profit_margin
  )
  values (
    v_user_id,
    nullif(trim(p_name), ''),
    nullif(trim(coalesce(p_segment, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    coalesce(p_average_monthly_revenue, 0),
    coalesce(p_target_monthly_revenue, 0),
    coalesce(p_desired_profit_margin, 0.2)
  )
  returning * into v_business;

  insert into public.subscriptions (
    business_id,
    plan,
    status,
    payment_method,
    amount,
    started_at,
    paid_until
  )
  values (
    v_business.id,
    'trial',
    'trial',
    'manual_pix',
    0,
    current_date,
    current_date + 7
  )
  returning * into v_subscription;

  return jsonb_build_object(
    'business', to_jsonb(v_business),
    'subscription', to_jsonb(v_subscription)
  );
end;
$$;

alter table public.businesses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_requests enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_price_history enable row level security;
alter table public.products enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
alter table public.sales enable row level security;
alter table public.expenses enable row level security;
alter table public.admins enable row level security;

create policy "business owners can select their business"
on public.businesses for select
to authenticated
using (owner_user_id = auth.uid());

create policy "business owners can insert their business"
on public.businesses for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "business owners can update their business"
on public.businesses for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "users can read own admin record"
on public.admins for select
to authenticated
using (user_id = auth.uid());

create policy "tenant select subscriptions" on public.subscriptions
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert subscriptions" on public.subscriptions
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update subscriptions" on public.subscriptions
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

create policy "tenant select payment_requests" on public.payment_requests
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert payment_requests" on public.payment_requests
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update payment_requests" on public.payment_requests
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

create policy "tenant select fixed_costs" on public.fixed_costs
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert fixed_costs" on public.fixed_costs
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update fixed_costs" on public.fixed_costs
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete fixed_costs" on public.fixed_costs
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select ingredients" on public.ingredients
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert ingredients" on public.ingredients
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update ingredients" on public.ingredients
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete ingredients" on public.ingredients
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select ingredient_price_history" on public.ingredient_price_history
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert ingredient_price_history" on public.ingredient_price_history
for insert to authenticated with check (business_id = public.current_business_id());

create policy "tenant select products" on public.products
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert products" on public.products
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update products" on public.products
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete products" on public.products
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select product_ingredients" on public.product_ingredients
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert product_ingredients" on public.product_ingredients
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update product_ingredients" on public.product_ingredients
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete product_ingredients" on public.product_ingredients
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select combos" on public.combos
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert combos" on public.combos
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update combos" on public.combos
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete combos" on public.combos
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select combo_items" on public.combo_items
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert combo_items" on public.combo_items
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update combo_items" on public.combo_items
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete combo_items" on public.combo_items
for delete to authenticated using (business_id = public.current_business_id());

create policy "tenant select sales" on public.sales
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert sales" on public.sales
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update sales" on public.sales
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

create policy "tenant select expenses" on public.expenses
for select to authenticated using (business_id = public.current_business_id());
create policy "tenant insert expenses" on public.expenses
for insert to authenticated with check (business_id = public.current_business_id());
create policy "tenant update expenses" on public.expenses
for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
create policy "tenant delete expenses" on public.expenses
for delete to authenticated using (business_id = public.current_business_id());

grant execute on function public.current_business_id() to authenticated;
grant execute on function public.create_business_with_trial(
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric
) to authenticated;

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "business logos are publicly readable"
on storage.objects for select
using (bucket_id = 'business-logos');

create policy "tenant can upload own business logo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = public.current_business_id()::text
);

create policy "tenant can update own business logo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = public.current_business_id()::text
)
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = public.current_business_id()::text
);

create policy "tenant can delete own business logo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = public.current_business_id()::text
);
