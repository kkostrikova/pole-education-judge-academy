-- Pole Education · Final Theory secure attempt + 3-admin manual review engine
-- This repository file contains NO answer key.
-- Run once in Supabase SQL Editor before opening the final theory exam to students.

create extension if not exists pgcrypto;

create or replace function public.pe_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

create table if not exists public.exam_access_settings (
  exam_key text primary key check (exam_key in ('theory','practical')),
  is_open boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.exam_access_settings(exam_key,is_open)
values ('theory',false),('practical',false)
on conflict (exam_key) do nothing;

alter table public.exam_access_settings enable row level security;

drop policy if exists exam_access_read_authenticated on public.exam_access_settings;
create policy exam_access_read_authenticated
on public.exam_access_settings for select to authenticated
using (true);

create or replace function public.pe_exam_access_state(p_exam_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_open boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select is_open into v_open
  from public.exam_access_settings
  where exam_key=p_exam_key;
  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
  return jsonb_build_object('exam_key',p_exam_key,'is_open',v_open);
end;
$pe$;

create or replace function public.pe_set_exam_access(p_exam_key text,p_open boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_row public.exam_access_settings%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  update public.exam_access_settings
  set is_open=p_open,updated_at=now(),updated_by=auth.uid()
  where exam_key=p_exam_key
  returning * into v_row;
  if not found then raise exception 'EXAM_NOT_FOUND'; end if;
  return to_jsonb(v_row);
end;
$pe$;

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
  auto_correct integer,
  auto_total integer not null default 41,
  manual_points numeric(4,1),
  final_points numeric(4,1),
  score integer check (score is null or score between 0 and 100),
  passed boolean,
  elapsed_seconds integer,
  result_published_at timestamptz,
  result_published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, attempt_number)
);

alter table public.theory_exam_attempts add column if not exists auto_correct integer;
alter table public.theory_exam_attempts add column if not exists auto_total integer not null default 41;
alter table public.theory_exam_attempts add column if not exists manual_points numeric(4,1);
alter table public.theory_exam_attempts add column if not exists final_points numeric(4,1);
alter table public.theory_exam_attempts add column if not exists result_published_at timestamptz;
alter table public.theory_exam_attempts add column if not exists result_published_by uuid references auth.users(id);

create index if not exists theory_exam_attempts_user_idx
  on public.theory_exam_attempts(user_id, attempt_number desc);

-- Review blocks are visual grouping only. Every admin may edit every open question.
create table if not exists public.theory_review_blocks (
  block_no integer primary key check (block_no between 1 and 3),
  title text not null,
  question_numbers integer[] not null
);

insert into public.theory_review_blocks(block_no,title,question_numbers)
values
  (1,'Блок 1',array[6,7,11]),
  (2,'Блок 2',array[12,15,16]),
  (3,'Блок 3',array[28,31,47])
on conflict (block_no) do update
set title = excluded.title,
    question_numbers = excluded.question_numbers;

create table if not exists public.theory_manual_scores (
  attempt_id uuid not null references public.theory_exam_attempts(id) on delete cascade,
  question_no integer not null,
  block_no integer not null references public.theory_review_blocks(block_no),
  points numeric(2,1) not null check (points in (0,0.5,1)),
  reviewed_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_no)
);

create index if not exists theory_manual_scores_attempt_idx
  on public.theory_manual_scores(attempt_id, block_no);

alter table public.theory_exam_attempts enable row level security;
alter table public.theory_exam_retry_grants enable row level security;
alter table public.theory_review_blocks enable row level security;
alter table public.theory_manual_scores enable row level security;

drop policy if exists theory_attempts_select_own_or_admin on public.theory_exam_attempts;
create policy theory_attempts_select_own_or_admin
on public.theory_exam_attempts for select to authenticated
using (user_id = auth.uid() or public.pe_is_admin());

drop policy if exists theory_retry_select_own_or_admin on public.theory_exam_retry_grants;
create policy theory_retry_select_own_or_admin
on public.theory_exam_retry_grants for select to authenticated
using (user_id = auth.uid() or public.pe_is_admin());

