-- =============================================================================
-- 0002 · Precierre de viaje + política de gastos manuales
--
-- 1. Nuevo estado `pre_closed`: el chofer entrega con el cliente final pero
--    regresa en vacío a matriz. El viaje solo se considera completo
--    (`finished`) cuando cierra en matriz.
-- 2. Política de gastos por compañía: los gastos manuales sin comprobante
--    solo se permiten según la regla configurada desde G3 Admin.
-- 3. `logbook_entries.expense_has_receipt`: marca si el gasto trae ticket
--    fotografiado (analizado por IA en la app).
-- =============================================================================

-- 1) Nuevo estado en el enum (entre unloading y finished)
alter type trip_status add value if not exists 'pre_closed' after 'unloading';

-- Timestamp del precierre
alter table trips add column if not exists pre_closed_at timestamptz;

-- 2) Política de gastos por compañía (administrada desde G3 Admin)
create table if not exists expense_policies (
  company_id           uuid primary key references companies(id) on delete cascade,
  allow_manual_expense boolean not null default true,
  -- monto máximo por gasto manual sin comprobante; null = sin tope
  manual_max_amount    numeric(12,2),
  -- si true, todo gasto (con o sin tope) exige foto de ticket
  require_receipt      boolean not null default false,
  updated_by           uuid references profiles(id),
  updated_at           timestamptz not null default now()
);

create trigger expense_policies_updated_at before update on expense_policies
for each row execute function set_updated_at();

alter table expense_policies enable row level security;

-- lectura: cualquier miembro de la compañía (el chofer necesita la regla)
create policy expense_policies_select on expense_policies
  for select using (
    company_id in (select company_id from profiles where id = auth.uid())
  );

-- escritura: solo admin / dispatcher
create policy expense_policies_upsert on expense_policies
  for all using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and company_id = expense_policies.company_id
        and role in ('admin','dispatcher')
    )
  );

-- 3) Marca de comprobante en gastos de bitácora
alter table logbook_entries
  add column if not exists expense_has_receipt boolean not null default false;

-- =============================================================================
-- RPC — advance_trip_status v2 (incluye precierre)
--   unloading  → pre_closed | finished | cancelled
--   pre_closed → finished
-- `unloading → finished` se mantiene para viajes que cierran directo en
-- destino (sin retorno en vacío).
-- =============================================================================

create or replace function advance_trip_status(p_trip_id uuid, p_next trip_status)
returns trips
language plpgsql
security definer
as $$
declare
  v_trip trips;
  v_valid boolean := false;
begin
  select * into v_trip from trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found';
  end if;

  -- el conductor solo puede mover su propio viaje
  if v_trip.driver_id <> auth.uid() then
    if not exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin','dispatcher')
    ) then
      raise exception 'not allowed';
    end if;
  end if;

  -- transiciones permitidas
  v_valid := case v_trip.status
    when 'scheduled'  then p_next in ('loading','cancelled')
    when 'loading'    then p_next in ('in_transit','cancelled')
    when 'in_transit' then p_next in ('unloading','cancelled')
    when 'unloading'  then p_next in ('pre_closed','finished','cancelled')
    when 'pre_closed' then p_next in ('finished')
    else false
  end;

  if not v_valid then
    raise exception 'invalid transition % -> %', v_trip.status, p_next;
  end if;

  update trips
     set status        = p_next,
         started_at    = coalesce(started_at, case when p_next = 'loading' then now() end),
         pre_closed_at = case when p_next = 'pre_closed' then now() else pre_closed_at end,
         finished_at   = case when p_next = 'finished' then now() else finished_at end
   where id = p_trip_id
  returning * into v_trip;

  return v_trip;
end $$;
