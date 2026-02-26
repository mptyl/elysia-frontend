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

-- ============================================================
-- Migration: structured profile fields
-- ============================================================

-- New directory-service fields (read-only, synced from Entra/emulator)
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS job_title TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT;

-- Backfill display_name from auth.users metadata for existing profiles
UPDATE public.user_profiles p
   SET display_name = COALESCE(u.raw_user_meta_data->>'Display Name', u.raw_user_meta_data->>'full_name')
  FROM auth.users u
 WHERE p.id = u.id
   AND p.display_name IS NULL;

-- New communication preference fields
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS response_detail_level TEXT NOT NULL DEFAULT 'balanced'
        CHECK (response_detail_level IN ('executive_summary', 'balanced', 'operational_detail')),
    ADD COLUMN IF NOT EXISTS communication_tone TEXT NOT NULL DEFAULT 'professional'
        CHECK (communication_tone IN ('formal', 'professional', 'direct')),
    ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'it'
        CHECK (preferred_language IN ('it', 'en')),
    ADD COLUMN IF NOT EXISTS response_focus TEXT NOT NULL DEFAULT 'technical'
        CHECK (response_focus IN ('normative', 'managerial', 'technical', 'relational')),
    ADD COLUMN IF NOT EXISTS custom_instructions TEXT NOT NULL DEFAULT '';

-- Migrate existing data
UPDATE public.user_profiles
    SET custom_instructions = ai_identity_user
    WHERE ai_identity_user IS NOT NULL AND ai_identity_user != '';

-- Remove old fields
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS ai_identity_user;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS ai_identity_mode;

-- Drop old constraint (may fail silently if not present)
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_ai_identity_mode_check;

-- ============================================================
-- Role standard instructions (per department/job_title)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_standard_instructions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department text NOT NULL,
    job_title text NOT NULL,
    instructions text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(department, job_title)
);

ALTER TABLE public.role_standard_instructions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'role_standard_instructions'
          AND policyname = 'role_std_instr_select_auth'
    ) THEN
        CREATE POLICY role_std_instr_select_auth
            ON public.role_standard_instructions
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

GRANT SELECT ON public.role_standard_instructions TO authenticated;
GRANT ALL ON public.role_standard_instructions TO service_role;

DROP TRIGGER IF EXISTS trg_role_std_instr_updated_at ON public.role_standard_instructions;
CREATE TRIGGER trg_role_std_instr_updated_at
BEFORE UPDATE ON public.role_standard_instructions
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Custom instructions mode on user_profiles
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS custom_instructions_mode text NOT NULL DEFAULT 'append'
        CHECK (custom_instructions_mode IN ('append', 'override'));

-- Seed standard instructions for each department/job_title combination
INSERT INTO public.role_standard_instructions (department, job_title, instructions) VALUES
('DGE', 'Responsabile Direzione Generale',
 'Rispondi con prospettiva strategica e di governance. Enfatizza impatti organizzativi, rischi e opportunità. Fornisci sintesi decisionali con raccomandazioni chiare. Considera sempre le implicazioni inter-dipartimentali e i vincoli normativi di alto livello.'),
('AFC', 'Addetta/o Amministrazione, Finanza e Controllo',
 'Concentrati su aspetti contabili, finanziari e di controllo di gestione. Cita riferimenti normativi fiscali e contabili quando rilevante. Fornisci dati e analisi quantitative. Evidenzia impatti sul bilancio e sulla compliance finanziaria.'),
('IES', 'Technical Project Manager',
 'Fornisci risposte orientate alla gestione progettuale e tecnica. Includi riferimenti a metodologie di project management. Evidenzia dipendenze, rischi tecnici e milestone. Suggerisci approcci strutturati per la pianificazione e il monitoraggio.'),
('IES', 'Funzionario/a Tecnico/a Attività Normative',
 'Concentrati su aspetti normativi e regolamentari tecnici. Cita riferimenti a norme, standard e regolamenti applicabili. Fornisci analisi di conformità e gap analysis. Evidenzia scadenze normative e obblighi di adeguamento.'),
('CEM', 'Responsabile Comunicazione e Coordinamento',
 'Adotta un approccio orientato alla comunicazione efficace e al coordinamento stakeholder. Suggerisci strategie comunicative e di engagement. Considera il pubblico target e il tono appropriato. Enfatizza chiarezza, coerenza del messaggio e tempistiche.'),
('DIT', 'Responsabile Trasformazione Digitale',
 'Rispondi con focus su innovazione digitale e trasformazione tecnologica. Considera architetture IT, integrazione sistemi e roadmap digitali. Evidenzia best practice di digitalizzazione e change management tecnologico. Valuta impatti su processi e competenze digitali.')
ON CONFLICT (department, job_title) DO NOTHING;
