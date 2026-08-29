-- Pole Education · Final Theory attempt engine
-- Safe to keep in the public repository: this file contains NO answer key.
-- Run once in Supabase SQL Editor before opening the final exam to students.

create extension if not exists pgcrypto;

create or replace function public.pe_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

create table if not exists public.theory_exam_retry_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  extra_attempts integer not null default 0 check (extra_attempts >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.theory_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number >= 1),
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','timed_out')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 minutes'),
  submitted_at timestamptz,
  completed_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  score integer check (score is null or (score between 0 and 100)),
  auto_correct integer,
  auto_total integer not null default 41,
  passed boolean,
  elapsed_seconds integer,
  created_at timestamptz not null default now(),
  unique (user_id, attempt_number)
);

create index if not exists theory_exam_attempts_user_idx
  on public.theory_exam_attempts(user_id, attempt_number desc);

alter table public.theory_exam_attempts enable row level security;
alter table public.theory_exam_retry_grants enable row level security;

drop policy if exists theory_attempts_select_own_or_admin on public.theory_exam_attempts;
create policy theory_attempts_select_own_or_admin
on public.theory_exam_attempts
for select
to authenticated
using (user_id = auth.uid() or public.pe_is_admin());

drop policy if exists theory_retry_select_own_or_admin on public.theory_exam_retry_grants;
create policy theory_retry_select_own_or_admin
on public.theory_exam_retry_grants
for select
to authenticated
using (user_id = auth.uid() or public.pe_is_admin());

-- No direct student INSERT/UPDATE policies are created.
-- Starts, saves and submissions go through SECURITY DEFINER RPC functions.

create or replace function public.pe_grade_theory_answers(p_answers jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- Placeholder only. The real answer key is intentionally NOT stored
  -- in the public website repository. Replace this function privately
  -- in Supabase when the final key is approved.
  select jsonb_build_object(
    'correct', null,
    'total', 41,
    'percentage', null,
    'passed', null
  );
$$;

create or replace function public.pe_theory_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_latest public.theory_exam_attempts%rowtype;
  v_used integer := 0;
  v_extra integer := 0;
  v_allowed integer := 1;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.theory_exam_attempts
  set status = 'timed_out',
      submitted_at = coalesce(submitted_at, expires_at),
      completed_at = coalesce(completed_at, expires_at),
      elapsed_seconds = coalesce(elapsed_seconds, 3600)
  where user_id = v_uid
    and status = 'in_progress'
    and now() >= expires_at;

  select count(*)::integer
    into v_used
  from public.theory_exam_attempts
  where user_id = v_uid;

  select coalesce(extra_attempts, 0)
    into v_extra
  from public.theory_exam_retry_grants
  where user_id = v_uid;

  v_extra := coalesce(v_extra, 0);
  v_allowed := 1 + v_extra;

  select *
    into v_latest
  from public.theory_exam_attempts
  where user_id = v_uid
  order by attempt_number desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'exists', false,
      'attempts_used', v_used,
      'attempts_allowed', v_allowed,
      'can_start_new', v_used < v_allowed
    );
  end if;

  return to_jsonb(v_latest) || jsonb_build_object(
    'exists', true,
    'attempts_used', v_used,
    'attempts_allowed', v_allowed,
    'can_start_new', v_used < v_allowed
  );
end;
$$;

