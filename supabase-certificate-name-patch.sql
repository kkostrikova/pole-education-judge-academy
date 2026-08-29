-- Pole Education · Certificate name + language confirmation
-- Run once in Supabase SQL Editor after supabase-certificates-patch.sql.
-- Safe to re-run.

create table if not exists public.certificate_name_confirmations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  certificate_name text not null check (char_length(trim(certificate_name)) between 2 and 160),
  english_version boolean not null default false,
  certificate_name_en text,
  confirmed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certificate_name_confirmations
  add column if not exists english_version boolean not null default false;
alter table public.certificate_name_confirmations
  add column if not exists certificate_name_en text;

alter table public.issued_certificates
  add column if not exists english_version boolean not null default false;
alter table public.issued_certificates
  add column if not exists holder_name_en text;

alter table public.certificate_name_confirmations enable row level security;

drop policy if exists certificate_name_select_own_or_admin on public.certificate_name_confirmations;
create policy certificate_name_select_own_or_admin
on public.certificate_name_confirmations
for select
to authenticated
using (user_id=auth.uid() or public.pe_is_admin());

create or replace function public.pe_certificate_name_state()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_name text;
  v_name_en text;
  v_english boolean:=false;
  v_suggested text;
  v_suggested_en text;
  v_confirmed_at timestamptz;
  v_issued boolean:=false;
  v_issued_name text;
  v_issued_name_en text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select coalesce(
    nullif(trim(p.full_name),''),
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    u.email,
    ''
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    nullif(trim(p.full_name),''),
    ''
  )
  into v_suggested,v_suggested_en
  from auth.users u
  left join public.profiles p on p.user_id=u.id
  where u.id=v_uid;

  select c.certificate_name,c.english_version,c.certificate_name_en,c.confirmed_at
  into v_name,v_english,v_name_en,v_confirmed_at
  from public.certificate_name_confirmations c
  where c.user_id=v_uid;

  select true,ic.holder_name,ic.holder_name_en
  into v_issued,v_issued_name,v_issued_name_en
  from public.issued_certificates ic
  where ic.user_id=v_uid
  limit 1;

  return jsonb_build_object(
    'suggested_name',coalesce(v_suggested,''),
    'suggested_name_en',coalesce(v_suggested_en,''),
    'confirmed',v_name is not null,
    'certificate_name',v_name,
    'english_version',coalesce(v_english,false),
    'certificate_name_en',v_name_en,
    'confirmed_at',v_confirmed_at,
    'certificate_issued',coalesce(v_issued,false),
    'issued_name',v_issued_name,
    'issued_name_en',v_issued_name_en,
    'can_edit',not coalesce(v_issued,false)
  );
end;
$pe$;

grant execute on function public.pe_certificate_name_state() to authenticated;

drop function if exists public.pe_confirm_certificate_name(text);

create or replace function public.pe_confirm_certificate_name(
  p_certificate_name text,
  p_english_version boolean,
  p_certificate_name_en text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_name text:=trim(regexp_replace(coalesce(p_certificate_name,''),'\s+',' ','g'));
  v_name_en text:=trim(regexp_replace(coalesce(p_certificate_name_en,''),'\s+',' ','g'));
  v_english boolean:=coalesce(p_english_version,false);
  v_row public.certificate_name_confirmations%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.issued_certificates where user_id=v_uid) then
    raise exception 'CERTIFICATE_ALREADY_ISSUED';
  end if;
  if char_length(v_name)<2 or char_length(v_name)>160 then
    raise exception 'INVALID_CERTIFICATE_NAME';
  end if;
  if v_english and (char_length(v_name_en)<2 or char_length(v_name_en)>160) then
    raise exception 'INVALID_ENGLISH_CERTIFICATE_NAME';
  end if;

  insert into public.certificate_name_confirmations(
    user_id,certificate_name,english_version,certificate_name_en,confirmed_at,updated_at
  )
  values(
    v_uid,v_name,v_english,case when v_english then v_name_en else null end,now(),now()
  )
  on conflict(user_id) do update
  set certificate_name=excluded.certificate_name,
      english_version=excluded.english_version,
      certificate_name_en=excluded.certificate_name_en,
      confirmed_at=now(),
      updated_at=now()
  returning * into v_row;

  return jsonb_build_object(
    'confirmed',true,
    'certificate_name',v_row.certificate_name,
    'english_version',v_row.english_version,
    'certificate_name_en',v_row.certificate_name_en,
    'confirmed_at',v_row.confirmed_at
  );
