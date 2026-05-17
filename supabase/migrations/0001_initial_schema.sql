-- =============================================================================
-- G3 Logistics — Initial schema
-- =============================================================================
-- Aplica con: supabase db push  (o psql contra la URL del proyecto)

create extension if not exists "pgcrypto";
-- create extension if not exists "postgis";  -- opcional; descomenta si se usan coords

-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role         as enum ('driver', 'dispatcher', 'admin');
create type profile_status    as enum ('active', 'suspended', 'pending');
create type trip_status       as enum ('scheduled','loading','in_transit','unloading','finished','cancelled');
create type logbook_event     as enum ('departure','loading','stop','toll','diesel','incident','arrival','unloading','closing');
create type fuel_level        as enum ('full','three_quarters','half','quarter','empty');
create type incident_type     as enum ('mechanical','checkpoint','accident','delay_loading','delay_unloading','client_issue','theft_attempt','other');
create type incident_urgency  as enum ('low','medium','high','critical');
create type evidence_type     as enum ('bill_of_lading','scale_ticket','loading_photo','unloading_photo','diesel_ticket','toll_ticket','delivery_proof','other');

-- =============================================================================
-- TABLAS
-- =============================================================================

create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rfc         text,
  created_at  timestamptz not null default now()
);

create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  company_id           uuid references companies(id),
  role                 user_role       not null default 'driver',
  full_name            text            not null,
  phone                text,
  email                text,
  federal_license      text,
  license_expires_at   date,
  assigned_unit_number text,
  unit_type            text,
  tractor_plates       text,
  trailer_plates       text,
  status               profile_status  not null default 'pending',
  photo_url            text,
  created_at           timestamptz     not null default now(),
  updated_at           timestamptz     not null default now()
);