drop policy if exists theory_review_blocks_admin_select on public.theory_review_blocks;
create policy theory_review_blocks_admin_select
on public.theory_review_blocks for select to authenticated
using (public.pe_is_admin());

drop policy if exists theory_manual_scores_admin_select on public.theory_manual_scores;
create policy theory_manual_scores_admin_select
on public.theory_manual_scores for select to authenticated
using (public.pe_is_admin());

-- IMPORTANT:
-- Replace ONLY this function privately in Supabase when the 41-answer key is approved.
-- Do not commit the real key into this public repository.
create or replace function public.pe_grade_theory_answers(p_answers jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'correct', null,
    'total', 41
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
  v_grade jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_latest
  from public.theory_exam_attempts
  where user_id = v_uid and status = 'in_progress'
  order by attempt_number desc limit 1;

  if found and now() >= v_latest.expires_at then
    v_grade := public.pe_grade_theory_answers(v_latest.answers);
    update public.theory_exam_attempts
    set status='timed_out',
        submitted_at=coalesce(submitted_at,expires_at),
        completed_at=coalesce(completed_at,expires_at),
        elapsed_seconds=coalesce(elapsed_seconds,3600),
        auto_correct=coalesce(auto_correct,nullif(v_grade->>'correct','')::integer),
        auto_total=coalesce(nullif(v_grade->>'total','')::integer,41)
    where id=v_latest.id;
  end if;

  select count(*)::integer into v_used
  from public.theory_exam_attempts where user_id=v_uid;

  select coalesce(extra_attempts,0) into v_extra
  from public.theory_exam_retry_grants where user_id=v_uid;
  v_extra := coalesce(v_extra,0);
  v_allowed := 1 + v_extra;

  select * into v_latest
  from public.theory_exam_attempts
  where user_id=v_uid
  order by attempt_number desc limit 1;

  if not found then
    return jsonb_build_object(
      'exists',false,
      'attempts_used',v_used,
      'attempts_allowed',v_allowed,
      'can_start_new',v_used<v_allowed
    );
  end if;

  return jsonb_build_object(
    'exists',true,
    'id',v_latest.id,
    'attempt_number',v_latest.attempt_number,
    'status',v_latest.status,
    'started_at',v_latest.started_at,
    'expires_at',v_latest.expires_at,
    'submitted_at',v_latest.submitted_at,
    'answers',case when v_latest.status='in_progress' then v_latest.answers else '{}'::jsonb end,
    'flags',case when v_latest.status='in_progress' then v_latest.flags else '{}'::jsonb end,
    'elapsed_seconds',v_latest.elapsed_seconds,
    'result_published',v_latest.result_published_at is not null,
    'score',case when v_latest.result_published_at is not null then v_latest.score else null end,
    'passed',case when v_latest.result_published_at is not null then v_latest.passed else null end,
    'auto_total',41,
    'attempts_used',v_used,
    'attempts_allowed',v_allowed,
    'can_start_new',v_used<v_allowed
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
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not coalesce((select is_open from public.exam_access_settings where exam_key='theory'),false) then
    raise exception 'EXAM_CLOSED';
  end if;

  select * into v_active
  from public.theory_exam_attempts
  where user_id=v_uid and status='in_progress'
  order by attempt_number desc limit 1;

  if found and now() < v_active.expires_at then
    return jsonb_build_object(
      'id',v_active.id,'attempt_number',v_active.attempt_number,'status',v_active.status,
      'started_at',v_active.started_at,'expires_at',v_active.expires_at,
      'answers',v_active.answers,'flags',v_active.flags
    );
  end if;

  if found and now() >= v_active.expires_at then
    perform public.pe_theory_state();
  end if;

  select count(*)::integer into v_used
  from public.theory_exam_attempts where user_id=v_uid;

  select coalesce(extra_attempts,0) into v_extra
  from public.theory_exam_retry_grants where user_id=v_uid;
  v_extra:=coalesce(v_extra,0);
  v_allowed:=1+v_extra;

  if v_used>=v_allowed then raise exception 'NO_ATTEMPTS_LEFT'; end if;

  insert into public.theory_exam_attempts(
    user_id,attempt_number,status,started_at,expires_at,answers,flags,auto_total
  ) values (
    v_uid,v_used+1,'in_progress',now(),now()+interval '60 minutes','{}'::jsonb,'{}'::jsonb,41
  ) returning * into v_new;

  return jsonb_build_object(
    'id',v_new.id,'attempt_number',v_new.attempt_number,'status',v_new.status,
    'started_at',v_new.started_at,'expires_at',v_new.expires_at,
    'answers',v_new.answers,'flags',v_new.flags
  );
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
  v_uid uuid:=auth.uid();
  v_row public.theory_exam_attempts%rowtype;
  v_grade jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_row
  from public.theory_exam_attempts
  where id=p_attempt_id and user_id=v_uid
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  if v_row.status<>'in_progress' then
    return jsonb_build_object('id',v_row.id,'status',v_row.status);
  end if;

  if now()>=v_row.expires_at then
    v_grade:=public.pe_grade_theory_answers(coalesce(p_answers,v_row.answers));
    update public.theory_exam_attempts
    set status='timed_out',
        submitted_at=coalesce(submitted_at,expires_at),
        completed_at=coalesce(completed_at,expires_at),
        answers=coalesce(p_answers,answers),
        flags=coalesce(p_flags,flags),
        auto_correct=nullif(v_grade->>'correct','')::integer,
        auto_total=coalesce(nullif(v_grade->>'total','')::integer,41),
        elapsed_seconds=3600
    where id=p_attempt_id
    returning * into v_row;
    return jsonb_build_object('id',v_row.id,'status',v_row.status);
  end if;

  update public.theory_exam_attempts
  set answers=coalesce(p_answers,answers),
      flags=coalesce(p_flags,flags)
  where id=p_attempt_id
  returning * into v_row;

  return jsonb_build_object('id',v_row.id,'status',v_row.status);
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
  v_uid uuid:=auth.uid();
  v_row public.theory_exam_attempts%rowtype;
  v_grade jsonb;
  v_now timestamptz:=now();
  v_status text;
  v_elapsed integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_row
  from public.theory_exam_attempts
  where id=p_attempt_id and user_id=v_uid
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  if v_row.status<>'in_progress' then
    return jsonb_build_object(
      'id',v_row.id,'status',v_row.status,
      'elapsed_seconds',v_row.elapsed_seconds,
      'result_published',v_row.result_published_at is not null,
      'score',case when v_row.result_published_at is not null then v_row.score else null end,
      'passed',case when v_row.result_published_at is not null then v_row.passed else null end
    );
  end if;

  v_status:=case when p_timed_out or v_now>=v_row.expires_at then 'timed_out' else 'submitted' end;
  v_elapsed:=least(3600,greatest(0,floor(extract(epoch from (least(v_now,v_row.expires_at)-v_row.started_at)))::integer));
  v_grade:=public.pe_grade_theory_answers(coalesce(p_answers,'{}'::jsonb));

  update public.theory_exam_attempts
  set status=v_status,
      submitted_at=v_now,
      completed_at=v_now,
      answers=coalesce(p_answers,answers),
      flags=coalesce(p_flags,flags),
      auto_correct=nullif(v_grade->>'correct','')::integer,
      auto_total=coalesce(nullif(v_grade->>'total','')::integer,41),
      score=null,
      passed=null,
      manual_points=null,
      final_points=null,
      elapsed_seconds=v_elapsed
  where id=p_attempt_id
  returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id,'status',v_row.status,
    'elapsed_seconds',v_row.elapsed_seconds,
    'result_published',false,
    'score',null,'passed',null
  );
end;
$$;

create or replace function public.pe_claim_theory_review_block(p_block_no integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object('block_no',p_block_no,'editable_by_all_admins',true);
end;
$pe$;

create or replace function public.pe_save_theory_manual_score(
  p_attempt_id uuid,
  p_question_no integer,
  p_points numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid:=auth.uid();
  v_block public.theory_review_blocks%rowtype;
  v_attempt public.theory_exam_attempts%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_points not in (0,0.5,1) then raise exception 'INVALID_POINTS'; end if;

  select * into v_block
  from public.theory_review_blocks
  where p_question_no=any(question_numbers)
  limit 1;

  if not found then raise exception 'QUESTION_NOT_MANUAL'; end if;

  select * into v_attempt
  from public.theory_exam_attempts
  where id=p_attempt_id;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status='in_progress' then raise exception 'ATTEMPT_STILL_IN_PROGRESS'; end if;
  if v_attempt.result_published_at is not null then raise exception 'RESULT_ALREADY_PUBLISHED'; end if;

  insert into public.theory_manual_scores(attempt_id,question_no,block_no,points,reviewed_by,updated_at)
  values(p_attempt_id,p_question_no,v_block.block_no,p_points,v_uid,now())
  on conflict(attempt_id,question_no)
  do update set points=excluded.points,reviewed_by=v_uid,updated_at=now();

  return jsonb_build_object(
    'attempt_id',p_attempt_id,
    'question_no',p_question_no,
    'block_no',v_block.block_no,
    'points',p_points
  );
end;
$$;

create or replace function public.pe_publish_theory_result(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.theory_exam_attempts%rowtype;
  v_count integer;
  v_manual numeric(4,1);
  v_grade jsonb;
  v_auto integer;
  v_final numeric(4,1);
  v_score integer;
  v_passed boolean;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_attempt
  from public.theory_exam_attempts
  where id=p_attempt_id
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status='in_progress' then raise exception 'ATTEMPT_STILL_IN_PROGRESS'; end if;
  if v_attempt.result_published_at is not null then return to_jsonb(v_attempt); end if;

  select count(*)::integer,coalesce(sum(points),0)::numeric(4,1)
  into v_count,v_manual
  from public.theory_manual_scores
  where attempt_id=p_attempt_id;

  if v_count<>9 then raise exception 'MANUAL_REVIEW_INCOMPLETE_%_OF_9',v_count; end if;

  v_auto:=v_attempt.auto_correct;
  if v_auto is null then
    v_grade:=public.pe_grade_theory_answers(v_attempt.answers);
    v_auto:=nullif(v_grade->>'correct','')::integer;
  end if;
  if v_auto is null then raise exception 'AUTO_KEY_NOT_READY'; end if;

  v_final:=v_auto+v_manual;
  v_score:=round((v_final/50.0)*100.0)::integer;
  v_passed:=v_score>=60;

  update public.theory_exam_attempts
  set auto_correct=v_auto,
      auto_total=41,
      manual_points=v_manual,
      final_points=v_final,
      score=v_score,
      passed=v_passed,
      result_published_at=now(),
      result_published_by=auth.uid()
  where id=p_attempt_id
  returning * into v_attempt;

  return to_jsonb(v_attempt);
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
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  insert into public.theory_exam_retry_grants(user_id,extra_attempts,updated_at,updated_by)
  values(p_user_id,1,now(),auth.uid())
  on conflict(user_id)
  do update set
    extra_attempts=public.theory_exam_retry_grants.extra_attempts+1,
    updated_at=now(),
    updated_by=auth.uid()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.pe_is_admin() to authenticated;
grant execute on function public.pe_exam_access_state(text) to authenticated;
grant execute on function public.pe_set_exam_access(text,boolean) to authenticated;
grant execute on function public.pe_theory_state() to authenticated;
grant execute on function public.pe_start_theory_exam() to authenticated;
grant execute on function public.pe_save_theory_exam_progress(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.pe_submit_theory_exam(uuid,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.pe_claim_theory_review_block(integer) to authenticated;
grant execute on function public.pe_save_theory_manual_score(uuid,integer,numeric) to authenticated;
grant execute on function public.pe_publish_theory_result(uuid) to authenticated;
grant execute on function public.pe_grant_theory_retry(uuid) to authenticated;

create or replace function public.pe_admin_theory_attempts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_rows jsonb;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
  into v_rows
  from public.theory_exam_attempts t;
  return v_rows;
end;
$pe$;

grant execute on function public.pe_admin_theory_attempts() to authenticated;

