-- Pole Education · Final course access + certificate preferences patch
-- Run once in Supabase SQL Editor after supabase-certificates-patch.sql.
-- Safe to re-run.

-- Pole Education · Mandatory NDA / confidentiality agreement
-- Run once in Supabase SQL Editor.
-- Safe to re-run.
-- Current agreement version: PE-JUDGE-NDA-2026-01

create table if not exists public.course_nda_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agreement_version text not null,
  agreement_title text not null,
  agreement_text text not null,
  full_name text not null,
  email text,
  signature_data_url text not null,
  consent boolean not null default true,
  user_agent text,
  signed_at timestamptz not null default now(),
  unique(user_id,agreement_version)
);

alter table public.course_nda_signatures enable row level security;

drop policy if exists course_nda_select_own_or_admin on public.course_nda_signatures;
create policy course_nda_select_own_or_admin
on public.course_nda_signatures
for select
to authenticated
using (user_id=auth.uid() or public.pe_is_admin());

create or replace function public.pe_nda_document()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $pe$
declare
  v_version text:='PE-JUDGE-NDA-2026-01';
  v_title text:='Договір про нерозповсюдження інформації';
  v_text text:=$doc$
«СТОРОНА, ЯКА РОЗКРИВАЄ» в особах:
ФОП Сова Світлана Василівна, РНОКПП 3326818105;
ФОП Кострікова Катерина Сергіївна, РНОКПП 3160115847,

та «СТОРОНА, ЯКА ОДЕРЖУЄ» — зареєстрований користувач платформи Pole Education Judge Academy — уклали цей договір про наступне:

1. СТОРОНА, ЯКА РОЗКРИВАЄ, зобов’язується надати освітню інформацію під час проходження «Організаційно-суддівського курсу Pole Education Judge Academy» (надалі — «Курс»). Лекційна частина Курсу може бути розміщена на ресурсі WeStudy, а інтерактивні модулі, тести, суддівські протоколи та фінальна атестація — на платформі Pole Education Judge Academy.

2. Інформація надається у текстовому та медіаформаті (зокрема фото, відео, схеми, інтерактивні матеріали, протоколи, тестові та екзаменаційні завдання) і є об’єктом інтелектуальної власності.

3. Матеріали Курсу охороняються чинним законодавством України, зокрема законодавством у сфері авторського права та інформації.

4. СТОРОНА, ЯКА ОДЕРЖУЄ, отримує інформацію виключно для особистого навчання, підвищення професійної компетентності та практичного використання набутих знань у суддівській, організаційній, тренерській та освітній діяльності.

5. СТОРОНА, ЯКА ОДЕРЖУЄ, зобов’язується не передавати третім особам та не поширювати жодні матеріали Курсу. Забороняється копіювати, надсилати, демонструвати, публікувати, продавати, дарувати або іншим способом розповсюджувати відео, фото, тексти, схеми, протоколи, тестові питання, екзаменаційні завдання, скриншоти та інші матеріали Курсу.

6. Повне або часткове розповсюдження матеріалів Курсу допускається виключно за попередньою згодою СТОРОНИ, ЯКА РОЗКРИВАЄ. Без такої згоди розповсюдження забороняється.

7. Доступ до особистого акаунта Курсу є персональним. СТОРОНА, ЯКА ОДЕРЖУЄ, не має права передавати третім особам дані для входу або надавати доступ до матеріалів через свій акаунт.

8. Підписуючи цей договір на платформі, СТОРОНА, ЯКА ОДЕРЖУЄ, підтверджує, що прочитала його текст, розуміє умови та погоджується їх дотримуватися. Платформа фіксує ПІБ, email акаунта, версію договору, дату й час підписання та власноручний електронний підпис, нанесений на екрані.
$doc$;
begin
  return jsonb_build_object(
    'version',v_version,
    'title',v_title,
    'text',v_text
  );
end;
$pe$;

grant execute on function public.pe_nda_document() to authenticated;

