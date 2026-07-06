alter table public.ingredients
  add column if not exists deleted_at timestamptz;

alter table public.products
  add column if not exists image_url text,
  add column if not exists deleted_at timestamptz;

alter table public.combos
  add column if not exists image_url text,
  add column if not exists deleted_at timestamptz;

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu images are publicly readable" on storage.objects;
drop policy if exists "tenant can upload own menu images" on storage.objects;
drop policy if exists "tenant can update own menu images" on storage.objects;
drop policy if exists "tenant can delete own menu images" on storage.objects;

create policy "menu images are publicly readable"
on storage.objects for select
using (bucket_id = 'menu-images');

create policy "tenant can upload own menu images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in ('products', 'combos')
  and (storage.foldername(name))[2] = public.current_business_id()::text
);

create policy "tenant can update own menu images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in ('products', 'combos')
  and (storage.foldername(name))[2] = public.current_business_id()::text
)
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in ('products', 'combos')
  and (storage.foldername(name))[2] = public.current_business_id()::text
);

create policy "tenant can delete own menu images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in ('products', 'combos')
  and (storage.foldername(name))[2] = public.current_business_id()::text
);

create or replace function public.create_manual_pix_payment_request(
  p_plan_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_subscription_id uuid;
  v_plan_name text;
  v_amount numeric(12,2);
  v_pending public.payment_requests;
  v_request public.payment_requests;
begin
  if v_user_id is null then
    raise exception 'Usuario autenticado e obrigatorio.';
  end if;

  if v_business_id is null then
    raise exception 'Negocio do usuario autenticado nao encontrado.';
  end if;

  select *
  into v_pending
  from public.payment_requests
  where business_id = v_business_id
    and status = 'pending'
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'payment_request', to_jsonb(v_pending),
      'was_existing', true
    );
  end if;

  v_plan_name := case p_plan_code
    when 'essential' then 'Essencial Mensal'
    when 'pro' then 'Pro Trimestral'
    when 'management' then 'Gestao Semestral'
    else null
  end;

  v_amount := case p_plan_code
    when 'essential' then 77
    when 'pro' then 87
    when 'management' then 97
    else null
  end;

  if v_plan_name is null or v_amount is null then
    raise exception 'Plano invalido.';
  end if;

  select id
  into v_subscription_id
  from public.subscriptions
  where business_id = v_business_id
  order by created_at desc
  limit 1;

  insert into public.payment_requests (
    business_id,
    subscription_id,
    plan,
    amount,
    status,
    requested_by
  )
  values (
    v_business_id,
    v_subscription_id,
    p_plan_code,
    v_amount,
    'pending',
    v_user_id
  )
  returning * into v_request;

  return jsonb_build_object(
    'payment_request', to_jsonb(v_request),
    'plan_name', v_plan_name,
    'was_existing', false
  );
end;
$$;

create or replace function public.approve_payment_request(
  p_payment_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.payment_requests;
  v_subscription public.subscriptions;
  v_duration_days integer;
  v_base_paid_until date;
  v_new_paid_until date;
begin
  if v_user_id is null or not public.is_admin() then
    raise exception 'Acesso administrativo obrigatorio.';
  end if;

  select *
  into v_request
  from public.payment_requests
  where id = p_payment_request_id
  for update;

  if not found then
    raise exception 'Solicitacao de pagamento nao encontrada.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Apenas solicitacoes pendentes podem ser aprovadas.';
  end if;

  v_duration_days := case v_request.plan
    when 'essential' then 30
    when 'pro' then 90
    when 'management' then 180
    else null
  end;

  if v_duration_days is null then
    raise exception 'Plano invalido.';
  end if;

  select *
  into v_subscription
  from public.subscriptions
  where business_id = v_request.business_id
  order by created_at desc
  limit 1
  for update;

  v_base_paid_until := greatest(
    current_date,
    coalesce(v_subscription.paid_until, current_date)
  );
  v_new_paid_until := v_base_paid_until + v_duration_days;

  if v_subscription.id is null then
    insert into public.subscriptions (
      business_id,
      plan,
      status,
      payment_method,
      amount,
      started_at,
      paid_until,
      last_payment_at
    )
    values (
      v_request.business_id,
      v_request.plan,
      'active',
      'manual_pix',
      v_request.amount,
      current_date,
      v_new_paid_until,
      now()
    )
    returning * into v_subscription;
  else
    update public.subscriptions
    set
      plan = v_request.plan,
      status = 'active',
      payment_method = 'manual_pix',
      amount = v_request.amount,
      started_at = coalesce(started_at, current_date),
      paid_until = v_new_paid_until,
      last_payment_at = now()
    where id = v_subscription.id
    returning * into v_subscription;
  end if;

  update public.payment_requests
  set
    status = 'approved',
    approved_by = v_user_id,
    approved_at = now(),
    subscription_id = v_subscription.id
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object(
    'payment_request', to_jsonb(v_request),
    'subscription', to_jsonb(v_subscription)
  );
end;
$$;
