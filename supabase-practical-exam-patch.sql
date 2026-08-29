-- Pole Education · Practical exam
-- Run once in Supabase SQL Editor.

create table if not exists public.practical_exam_retry_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  extra_attempts integer not null default 0 check (extra_attempts >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.practical_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number >= 1),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','timed_out')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  submitted_at timestamptz,
  completed_at timestamptz,
  mapping jsonb not null default '{}'::jsonb,
  protocols jsonb not null default '{}'::jsonb,
  elapsed_seconds integer,
  review_status text not null default 'pending' check (review_status in ('pending','reviewed')),
  result_score numeric(5,2),
  passed boolean,
  result_published_at timestamptz,
  result_published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id,attempt_number)
);

create index if not exists practical_exam_attempts_user_idx on public.practical_exam_attempts(user_id,attempt_number desc);

alter table public.practical_exam_attempts enable row level security;
alter table public.practical_exam_retry_grants enable row level security;

drop policy if exists practical_attempts_select_own_or_admin on public.practical_exam_attempts;
create policy practical_attempts_select_own_or_admin
on public.practical_exam_attempts for select to authenticated
using (user_id=auth.uid() or public.pe_is_admin());

create or replace function public.pe_practical_state()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_row public.practical_exam_attempts%rowtype;
  v_used integer:=0;
  v_extra integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_row from public.practical_exam_attempts
  where user_id=v_uid and status='in_progress'
  order by attempt_number desc limit 1;

  if found and now()>=v_row.expires_at then
    update public.practical_exam_attempts
    set status='timed_out',submitted_at=coalesce(submitted_at,expires_at),completed_at=coalesce(completed_at,expires_at),elapsed_seconds=coalesce(elapsed_seconds,1800)
    where id=v_row.id;
  end if;

  select count(*)::integer into v_used from public.practical_exam_attempts where user_id=v_uid;
  select coalesce(extra_attempts,0) into v_extra from public.practical_exam_retry_grants where user_id=v_uid;
  v_extra:=coalesce(v_extra,0);

  select * into v_row from public.practical_exam_attempts where user_id=v_uid order by attempt_number desc limit 1;
  if not found then
    return jsonb_build_object('exists',false,'attempts_used',v_used,'attempts_allowed',1+v_extra,'can_start_new',v_used<1+v_extra);
  end if;

  return jsonb_build_object(
    'exists',true,'id',v_row.id,'attempt_number',v_row.attempt_number,'status',v_row.status,
    'started_at',v_row.started_at,'expires_at',v_row.expires_at,
    'mapping',case when v_row.status='in_progress' then v_row.mapping else '{}'::jsonb end,
    'protocols',case when v_row.status='in_progress' then v_row.protocols else '{}'::jsonb end,
    'elapsed_seconds',v_row.elapsed_seconds,'review_status',v_row.review_status,
    'result_published',v_row.result_published_at is not null,
    'result_score',case when v_row.result_published_at is not null then v_row.result_score else null end,
    'passed',case when v_row.result_published_at is not null then v_row.passed else null end,
    'attempts_used',v_used,'attempts_allowed',1+v_extra,'can_start_new',v_used<1+v_extra
  );
end;
$pe$;

create or replace function public.pe_start_practical_exam()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_active public.practical_exam_attempts%rowtype;
  v_new public.practical_exam_attempts%rowtype;
  v_used integer:=0;
  v_extra integer:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not coalesce((select is_open from public.exam_access_settings where exam_key='practical'),false) then raise exception 'EXAM_CLOSED'; end if;

  select * into v_active from public.practical_exam_attempts where user_id=v_uid and status='in_progress' order by attempt_number desc limit 1;
  if found and now()<v_active.expires_at then return to_jsonb(v_active); end if;
  if found then perform public.pe_practical_state(); end if;

  select count(*)::integer into v_used from public.practical_exam_attempts where user_id=v_uid;
  select coalesce(extra_attempts,0) into v_extra from public.practical_exam_retry_grants where user_id=v_uid;
  v_extra:=coalesce(v_extra,0);
  if v_used>=1+v_extra then raise exception 'NO_ATTEMPTS_LEFT'; end if;

  insert into public.practical_exam_attempts(user_id,attempt_number,started_at,expires_at)
  values(v_uid,v_used+1,now(),now()+interval '30 minutes')
  returning * into v_new;
  return to_jsonb(v_new);
end;
$pe$;

create or replace function public.pe_save_practical_exam_progress(p_attempt_id uuid,p_mapping jsonb,p_protocols jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_row public.practical_exam_attempts%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_row from public.practical_exam_attempts where id=p_attempt_id and user_id=v_uid for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_row.status<>'in_progress' then return to_jsonb(v_row); end if;

  if now()>=v_row.expires_at then
    update public.practical_exam_attempts set status='timed_out',submitted_at=expires_at,completed_at=expires_at,mapping=coalesce(p_mapping,mapping),protocols=coalesce(p_protocols,protocols),elapsed_seconds=1800
    where id=p_attempt_id returning * into v_row;
    return to_jsonb(v_row);
  end if;

  update public.practical_exam_attempts set mapping=coalesce(p_mapping,mapping),protocols=coalesce(p_protocols,protocols)
  where id=p_attempt_id returning * into v_row;
  return to_jsonb(v_row);
end;
$pe$;

create or replace function public.pe_submit_practical_exam(p_attempt_id uuid,p_mapping jsonb,p_protocols jsonb,p_timed_out boolean default false)
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_row public.practical_exam_attempts%rowtype;
  v_now timestamptz:=now();
  v_elapsed integer;
  v_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_row from public.practical_exam_attempts where id=p_attempt_id and user_id=v_uid for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_row.status<>'in_progress' then
    return jsonb_build_object('id',v_row.id,'status',v_row.status,'summary',jsonb_build_object('technique',0,'artistry',0,'penalties',0));
  end if;

  v_status:=case when p_timed_out or v_now>=v_row.expires_at then 'timed_out' else 'submitted' end;
  v_elapsed:=least(1800,greatest(0,floor(extract(epoch from (least(v_now,v_row.expires_at)-v_row.started_at)))::integer));

  update public.practical_exam_attempts
  set status=v_status,submitted_at=v_now,completed_at=v_now,mapping=coalesce(p_mapping,mapping),protocols=coalesce(p_protocols,protocols),elapsed_seconds=v_elapsed,review_status='pending'
  where id=p_attempt_id returning * into v_row;

  return jsonb_build_object('id',v_row.id,'status',v_row.status,'summary',jsonb_build_object('technique',0,'artistry',0,'penalties',0));
end;
$pe$;

create or replace function public.pe_admin_practical_attempts()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare v_rows jsonb;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) into v_rows from public.practical_exam_attempts t;
  return v_rows;
end;
$pe$;

grant execute on function public.pe_practical_state() to authenticated;
grant execute on function public.pe_start_practical_exam() to authenticated;
grant execute on function public.pe_save_practical_exam_progress(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.pe_submit_practical_exam(uuid,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.pe_admin_practical_attempts() to authenticated;
