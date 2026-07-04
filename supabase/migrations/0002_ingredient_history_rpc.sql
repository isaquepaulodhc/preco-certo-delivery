create or replace function public.convert_ingredient_quantity(
  p_quantity numeric,
  p_from_unit text,
  p_to_unit text
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_from_group text;
  v_to_group text;
  v_from_factor numeric;
  v_to_factor numeric;
begin
  if p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero.';
  end if;

  v_from_group := case
    when p_from_unit in ('kg', 'g') then 'mass'
    when p_from_unit in ('l', 'ml') then 'volume'
    when p_from_unit = 'un' then 'unit'
    else null
  end;

  v_to_group := case
    when p_to_unit in ('kg', 'g') then 'mass'
    when p_to_unit in ('l', 'ml') then 'volume'
    when p_to_unit = 'un' then 'unit'
    else null
  end;

  if v_from_group is null or v_to_group is null or v_from_group <> v_to_group then
    raise exception 'Unidades incompativeis.';
  end if;

  v_from_factor := case p_from_unit
    when 'kg' then 1000
    when 'g' then 1
    when 'l' then 1000
    when 'ml' then 1
    when 'un' then 1
  end;

  v_to_factor := case p_to_unit
    when 'kg' then 1000
    when 'g' then 1
    when 'l' then 1000
    when 'ml' then 1
    when 'un' then 1
  end;

  return (p_quantity * v_from_factor) / v_to_factor;
end;
$$;

create or replace function public.save_ingredient_with_history(
  p_ingredient_id uuid default null,
  p_name text default null,
  p_category text default null,
  p_supplier text default null,
  p_purchase_price numeric default 0,
  p_purchase_quantity numeric default 0,
  p_purchase_unit text default 'un',
  p_usage_unit text default 'un',
  p_correction_factor numeric default 1,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_existing public.ingredients;
  v_ingredient public.ingredients;
  v_history public.ingredient_price_history;
  v_converted_quantity numeric;
  v_unit_cost numeric;
  v_price_fields_changed boolean := true;
begin
  if v_business_id is null then
    raise exception 'Negocio do usuario autenticado nao encontrado.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Nome do ingrediente e obrigatorio.';
  end if;

  if p_purchase_price < 0 then
    raise exception 'Preco de compra deve ser maior ou igual a zero.';
  end if;

  if p_purchase_quantity <= 0 then
    raise exception 'Quantidade comprada deve ser maior que zero.';
  end if;

  if p_correction_factor <= 0 then
    raise exception 'Fator de correcao deve ser maior que zero.';
  end if;

  v_converted_quantity := public.convert_ingredient_quantity(
    p_purchase_quantity,
    p_purchase_unit,
    p_usage_unit
  );
  v_unit_cost := (p_purchase_price * p_correction_factor) / v_converted_quantity;

  if p_ingredient_id is null then
    insert into public.ingredients (
      business_id,
      name,
      category,
      supplier,
      purchase_price,
      purchase_quantity,
      purchase_unit,
      usage_unit,
      correction_factor,
      unit_cost,
      last_price_update,
      active
    )
    values (
      v_business_id,
      trim(p_name),
      nullif(trim(coalesce(p_category, '')), ''),
      nullif(trim(coalesce(p_supplier, '')), ''),
      p_purchase_price,
      p_purchase_quantity,
      p_purchase_unit,
      p_usage_unit,
      p_correction_factor,
      v_unit_cost,
      current_date,
      p_active
    )
    returning * into v_ingredient;
  else
    select *
    into v_existing
    from public.ingredients
    where id = p_ingredient_id
      and business_id = v_business_id
    for update;

    if not found then
      raise exception 'Ingrediente nao encontrado.';
    end if;

    v_price_fields_changed :=
      v_existing.purchase_price is distinct from p_purchase_price
      or v_existing.purchase_quantity is distinct from p_purchase_quantity
      or v_existing.purchase_unit is distinct from p_purchase_unit
      or v_existing.usage_unit is distinct from p_usage_unit
      or v_existing.correction_factor is distinct from p_correction_factor;

    update public.ingredients
    set
      name = trim(p_name),
      category = nullif(trim(coalesce(p_category, '')), ''),
      supplier = nullif(trim(coalesce(p_supplier, '')), ''),
      purchase_price = p_purchase_price,
      purchase_quantity = p_purchase_quantity,
      purchase_unit = p_purchase_unit,
      usage_unit = p_usage_unit,
      correction_factor = p_correction_factor,
      unit_cost = v_unit_cost,
      last_price_update = case
        when v_price_fields_changed then current_date
        else last_price_update
      end,
      active = p_active
    where id = p_ingredient_id
      and business_id = v_business_id
    returning * into v_ingredient;
  end if;

  if v_price_fields_changed then
    insert into public.ingredient_price_history (
      ingredient_id,
      business_id,
      purchase_price,
      purchase_quantity,
      purchase_unit,
      usage_unit,
      correction_factor,
      unit_cost
    )
    values (
      v_ingredient.id,
      v_business_id,
      v_ingredient.purchase_price,
      v_ingredient.purchase_quantity,
      v_ingredient.purchase_unit,
      v_ingredient.usage_unit,
      v_ingredient.correction_factor,
      v_ingredient.unit_cost
    )
    returning * into v_history;
  end if;

  return jsonb_build_object(
    'ingredient', to_jsonb(v_ingredient),
    'history_created', v_price_fields_changed,
    'history', case when v_price_fields_changed then to_jsonb(v_history) else null end
  );
end;
$$;

grant execute on function public.convert_ingredient_quantity(numeric, text, text) to authenticated;
grant execute on function public.save_ingredient_with_history(
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  numeric,
  boolean
) to authenticated;
