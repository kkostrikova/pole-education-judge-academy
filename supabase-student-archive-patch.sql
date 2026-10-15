-- Архівування та видалення студента
-- ==================================
-- Запусти цей файл цілком в Supabase → SQL Editor.
-- Він нічого не стирає — лише додає колонку й чотири функції.
--
-- Навіщо два різні дії, а не одна кнопка «видалити»:
-- усі таблиці курсу привʼязані до auth.users через on delete cascade, тож
-- видалення акаунта стирає разом із ним підписаний договір NDA (з підписом,
-- іменем, поштою, повним текстом і датою) та виданий сертифікат. Після цього
-- посилання на перевірку сертифіката перестає працювати назавжди.
-- Архівування закриває доступ, але лишає ці записи недоторканими.

-- 1. Позначка архіву --------------------------------------------------------
alter table public.profiles
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

-- 2. Архівувати -------------------------------------------------------------
create or replace function public.pe_admin_archive_student(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_row public.profiles%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'CANNOT_ARCHIVE_SELF'; end if;

  select * into v_row from public.profiles where user_id = p_user_id;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
  if v_row.role = 'admin' then raise exception 'CANNOT_ARCHIVE_ADMIN'; end if;

  update public.profiles
     set archived_at = now(), archived_by = auth.uid()
   where user_id = p_user_id
  returning * into v_row;

  return jsonb_build_object('archived', true, 'user_id', p_user_id,
                            'archived_at', v_row.archived_at);
end;
$pe$;
grant execute on function public.pe_admin_archive_student(uuid) to authenticated;

-- 3. Повернути з архіву -----------------------------------------------------
create or replace function public.pe_admin_restore_student(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  update public.profiles
     set archived_at = null, archived_by = null
   where user_id = p_user_id;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;

  return jsonb_build_object('archived', false, 'user_id', p_user_id);
end;
$pe$;
grant execute on function public.pe_admin_restore_student(uuid) to authenticated;

-- 4. Що саме буде втрачено --------------------------------------------------
-- Адмінка питає це перед видаленням, щоб у вікні підтвердження стояли
-- справжні числа, а не загальні слова.
create or replace function public.pe_admin_student_footprint(p_user_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $pe$
declare
  v_profile public.profiles%rowtype;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v_profile from public.profiles where user_id = p_user_id;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;

  return jsonb_build_object(
    'user_id',     p_user_id,
    'full_name',   v_profile.full_name,
    'email',       v_profile.email,
    'archived',    v_profile.archived_at is not null,
    'nda',         exists (select 1 from public.course_nda_signatures where user_id = p_user_id),
    'certificate', exists (select 1 from public.issued_certificates    where user_id = p_user_id),
    'certificate_no', (select certificate_no from public.issued_certificates where user_id = p_user_id limit 1),
    'modules',     (select count(*) from public.module_results           where user_id = p_user_id),
    'theory',      (select count(*) from public.theory_exam_attempts     where user_id = p_user_id),
    'practical',   (select count(*) from public.practical_exam_attempts  where user_id = p_user_id)
  );
end;
$pe$;
grant execute on function public.pe_admin_student_footprint(uuid) to authenticated;

-- 5. Видалити назавжди ------------------------------------------------------
-- p_confirm_name має точно збігатися з іменем студента у профілі. Це не
-- захист від зловмисника — адміністратор і так має права, — а захист від
-- натискання не на той рядок.
create or replace function public.pe_admin_delete_student(
  p_user_id uuid,
  p_confirm_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_profile public.profiles%rowtype;
  v_typed text := lower(trim(regexp_replace(coalesce(p_confirm_name,''), '\s+', ' ', 'g')));
  v_real  text;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'CANNOT_DELETE_SELF'; end if;

  select * into v_profile from public.profiles where user_id = p_user_id;
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;
  if v_profile.role = 'admin' then raise exception 'CANNOT_DELETE_ADMIN'; end if;

  v_real := lower(trim(regexp_replace(coalesce(v_profile.full_name,''), '\s+', ' ', 'g')));
  if v_real = '' or v_typed <> v_real then raise exception 'NAME_MISMATCH'; end if;

  -- каскад прибере профіль, договір, спроби, сертифікат і решту
  delete from auth.users where id = p_user_id;

  return jsonb_build_object('deleted', true, 'user_id', p_user_id,
                            'full_name', v_profile.full_name);
end;
$pe$;
grant execute on function public.pe_admin_delete_student(uuid, text) to authenticated;

-- 6. Архівований студент втрачає доступ -------------------------------------
-- pe_nda_status тепер повідомляє про архів окремо. Сторож на сторінках
-- модулів веде таку людину на сторінку договору, де написано, що доступ
-- закрито, — а не пускає всередину і не пропонує підписати ще раз.
create or replace function public.pe_nda_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $pe$
declare
  v_uid uuid := auth.uid();
  v_version text := 'PE-JUDGE-NDA-2026-01';
  v_profile public.profiles%rowtype;
  v_row public.course_nda_signatures%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('signed', false, 'required', true,
                              'authenticated', false, 'version', v_version);
  end if;

  select * into v_profile from public.profiles where user_id = v_uid limit 1;

  if v_profile.archived_at is not null then
    return jsonb_build_object('signed', false, 'required', true, 'archived', true,
                              'authenticated', true, 'version', v_version);
  end if;

  if v_profile.role = 'admin' then
    return jsonb_build_object('signed', true, 'required', false, 'admin', true,
                              'authenticated', true, 'version', v_version);
  end if;

  select * into v_row
    from public.course_nda_signatures
   where user_id = v_uid and agreement_version = v_version
   order by signed_at desc
   limit 1;

  if not found then
    return jsonb_build_object('signed', false, 'required', true,
                              'authenticated', true, 'version', v_version);
  end if;

  return jsonb_build_object(
    'signed', true, 'required', true, 'authenticated', true,
    'version', v_row.agreement_version,
    'signed_at', v_row.signed_at,
    'full_name', v_row.full_name
  );
end;
$pe$;
grant execute on function public.pe_nda_status() to authenticated;

-- Єдина точка, де архів перевіряється, — це pe_nda_status вище. Сторож на
-- сторінках модулів та іспитів питає саме її, тому архівований студент не
-- потрапить усередину, навіть якщо підпише договір ще раз: позначка архіву
-- перевіряється раніше за підпис.
