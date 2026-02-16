-- Idempotent schema for frontend profile management.
-- Safe to run multiple times across server/local environments.

create extension if not exists pgcrypto;

create table if not exists public.org_units (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    ai_identity_base text not null default '',
    created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    org_unit uuid references public.org_units(id) on delete set null,
    app_role text not null default 'user',
    ai_identity_user text not null default '',
    ai_identity_mode text not null default 'APPEND',
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint user_profiles_ai_identity_mode_check check (
        ai_identity_mode in ('APPEND', 'REPLACE')
    )
);

create index if not exists idx_user_profiles_org_unit
    on public.user_profiles (org_unit);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.org_units enable row level security;
alter table public.user_profiles enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'org_units'
          and policyname = 'org_units_select_authenticated'
    ) then
        create policy org_units_select_authenticated
            on public.org_units
            for select
            to authenticated
            using (true);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_profiles'
          and policyname = 'user_profiles_select_own'
    ) then
        create policy user_profiles_select_own
            on public.user_profiles
            for select
            to authenticated
            using (auth.uid() = id);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_profiles'
          and policyname = 'user_profiles_insert_own'
    ) then
        create policy user_profiles_insert_own
            on public.user_profiles
            for insert
            to authenticated
            with check (auth.uid() = id);
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_profiles'
          and policyname = 'user_profiles_update_own'
    ) then
        create policy user_profiles_update_own
            on public.user_profiles
            for update
            to authenticated
            using (auth.uid() = id)
            with check (auth.uid() = id);
    end if;
end
$$;

grant usage on schema public to authenticated;
grant select on table public.org_units to authenticated;
grant select, insert, update on table public.user_profiles to authenticated;
grant all on table public.org_units to service_role;
grant all on table public.user_profiles to service_role;

insert into public.org_units (name, ai_identity_base)
values ('Default', 'Default organizational context')
on conflict (name) do nothing;

insert into public.user_profiles (id)
select id
from auth.users
on conflict (id) do nothing;
