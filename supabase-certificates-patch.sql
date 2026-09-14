-- Pole Education · Certificate system + distinction
-- Run this file once in Supabase SQL Editor.
-- Safe to re-run.

alter table public.practical_exam_attempts
  add column if not exists distinction boolean not null default false;

-- Backward-compatible 4-argument publisher.
-- The existing 3-argument function remains available until all clients are updated.
create or replace function public.pe_publish_practical_result(
  p_attempt_id uuid,
  p_passed boolean,
  p_comment text,
  p_distinction boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_attempt public.practical_exam_attempts%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_attempt
  from public.practical_exam_attempts
  where id=p_attempt_id
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status='in_progress' then raise exception 'ATTEMPT_NOT_SUBMITTED'; end if;

  update public.practical_exam_attempts
  set review_status='reviewed',
      passed=p_passed,
      distinction=case when p_passed then coalesce(p_distinction,false) else false end,
      admin_comment=nullif(trim(coalesce(p_comment,'')),''),
      result_score=null,
      result_published_at=now(),
      result_published_by=auth.uid()
  where id=p_attempt_id
  returning * into v_attempt;

  return jsonb_build_object(
    'id',v_attempt.id,
    'passed',v_attempt.passed,
    'distinction',v_attempt.distinction,
    'admin_comment',v_attempt.admin_comment,
    'result_published_at',v_attempt.result_published_at
  );
end;
$pe$;

grant execute on function public.pe_publish_practical_result(uuid,boolean,text,boolean) to authenticated;

create or replace function public.pe_student_practical_result()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_attempt public.practical_exam_attempts%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_attempt
  from public.practical_exam_attempts
  where user_id=v_uid
  order by attempt_number desc
  limit 1;

  if not found then return jsonb_build_object('exists',false); end if;

  return jsonb_build_object(
    'exists',true,
    'attempt_number',v_attempt.attempt_number,
    'status',v_attempt.status,
    'review_status',v_attempt.review_status,
    'result_published',v_attempt.result_published_at is not null,
    'passed',case when v_attempt.result_published_at is not null then v_attempt.passed else null end,
    'distinction',case when v_attempt.result_published_at is not null then v_attempt.distinction else null end,
    'admin_comment',case when v_attempt.result_published_at is not null then v_attempt.admin_comment else null end,
    'published_at',v_attempt.result_published_at
  );
end;
$pe$;

grant execute on function public.pe_student_practical_result() to authenticated;

create sequence if not exists public.pe_certificate_seq
  as bigint
  start with 1
  increment by 1;

create table if not exists public.issued_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text not null unique,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  certificate_type text not null check (certificate_type in ('standard','gold')),
  holder_name text not null,
  course_title text not null default 'Суддівсько-організаційний курс',
  qualification text not null default 'пілон, повітряні кільця, повітряні полотна',
  duration_hours integer not null default 10,
  issued_at timestamptz not null default now(),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.issued_certificates enable row level security;

drop policy if exists issued_certificates_select_own_or_admin on public.issued_certificates;
create policy issued_certificates_select_own_or_admin
on public.issued_certificates
for select
to authenticated
using (user_id=auth.uid() or public.pe_is_admin());

create or replace function public.pe_student_certificate()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_holder text;
  v_module_count integer:=0;
  v_modules_passed boolean:=false;
  v_min_module_score numeric:=null;
  v_theory public.theory_exam_attempts%rowtype;
  v_practical public.practical_exam_attempts%rowtype;
  v_theory_ok boolean:=false;
  v_practical_ok boolean:=false;
  v_complete boolean:=false;
  v_gold boolean:=false;
  v_type text;
  v_cert public.issued_certificates%rowtype;
  v_no text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select coalesce(
    nullif(trim(p.full_name),''),
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    u.email,
    'Студент'
  )
  into v_holder
  from auth.users u
  left join public.profiles p on p.user_id=u.id
  where u.id=v_uid;

  select count(*)::integer,
         coalesce(bool_and(q.best_passed),false),
         min(q.best_score)
  into v_module_count,v_modules_passed,v_min_module_score
  from (
    select module_id,
           max(score)::numeric as best_score,
           bool_or(passed) as best_passed
    from public.module_results
    where user_id=v_uid
      and module_id between 1 and 8
    group by module_id
  ) q;

  select * into v_theory
  from public.theory_exam_attempts
  where user_id=v_uid
    and result_published_at is not null
  order by attempt_number desc
  limit 1;
  v_theory_ok:=found and coalesce(v_theory.passed,false);

  select * into v_practical
  from public.practical_exam_attempts
  where user_id=v_uid
    and result_published_at is not null
  order by attempt_number desc
  limit 1;
  v_practical_ok:=found and coalesce(v_practical.passed,false);

  v_complete:=v_module_count=8
    and v_modules_passed
    and v_theory_ok
    and v_practical_ok;

  v_gold:=v_complete
    and coalesce(v_min_module_score,0)>80
    and coalesce(v_theory.score,0)>80
    and coalesce(v_practical.distinction,false);

  if not v_complete then
    return jsonb_build_object(
      'eligible',false,
      'course_complete',false,
      'modules_done',v_module_count,
      'min_module_score',v_min_module_score,
      'theory_passed',v_theory_ok,
      'theory_score',case when v_theory.result_published_at is not null then v_theory.score else null end,
      'practical_passed',v_practical_ok,
      'practical_distinction',case when v_practical.result_published_at is not null then v_practical.distinction else null end,
      'gold_eligible',false
    );
  end if;

  v_type:=case when v_gold then 'gold' else 'standard' end;

  select * into v_cert
  from public.issued_certificates
  where user_id=v_uid
  for update;

  if not found then
    v_no:='PEJ-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.pe_certificate_seq')::text,6,'0');

    insert into public.issued_certificates(
      certificate_no,user_id,certificate_type,holder_name
    )
    values(v_no,v_uid,v_type,v_holder)
    returning * into v_cert;
  else
    update public.issued_certificates
    set certificate_type=case
          when certificate_type='gold' then 'gold'
          when v_type='gold' then 'gold'
          else 'standard'
        end,
        holder_name=v_holder,
        updated_at=now()
    where id=v_cert.id
    returning * into v_cert;
  end if;

  return jsonb_build_object(
    'eligible',true,
    'course_complete',true,
    'certificate_no',v_cert.certificate_no,
    'certificate_type',v_cert.certificate_type,
    'holder_name',v_cert.holder_name,
    'course_title',v_cert.course_title,
    'qualification',v_cert.qualification,
    'duration_hours',v_cert.duration_hours,
    'issued_at',v_cert.issued_at,
    'gold_eligible',v_cert.certificate_type='gold',
    'min_module_score',v_min_module_score,
    'theory_score',v_theory.score,
    'practical_distinction',v_practical.distinction
  );
end;
$pe$;

grant execute on function public.pe_student_certificate() to authenticated;

create or replace function public.pe_verify_certificate(p_certificate_no text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $pe$
declare
  v_cert public.issued_certificates%rowtype;
begin
  select * into v_cert
  from public.issued_certificates
  where lower(certificate_no)=lower(trim(coalesce(p_certificate_no,'')))
  limit 1;

  if not found or not v_cert.is_active then
    return jsonb_build_object('valid',false);
  end if;

  return jsonb_build_object(
    'valid',true,
    'certificate_no',v_cert.certificate_no,
    'certificate_type',v_cert.certificate_type,
    'holder_name',v_cert.holder_name,
    'course_title',v_cert.course_title,
    'qualification',v_cert.qualification,
    'duration_hours',v_cert.duration_hours,
    'issued_at',v_cert.issued_at
  );
end;
$pe$;

grant execute on function public.pe_verify_certificate(text) to anon, authenticated;