create or replace function public.pe_nda_status()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_version text:='PE-JUDGE-NDA-2026-01';
  v_role text;
  v_row public.course_nda_signatures%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('signed',false,'required',true,'authenticated',false,'version',v_version);
  end if;

  select role into v_role from public.profiles where user_id=v_uid limit 1;
  if v_role='admin' then
    return jsonb_build_object('signed',true,'required',false,'admin',true,'authenticated',true,'version',v_version);
  end if;

  select * into v_row
  from public.course_nda_signatures
  where user_id=v_uid and agreement_version=v_version
  order by signed_at desc
  limit 1;

  return jsonb_build_object(
    'signed',found,
    'required',true,
    'authenticated',true,
    'version',v_version,
    'signed_at',case when found then v_row.signed_at else null end,
    'full_name',case when found then v_row.full_name else null end
  );
end;
$pe$;

grant execute on function public.pe_nda_status() to authenticated;

create or replace function public.pe_sign_course_nda(
  p_full_name text,
  p_signature_data_url text,
  p_consent boolean,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $pe$
declare
  v_uid uuid:=auth.uid();
  v_email text;
  v_name text:=trim(regexp_replace(coalesce(p_full_name,''),'\s+',' ','g'));
  v_sig text:=coalesce(p_signature_data_url,'');
  v_version text:='PE-JUDGE-NDA-2026-01';
  v_title text:='Договір про нерозповсюдження інформації';
  v_doc jsonb;
  v_text text;
  v_row public.course_nda_signatures%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not coalesce(p_consent,false) then raise exception 'CONSENT_REQUIRED'; end if;
  if char_length(v_name)<2 or char_length(v_name)>160 then raise exception 'INVALID_FULL_NAME'; end if;
  if v_sig not like 'data:image/png;base64,%' then raise exception 'INVALID_SIGNATURE'; end if;
  if char_length(v_sig)<250 or char_length(v_sig)>250000 then raise exception 'INVALID_SIGNATURE_SIZE'; end if;

  select email into v_email from auth.users where id=v_uid;
  v_doc:=public.pe_nda_document();
  v_text:=v_doc->>'text';

  insert into public.course_nda_signatures(
    user_id,agreement_version,agreement_title,agreement_text,
    full_name,email,signature_data_url,consent,user_agent,signed_at
  )
  values(
    v_uid,v_version,v_title,v_text,
    v_name,v_email,v_sig,true,left(coalesce(p_user_agent,''),1000),now()
  )
  on conflict(user_id,agreement_version) do nothing
  returning * into v_row;

  if not found then
    select * into v_row from public.course_nda_signatures
    where user_id=v_uid and agreement_version=v_version
    limit 1;
  end if;

  return jsonb_build_object(
    'signed',true,
    'version',v_row.agreement_version,
    'full_name',v_row.full_name,
    'signed_at',v_row.signed_at
  );
end;
$pe$;

grant execute on function public.pe_sign_course_nda(text,text,boolean,text) to authenticated;

create or replace function public.pe_admin_nda_record(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $pe$
declare
  v_row public.course_nda_signatures%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select * into v_row
  from public.course_nda_signatures
  where user_id=p_user_id
  order by signed_at desc
  limit 1;

  if not found then return jsonb_build_object('exists',false); end if;

  return jsonb_build_object(
    'exists',true,
    'id',v_row.id,
    'user_id',v_row.user_id,
    'agreement_version',v_row.agreement_version,
    'agreement_title',v_row.agreement_title,
    'agreement_text',v_row.agreement_text,
    'full_name',v_row.full_name,
    'email',v_row.email,
    'signature_data_url',v_row.signature_data_url,
    'consent',v_row.consent,
    'signed_at',v_row.signed_at
  );
end;
$pe$;

grant execute on function public.pe_admin_nda_record(uuid) to authenticated;


-- ============================================================
-- Certificate name confirmation + optional English certificate
-- ============================================================

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

