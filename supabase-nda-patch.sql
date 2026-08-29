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
