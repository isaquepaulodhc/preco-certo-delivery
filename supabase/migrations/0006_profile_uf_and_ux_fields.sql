alter table public.businesses
  add column if not exists state_uf text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.businesses'::regclass
      and conname = 'businesses_state_uf_check'
  ) then
    alter table public.businesses
      add constraint businesses_state_uf_check
      check (
        state_uf is null
        or state_uf in (
          'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
          'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
          'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        )
      );
  end if;
end;
$$;