end;
$pe$;

grant execute on function public.pe_confirm_certificate_name(text,boolean,text) to authenticated;

-- Require confirmed certificate data before issuing a new certificate.
create or replace function public.pe_student_certificate()
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_holder text;
  v_holder_en text;
  v_english boolean:=false;
  v_suggested text;
  v_suggested_en text;
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
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    nullif(trim(p.full_name),''),
    ''
  )
  into v_suggested,v_suggested_en
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
  where user_id=v_uid and result_published_at is not null
  order by attempt_number desc
  limit 1;
  v_theory_ok:=found and coalesce(v_theory.passed,false);

  select * into v_practical
  from public.practical_exam_attempts
  where user_id=v_uid and result_published_at is not null
  order by attempt_number desc
  limit 1;
  v_practical_ok:=found and coalesce(v_practical.passed,false);

  v_complete:=v_module_count=8 and v_modules_passed and v_theory_ok and v_practical_ok;

  if not v_complete then
    return jsonb_build_object(
      'eligible',false,
      'course_complete',false,
      'name_confirmation_required',false,
      'suggested_name',v_suggested,
      'suggested_name_en',v_suggested_en,
      'modules_done',v_module_count,
      'min_module_score',v_min_module_score,
      'theory_passed',v_theory_ok,
      'theory_score',case when v_theory.result_published_at is not null then v_theory.score else null end,
      'practical_passed',v_practical_ok,
      'practical_distinction',case when v_practical.result_published_at is not null then v_practical.distinction else null end,
      'gold_eligible',false
    );
  end if;

  -- Existing certificate remains authoritative and locked.
  select * into v_cert
  from public.issued_certificates
  where user_id=v_uid
  for update;

  if found then
    return jsonb_build_object(
      'eligible',true,
      'course_complete',true,
      'name_confirmation_required',false,
      'certificate_no',v_cert.certificate_no,
      'certificate_type',v_cert.certificate_type,
      'holder_name',v_cert.holder_name,
      'holder_name_en',v_cert.holder_name_en,
      'english_version',v_cert.english_version,
      'course_title',v_cert.course_title,
      'qualification',v_cert.qualification,
      'duration_hours',v_cert.duration_hours,
      'issued_at',v_cert.issued_at,
      'gold_eligible',v_cert.certificate_type='gold',
      'min_module_score',v_min_module_score,
      'theory_score',v_theory.score,
      'practical_distinction',v_practical.distinction
    );
  end if;

  select certificate_name,english_version,certificate_name_en
  into v_holder,v_english,v_holder_en
  from public.certificate_name_confirmations
  where user_id=v_uid;

  if v_holder is null then
    return jsonb_build_object(
      'eligible',false,
      'course_complete',true,
      'name_confirmation_required',true,
      'suggested_name',v_suggested,
      'suggested_name_en',v_suggested_en,
      'modules_done',v_module_count,
      'min_module_score',v_min_module_score,
      'theory_passed',v_theory_ok,
      'theory_score',v_theory.score,
      'practical_passed',v_practical_ok,
      'practical_distinction',v_practical.distinction
    );
  end if;

  v_gold:=coalesce(v_min_module_score,0)>80
    and coalesce(v_theory.score,0)>80
    and coalesce(v_practical.distinction,false);
  v_type:=case when v_gold then 'gold' else 'standard' end;
  v_no:='PEJ-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.pe_certificate_seq')::text,6,'0');

  insert into public.issued_certificates(
    certificate_no,user_id,certificate_type,holder_name,holder_name_en,english_version
  )
  values(
    v_no,v_uid,v_type,v_holder,case when v_english then v_holder_en else null end,v_english
  )
  returning * into v_cert;

  return jsonb_build_object(
    'eligible',true,
    'course_complete',true,
    'name_confirmation_required',false,
    'certificate_no',v_cert.certificate_no,
    'certificate_type',v_cert.certificate_type,
    'holder_name',v_cert.holder_name,
    'holder_name_en',v_cert.holder_name_en,
    'english_version',v_cert.english_version,
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
    'holder_name_en',v_cert.holder_name_en,
    'english_version',v_cert.english_version,
    'course_title',v_cert.course_title,
    'qualification',v_cert.qualification,
    'duration_hours',v_cert.duration_hours,
    'issued_at',v_cert.issued_at
  );
end;
$pe$;

grant execute on function public.pe_verify_certificate(text) to anon, authenticated;