create or replace function public.pe_start_theory_exam()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_active public.theory_exam_attempts%rowtype;
  v_new public.theory_exam_attempts%rowtype;
  v_used integer := 0;
  v_extra integer := 0;
  v_allowed integer := 1;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.theory_exam_attempts
  set status = 'timed_out',
      submitted_at = coalesce(submitted_at, expires_at),
      completed_at = coalesce(completed_at, expires_at),
      elapsed_seconds = coalesce(elapsed_seconds, 3600)
  where user_id = v_uid
    and status = 'in_progress'
    and now() >= expires_at;

  select *
    into v_active
  from public.theory_exam_attempts
  where user_id = v_uid
    and status = 'in_progress'
  order by attempt_number desc
  limit 1;

  if found then
    return to_jsonb(v_active);
  end if;

  select count(*)::integer
    into v_used
  from public.theory_exam_attempts
  where user_id = v_uid;

  select coalesce(extra_attempts, 0)
    into v_extra
  from public.theory_exam_retry_grants
  where user_id = v_uid;

  v_extra := coalesce(v_extra, 0);
  v_allowed := 1 + v_extra;

  if v_used >= v_allowed then
    raise exception 'NO_ATTEMPTS_LEFT';
  end if;

  insert into public.theory_exam_attempts (
    user_id, attempt_number, status, started_at, expires_at, answers, flags, auto_total
  )
  values (
    v_uid, v_used + 1, 'in_progress', now(), now() + interval '60 minutes',
    '{}'::jsonb, '{}'::jsonb, 41
  )
  returning * into v_new;

  return to_jsonb(v_new);
end;
$$;

create or replace function public.pe_save_theory_exam_progress(
  p_attempt_id uuid,
  p_answers jsonb,
  p_flags jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.theory_exam_attempts%rowtype;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_row
  from public.theory_exam_attempts
  where id = p_attempt_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if v_row.status <> 'in_progress' then
    return to_jsonb(v_row);
  end if;

  if now() >= v_row.expires_at then
    update public.theory_exam_attempts
    set status = 'timed_out',
        submitted_at = coalesce(submitted_at, expires_at),
        completed_at = coalesce(completed_at, expires_at),
        answers = coalesce(p_answers, answers),
        flags = coalesce(p_flags, flags),
        elapsed_seconds = 3600
    where id = p_attempt_id
    returning * into v_row;
    return to_jsonb(v_row);
  end if;

  update public.theory_exam_attempts
  set answers = coalesce(p_answers, answers),
      flags = coalesce(p_flags, flags)
  where id = p_attempt_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.pe_submit_theory_exam(
  p_attempt_id uuid,
  p_answers jsonb,
  p_flags jsonb,
  p_timed_out boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.theory_exam_attempts%rowtype;
  v_grade jsonb;
  v_percentage integer;
  v_correct integer;
  v_passed boolean;
  v_now timestamptz := now();
  v_status text;
  v_elapsed integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_row
  from public.theory_exam_attempts
  where id = p_attempt_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if v_row.status <> 'in_progress' then
    return to_jsonb(v_row);
  end if;

  v_status := case
    when p_timed_out or v_now >= v_row.expires_at then 'timed_out'
    else 'submitted'
  end;

  v_elapsed := least(
    3600,
    greatest(0, floor(extract(epoch from (least(v_now, v_row.expires_at) - v_row.started_at)))::integer)
  );

  v_grade := public.pe_grade_theory_answers(coalesce(p_answers, '{}'::jsonb));
  v_percentage := nullif(v_grade->>'percentage','')::integer;
  v_correct := nullif(v_grade->>'correct','')::integer;
  v_passed := nullif(v_grade->>'passed','')::boolean;

  update public.theory_exam_attempts
  set status = v_status,
      submitted_at = v_now,
      completed_at = v_now,
      answers = coalesce(p_answers, answers),
      flags = coalesce(p_flags, flags),
      score = v_percentage,
      auto_correct = v_correct,
      auto_total = coalesce(nullif(v_grade->>'total','')::integer, 41),
      passed = v_passed,
      elapsed_seconds = v_elapsed
  where id = p_attempt_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.pe_grant_theory_retry(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.theory_exam_retry_grants%rowtype;
begin
  if not public.pe_is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  insert into public.theory_exam_retry_grants(user_id, extra_attempts, updated_at, updated_by)
  values (p_user_id, 1, now(), auth.uid())
  on conflict (user_id)
  do update set
    extra_attempts = public.theory_exam_retry_grants.extra_attempts + 1,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.pe_theory_state() to authenticated;
grant execute on function public.pe_start_theory_exam() to authenticated;
grant execute on function public.pe_save_theory_exam_progress(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.pe_submit_theory_exam(uuid,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.pe_grant_theory_retry(uuid) to authenticated;
grant execute on function public.pe_is_admin() to authenticated;
