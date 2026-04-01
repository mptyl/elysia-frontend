-- Idempotent schema for frontend profile management.
-- Safe to run multiple times across server/local environments.

create extension if not exists pgcrypto;

-- ============================================================
-- Departments (lookup table, synced from directory service)
-- ============================================================

create table if not exists public.departments (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null default '',
    created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.departments enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'departments'
          and policyname = 'departments_select_authenticated'
    ) then
        create policy departments_select_authenticated
            on public.departments
            for select
            to authenticated
            using (true);
    end if;
end
$$;

grant select on table public.departments to authenticated;
grant select on table public.departments to anon;
grant all on table public.departments to service_role;
grant all on table public.departments to postgres;

-- ============================================================
-- User profiles
-- ============================================================

create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    department_id uuid references public.departments(id) on delete set null,
    job_title text,
    department text,
    response_detail_level text not null default 'balanced'
        check (response_detail_level in ('executive_summary', 'balanced', 'operational_detail')),
    communication_tone text not null default 'professional'
        check (communication_tone in ('formal', 'professional', 'direct')),
    preferred_language text not null default 'it'
        check (preferred_language in ('it', 'en')),
    response_focus text not null default 'technical'
        check (response_focus in ('normative', 'managerial', 'technical', 'relational')),
    custom_instructions text not null default '',
    custom_instructions_mode text not null default 'append'
        check (custom_instructions_mode in ('append', 'override')),
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_user_profiles_department_id
    on public.user_profiles (department_id);

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

alter table public.user_profiles enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
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
        select 1 from pg_policies
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
        select 1 from pg_policies
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
grant select, insert, update on table public.user_profiles to authenticated;
grant all on table public.user_profiles to service_role;
grant all on table public.user_profiles to postgres;

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
