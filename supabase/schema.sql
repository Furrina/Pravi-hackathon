-- =====================================================================
-- State Government Infrastructure Asset Management System
-- Schema / migration script for Supabase PostgreSQL
-- Run this file in the Supabase SQL Editor BEFORE seed.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. Enumerated types
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lifecycle_status') then
    create type public.lifecycle_status as enum (
      'Planned',
      'Under Construction',
      'Operational',
      'Under Maintenance',
      'Retired',
      'Decommissioned'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'condition_rating') then
    create type public.condition_rating as enum (
      'Excellent',
      'Good',
      'Fair',
      'Poor',
      'Critical'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'maintenance_status') then
    create type public.maintenance_status as enum (
      'Scheduled',
      'In Progress',
      'Completed'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 2. Reference tables
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  description text
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null,
  role_id    smallint not null references public.roles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table if not exists public.districts (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  state text not null default 'Gujarat'
);

-- attribute_schema describes the class-specific fields rendered by the UI:
-- [{ "key": "lanes", "label": "Number of Lanes", "type": "number", "required": true }]
-- supported types: text | number | boolean | select (with "options": [...])
create table if not exists public.asset_classes (
  id               uuid primary key default gen_random_uuid(),
  department_id    uuid not null references public.departments (id) on delete restrict,
  code             text not null unique,
  name             text not null,
  attribute_schema jsonb not null default '[]'::jsonb
);

-- ---------------------------------------------------------------------
-- 3. Core asset tables
-- ---------------------------------------------------------------------
create table if not exists public.assets (
  id                      uuid primary key default gen_random_uuid(),
  asset_code              text not null unique,                       -- human readable Asset ID
  name                    text not null,
  department_id           uuid not null references public.departments (id)   on delete restrict,
  asset_class_id          uuid not null references public.asset_classes (id) on delete restrict,
  district_id             uuid not null references public.districts (id)     on delete restrict,
  location                text,
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  lifecycle_status        public.lifecycle_status not null default 'Planned',
  condition               public.condition_rating not null default 'Good',
  commissioned_on         date,                                        -- construction / acquisition date
  expected_lifetime_years integer,
  cost                    numeric(16,2),
  responsible_officer     text,
  description             text,
  created_by              uuid references public.profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- class-specific attributes, stored flexibly (one row per asset)
create table if not exists public.asset_attributes (
  asset_id   uuid primary key references public.assets (id) on delete cascade,
  attributes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.lifecycle_events (
  id              uuid primary key default gen_random_uuid(),
  asset_id        uuid not null references public.assets (id) on delete cascade,
  event_type      text not null,                                     -- Registered | Status Change
  previous_status public.lifecycle_status,
  new_status      public.lifecycle_status not null,
  remarks         text,
  performed_by    uuid references public.profiles (id) on delete set null,
  performed_by_name text,
  occurred_at     timestamptz not null default now()
);

create table if not exists public.inspections (
  id                 uuid primary key default gen_random_uuid(),
  asset_id           uuid not null references public.assets (id) on delete cascade,
  inspected_on       date not null default current_date,
  condition          public.condition_rating not null,
  notes              text,
  recommended_action text,
  inspector_id       uuid references public.profiles (id) on delete set null,
  inspector_name     text,
  created_at         timestamptz not null default now()
);

create table if not exists public.maintenance_records (
  id                    uuid primary key default gen_random_uuid(),
  asset_id              uuid not null references public.assets (id) on delete cascade,
  status                public.maintenance_status not null default 'Scheduled',
  assigned_officer      text,
  start_date            date,
  end_date              date,
  cost                  numeric(16,2),
  description           text,
  next_maintenance_date date,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text not null,
  action      text not null,         -- ASSET_CREATED, ASSET_UPDATED, LIFECYCLE_CHANGED, ...
  entity_type text not null,         -- asset | inspection | maintenance
  entity_id   uuid,
  asset_id    uuid references public.assets (id) on delete set null,
  asset_code  text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Indexes on commonly filtered columns
-- ---------------------------------------------------------------------
create index if not exists idx_assets_asset_code       on public.assets (asset_code);
create index if not exists idx_assets_name             on public.assets (name);
create index if not exists idx_assets_department       on public.assets (department_id);
create index if not exists idx_assets_class            on public.assets (asset_class_id);
create index if not exists idx_assets_district         on public.assets (district_id);
create index if not exists idx_assets_lifecycle        on public.assets (lifecycle_status);
create index if not exists idx_assets_condition        on public.assets (condition);

create index if not exists idx_asset_classes_dept      on public.asset_classes (department_id);
create index if not exists idx_lifecycle_events_asset  on public.lifecycle_events (asset_id, occurred_at desc);
create index if not exists idx_inspections_asset       on public.inspections (asset_id, inspected_on desc);
create index if not exists idx_maintenance_asset       on public.maintenance_records (asset_id, created_at desc);
create index if not exists idx_maintenance_status      on public.maintenance_records (status);
create index if not exists idx_maintenance_next_date   on public.maintenance_records (next_maintenance_date);
create index if not exists idx_audit_logs_created      on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_asset        on public.audit_logs (asset_id);

-- ---------------------------------------------------------------------
-- 5. updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
  before update on public.assets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_asset_attributes_updated_at on public.asset_attributes;
create trigger trg_asset_attributes_updated_at
  before update on public.asset_attributes
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_maintenance_updated_at on public.maintenance_records;
create trigger trg_maintenance_updated_at
  before update on public.maintenance_records
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 6. Roles + automatic profile creation for new auth users
-- ---------------------------------------------------------------------
insert into public.roles (name, description) values
  ('Administrator', 'Full access: may register and edit assets'),
  ('Officer',       'Field officer: may record lifecycle changes, inspections and maintenance')
on conflict (name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_role text;
  resolved_role smallint;
begin
  wanted_role := coalesce(new.raw_user_meta_data ->> 'role', 'Officer');

  select id into resolved_role from public.roles where name = wanted_role;
  if resolved_role is null then
    select id into resolved_role from public.roles where name = 'Officer';
  end if;

  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    resolved_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 7. Helper functions used by RLS policies
-- ---------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'Administrator', false);
$$;

-- ---------------------------------------------------------------------
-- 8. Dashboard helper view
-- ---------------------------------------------------------------------
drop view if exists public.asset_counts_by_department;
create view public.asset_counts_by_department
with (security_invoker = true) as
  select d.id            as department_id,
         d.name          as department_name,
         count(a.id)::int as asset_count
  from public.departments d
  left join public.assets a on a.department_id = d.id
  group by d.id, d.name;

grant select on public.asset_counts_by_department to authenticated;

-- ---------------------------------------------------------------------
-- 9. Row Level Security
--    Every signed-in government employee may read the registry.
--    Writes are limited; asset REGISTRATION is Administrator-only.
--    Audit logs are append-only (no update/delete policy exists).
-- ---------------------------------------------------------------------
alter table public.roles               enable row level security;
alter table public.profiles            enable row level security;
alter table public.departments         enable row level security;
alter table public.districts           enable row level security;
alter table public.asset_classes       enable row level security;
alter table public.assets              enable row level security;
alter table public.asset_attributes    enable row level security;
alter table public.lifecycle_events    enable row level security;
alter table public.inspections         enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.audit_logs          enable row level security;

-- read-only reference data
drop policy if exists read_roles on public.roles;
create policy read_roles on public.roles
  for select to authenticated using (true);

drop policy if exists read_profiles on public.profiles;
create policy read_profiles on public.profiles
  for select to authenticated using (true);

drop policy if exists read_departments on public.departments;
create policy read_departments on public.departments
  for select to authenticated using (true);

drop policy if exists read_districts on public.districts;
create policy read_districts on public.districts
  for select to authenticated using (true);

drop policy if exists read_asset_classes on public.asset_classes;
create policy read_asset_classes on public.asset_classes
  for select to authenticated using (true);

-- assets: everyone reads, only Administrators register new assets
drop policy if exists read_assets on public.assets;
create policy read_assets on public.assets
  for select to authenticated using (true);

drop policy if exists insert_assets on public.assets;
create policy insert_assets on public.assets
  for insert to authenticated with check (public.is_administrator());

-- officers legitimately update lifecycle_status / condition, so UPDATE stays open
-- to authenticated users; editing the full asset record is blocked in the
-- application layer (see src/lib/auth.ts -> canManageAssets).
drop policy if exists update_assets on public.assets;
create policy update_assets on public.assets
  for update to authenticated using (true) with check (true);

drop policy if exists rw_asset_attributes on public.asset_attributes;
create policy rw_asset_attributes on public.asset_attributes
  for all to authenticated using (true) with check (true);

drop policy if exists read_lifecycle_events on public.lifecycle_events;
create policy read_lifecycle_events on public.lifecycle_events
  for select to authenticated using (true);

drop policy if exists insert_lifecycle_events on public.lifecycle_events;
create policy insert_lifecycle_events on public.lifecycle_events
  for insert to authenticated with check (true);

drop policy if exists read_inspections on public.inspections;
create policy read_inspections on public.inspections
  for select to authenticated using (true);

drop policy if exists insert_inspections on public.inspections;
create policy insert_inspections on public.inspections
  for insert to authenticated with check (true);

drop policy if exists read_maintenance on public.maintenance_records;
create policy read_maintenance on public.maintenance_records
  for select to authenticated using (true);

drop policy if exists insert_maintenance on public.maintenance_records;
create policy insert_maintenance on public.maintenance_records
  for insert to authenticated with check (true);

drop policy if exists update_maintenance on public.maintenance_records;
create policy update_maintenance on public.maintenance_records
  for update to authenticated using (true) with check (true);

-- audit log: readable and append-only. No UPDATE or DELETE policy is defined,
-- therefore no client can ever modify or remove an audit record.
drop policy if exists read_audit_logs on public.audit_logs;
create policy read_audit_logs on public.audit_logs
  for select to authenticated using (true);

drop policy if exists insert_audit_logs on public.audit_logs;
create policy insert_audit_logs on public.audit_logs
  for insert to authenticated with check (actor_id = auth.uid());
