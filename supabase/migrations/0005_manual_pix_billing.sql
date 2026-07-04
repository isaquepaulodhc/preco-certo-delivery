create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
      and role in ('admin', 'owner', 'support')
  )
$$;

alter table public.payment_requests
  add column if not exists requested_by uuid references auth.users(id),
  add column if not exists canceled_by uuid references auth.users(id),
  add column if not exists canceled_at timestamptz;

update public.payment_requests pr
set requested_by = b.owner_user_id
from public.businesses b
where pr.business_id = b.id
  and pr.requested_by is null;

alter table public.payment_requests
  alter column requested_by set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payment_requests'::regclass
      and conname = 'payment_requests_plan_check'
  ) then
    alter table public.payment_requests
      add constraint payment_requests_plan_check
      check (plan in ('essential', 'pro', 'management'));
  end if;
end;
$$;

create unique index if not exists payment_requests_one_pending_per_business_idx
on public.payment_requests (business_id)
where status = 'pending';

drop policy if exists "tenant insert payment_requests" on public.payment_requests;
drop policy if exists "tenant update payment_requests" on public.payment_requests;

create policy "admins can select businesses"
on public.businesses for select
to authenticated
using (public.is_admin());

create policy "admins can select payment_requests"
on public.payment_requests for select
to authenticated
using (public.is_admin());

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
    when 'essential' then 'Essencial'
    when 'pro' then 'Pro'
    when 'management' then 'Gestao'
    else null
  end;

  v_amount := case p_plan_code
    when 'essential' then 39
    when 'pro' then 79
    when 'management' then 149
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

  select *
  into v_subscription
  from public.subscriptions
  where business_id = v_request.business_id
  order by created_at desc
  limit 1
  for update;

  if v_subscription.id is not null
    and v_subscription.status in ('trial', 'active')
    and v_subscription.paid_until is not null
    and v_subscription.paid_until >= current_date
  then
    v_new_paid_until := v_subscription.paid_until + 30;
  else
    v_new_paid_until := current_date + 30;
  end if;

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

create or replace function public.cancel_payment_request(
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
    raise exception 'Apenas solicitacoes pendentes podem ser canceladas.';
  end if;

  update public.payment_requests
  set
    status = 'cancelled',
    canceled_by = v_user_id,
    canceled_at = now()
  where id = v_request.id
  returning * into v_request;

  return jsonb_build_object('payment_request', to_jsonb(v_request));
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.create_manual_pix_payment_request(text) to authenticated;
grant execute on function public.approve_payment_request(uuid) to authenticated;
grant execute on function public.cancel_payment_request(uuid) to authenticated;