create table trips (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references companies(id),
  driver_id              uuid references profiles(id),
  folio                  text unique not null,
  client_name            text not null,
  cargo                  text,
  origin                 text not null,
  destination            text not null,
  load_date              timestamptz,
  estimated_unload_date  timestamptz,
  tons                   numeric(10,2),
  price_per_ton          numeric(10,2),
  total_amount           numeric(12,2),
  driver_commission      numeric(12,2),
  estimated_tolls        numeric(10,2),
  estimated_diesel       numeric(10,2),
  status                 trip_status not null default 'scheduled',
  notes                  text,
  started_at             timestamptz,
  finished_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table logbook_entries (
  id              uuid primary key default gen_random_uuid(),
  client_uuid     uuid unique,                          -- idempotencia offline
  trip_id         uuid not null references trips(id) on delete cascade,
  driver_id       uuid not null references profiles(id),
  event_type      logbook_event not null,
  occurred_at     timestamptz not null default now(),
  location_text   text,
  lat             double precision,
  lng             double precision,
  odometer_km     integer,
  fuel            fuel_level,
  expense_amount  numeric(10,2),
  expense_concept text,
  comments        text,
  created_at      timestamptz not null default now()
);

create table incidents (
  id            uuid primary key default gen_random_uuid(),
  client_uuid   uuid unique,
  trip_id       uuid references trips(id) on delete cascade,
  driver_id     uuid not null references profiles(id),
  type          incident_type not null,
  description   text not null,
  occurred_at   timestamptz not null default now(),
  location_text text,
  lat           double precision,
  lng           double precision,
  urgency       incident_urgency not null default 'medium',
  resolved      boolean not null default false,
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table evidences (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips(id) on delete cascade,
  logbook_id   uuid references logbook_entries(id) on delete cascade,
  incident_id  uuid references incidents(id) on delete cascade,
  driver_id    uuid not null references profiles(id),
  type         evidence_type not null,
  storage_path text not null,
  mime_type    text,
  size_bytes   integer,
  lat          double precision,
  lng          double precision,
  taken_at     timestamptz,
  created_at   timestamptz not null default now(),
  constraint evidence_belongs_to_something
    check (trip_id is not null or logbook_id is not null or incident_id is not null)
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================

create index trips_driver_status_idx      on trips(driver_id, status);
create index trips_company_loaddate_idx   on trips(company_id, load_date desc);
create index logbook_trip_time_idx        on logbook_entries(trip_id, occurred_at);
create index incidents_trip_idx           on incidents(trip_id);
create index evidences_trip_idx           on evidences(trip_id);
create index evidences_logbook_idx        on evidences(logbook_id);
create index evidences_incident_idx       on evidences(incident_id);

-- =============================================================================
-- TRIGGERS — updated_at
-- =============================================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated_at before update on profiles
for each row execute function set_updated_at();

create trigger trips_updated_at before update on trips
for each row execute function set_updated_at();

-- =============================================================================
-- RPC — advance_trip_status (valida transiciones)
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
    when 'unloading'  then p_next in ('finished','cancelled')
    else false
  end;

  if not v_valid then
    raise exception 'invalid transition % -> %', v_trip.status, p_next;
  end if;

  update trips
     set status      = p_next,
         started_at  = coalesce(started_at, case when p_next = 'loading' then now() end),
         finished_at = case when p_next = 'finished' then now() else finished_at end
   where id = p_trip_id
  returning * into v_trip;

  return v_trip;
end $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table companies        enable row level security;
alter table profiles         enable row level security;
alter table trips            enable row level security;
alter table logbook_entries  enable row level security;
alter table incidents        enable row level security;
alter table evidences        enable row level security;

-- helper: ¿soy admin/dispatcher?
create or replace function is_staff()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','dispatcher')
  );
$$;

-- helper: mi company_id
create or replace function my_company()
returns uuid language sql stable as $$
  select company_id from profiles where id = auth.uid();
$$;

-- profiles -----------------------------------------------------------------
create policy "own profile read"        on profiles for select using (id = auth.uid());
create policy "staff read company"      on profiles for select using (is_staff() and company_id = my_company());
create policy "own profile update"      on profiles for update using (id = auth.uid());
create policy "staff update company"    on profiles for update using (is_staff() and company_id = my_company());
create policy "staff insert"            on profiles for insert with check (is_staff() and company_id = my_company());

-- companies ----------------------------------------------------------------
create policy "members read company"    on companies for select using (id = my_company());

-- trips --------------------------------------------------------------------
create policy "driver reads own trips"  on trips for select using (driver_id = auth.uid());
create policy "staff reads company trips" on trips for select using (is_staff() and company_id = my_company());
create policy "staff writes trips"      on trips for all     using (is_staff() and company_id = my_company()) with check (is_staff() and company_id = my_company());

-- logbook ------------------------------------------------------------------
create policy "driver inserts logbook"  on logbook_entries for insert
  with check (driver_id = auth.uid() and exists (select 1 from trips where id = trip_id and driver_id = auth.uid()));
create policy "driver reads own logbook" on logbook_entries for select using (driver_id = auth.uid());
create policy "staff reads company logbook" on logbook_entries for select
  using (is_staff() and exists (select 1 from trips where id = trip_id and company_id = my_company()));

-- incidents ----------------------------------------------------------------
create policy "driver writes own incidents" on incidents for all
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy "staff reads company incidents" on incidents for select
  using (is_staff() and exists (select 1 from trips where id = trip_id and company_id = my_company()));
create policy "staff resolves incidents" on incidents for update
  using (is_staff()) with check (is_staff());

-- evidences ----------------------------------------------------------------
create policy "driver writes own evidences" on evidences for all
  using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy "staff reads company evidences" on evidences for select
  using (is_staff() and exists (
    select 1 from trips t where t.id = evidences.trip_id and t.company_id = my_company()
  ));

-- =============================================================================
-- STORAGE BUCKETS (privados)
-- =============================================================================
-- Se crean por SQL (Supabase). Bucket "evidences" y "avatars".

insert into storage.buckets (id, name, public)
values
  ('evidences', 'evidences', false),
  ('avatars',   'avatars',   false)
on conflict (id) do nothing;

-- Policies de storage:
create policy "driver uploads own evidence"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidences'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "driver reads own evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidences'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users manage own avatar"
  on storage.objects for all to authenticated
  using   (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
