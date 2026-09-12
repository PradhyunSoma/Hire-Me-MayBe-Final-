-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- SCREENINGS TABLE — top-level job-screening runs
-- ============================================================
create table if not exists public.screenings (
    id uuid primary key default gen_random_uuid(),
    display_id text not null unique,

    job_title text,
    job_file_name text,
    job_file_path text,
    job_description_text text,

    status text not null default 'queued',
    processing_stage text,
    progress integer not null default 0,
    error text,

    candidates_count integer not null default 0,
    requirements_count integer not null default 0,

    result_jsonb jsonb,
    bias_report_jsonb jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists screenings_status_idx on public.screenings (status);
create index if not exists screenings_created_at_idx on public.screenings (created_at desc);

-- ============================================================
-- CANDIDATES TABLE — per-screening resumes + derived results
-- ============================================================
create table if not exists public.candidates (
    id uuid primary key default gen_random_uuid(),
    screening_id uuid not null references public.screenings (id) on delete cascade,

    name text not null,
    email text,
    file_name text,
    file_path text,

    overall_score integer not null default 0,
    rank integer,
    status text,

    technical_score integer not null default 0,
    experience_score integer not null default 0,
    domain_score integer not null default 0,
    soft_skill_score integer not null default 0,
    keyword_score integer not null default 0,
    semantic_score integer not null default 0,
    must_have_coverage integer not null default 0,
    preferred_coverage integer not null default 0,

    top_reason text,
    matches_jsonb jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists candidates_screening_id_idx on public.candidates (screening_id);
create index if not exists candidates_rank_idx on public.candidates (screening_id, rank);
create index if not exists candidates_overall_score_idx on public.candidates (screening_id, overall_score desc);

-- ============================================================
-- REQUIREMENTS TABLE — decomposed requirement atoms per JD
-- ============================================================
create table if not exists public.requirements (
    id uuid primary key default gen_random_uuid(),
    screening_id uuid not null references public.screenings (id) on delete cascade,

    display_id text not null,
    requirement_text text not null,
    type text not null,
    importance text not null,

    coverage_matched integer default 0,
    coverage_total integer default 0,

    created_at timestamptz not null default now()
);

create index if not exists requirements_screening_id_idx on public.requirements (screening_id);

-- ============================================================
-- FILES TABLE — metadata for uploaded JD + resume binaries
-- ============================================================
create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    screening_id uuid references public.screenings (id) on delete set null,
    kind text not null, -- 'job_description' | 'resume'
    original_name text not null,
    storage_path text not null,
    size_bytes integer not null default 0,
    mime_type text,
    candidate_id uuid references public.candidates (id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists files_screening_id_idx on public.files (screening_id);

-- ============================================================
-- CHAT MESSAGES TABLE — optional recruiter chat history
-- ============================================================
create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    screening_id uuid not null references public.screenings (id) on delete cascade,
    role text not null, -- 'user' | 'assistant'
    content text not null,
    created_at timestamptz not null default now()
);

create index if not exists chat_messages_screening_id_idx on public.chat_messages (screening_id, created_at);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================
create or replace function public.hmm_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_screenings_updated_at on public.screenings;
create trigger trg_screenings_updated_at
before update on public.screenings
for each row execute function public.hmm_set_updated_at();

drop trigger if exists trg_candidates_updated_at on public.candidates;
create trigger trg_candidates_updated_at
before update on public.candidates
for each row execute function public.hmm_set_updated_at();

-- ============================================================
-- STORAGE BUCKET — auto-create 'screenings' bucket via SQL
-- (Supabase exposes storage.buckets in the `storage` schema)
-- ============================================================
do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'storage' and table_name = 'buckets'
    ) then
        insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
        values (
            'screenings',
            'screenings',
            false,
            false,
            10485760,
            array['application/pdf']
        )
        on conflict (id) do nothing;
    end if;
end $$;

-- ============================================================
-- RLS — defaults to authenticated-only in a real deployment;
-- relaxed for hackathon demo.
-- ============================================================
alter table public.screenings enable row level security;
alter table public.candidates enable row level security;
alter table public.requirements enable row level security;
alter table public.files enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "hackathon-wide-read-screenings" on public.screenings;
create policy "hackathon-wide-read-screenings" on public.screenings
for select using (true);

drop policy if exists "hackathon-wide-write-screenings" on public.screenings;
create policy "hackathon-wide-write-screenings" on public.screenings
for all using (true) with check (true);

drop policy if exists "hackathon-candidates-all" on public.candidates;
create policy "hackathon-candidates-all" on public.candidates
for all using (true) with check (true);

drop policy if exists "hackathon-requirements-all" on public.requirements;
create policy "hackathon-requirements-all" on public.requirements
for all using (true) with check (true);

drop policy if exists "hackathon-files-all" on public.files;
create policy "hackathon-files-all" on public.files
for all using (true) with check (true);

drop policy if exists "hackathon-chat-all" on public.chat_messages;
create policy "hackathon-chat-all" on public.chat_messages
for all using (true) with check (true);
