-- Сертифікат «прослухав курс» для тих, хто не склав іспит
-- ========================================================
-- Запусти цей файл цілком в Supabase → SQL Editor.
-- Він нічого не стирає: додає третій тип сертифіката й переписує одну функцію.
--
-- Навіщо. Студентка, яка пройшла курс і не склала іспит, бачила в кабінеті
-- порожнє місце: сертифікат видавався лише за повного завершення курсу.
-- Тепер такій людині видається сертифікат про проходження курсу — без
-- згадки про іспит і без рядка «Кваліфікація», бо кваліфікації вона не
-- отримала.
--
-- Хто його отримує: будь-хто, у кого опубліковано результат іспиту
-- (теоретичного або практичного) зі статусом «не складено».
--
-- Якщо вона потім перескладе і закриє курс, сертифікат підвищується до
-- звичайного або золотого, зберігаючи той самий номер.

-- 1. Третій тип ------------------------------------------------------------
alter table public.issued_certificates
  drop constraint if exists issued_certificates_certificate_type_check;
alter table public.issued_certificates
  add constraint issued_certificates_certificate_type_check
  check (certificate_type in ('standard','gold','attendance'));

-- 2. Видача ----------------------------------------------------------------
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
  v_theory_failed boolean:=false;
  v_practical_failed boolean:=false;
  v_exam_failed boolean:=false;
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
  v_theory_failed:=v_theory.result_published_at is not null
    and not coalesce(v_theory.passed,false);

  select * into v_practical
  from public.practical_exam_attempts
  where user_id=v_uid and result_published_at is not null
  order by attempt_number desc
  limit 1;
  v_practical_ok:=found and coalesce(v_practical.passed,false);
  v_practical_failed:=v_practical.result_published_at is not null
    and not coalesce(v_practical.passed,false);

  v_complete:=v_module_count=8 and v_modules_passed and v_theory_ok and v_practical_ok;
  -- Опублікований результат «не складено» хоча б в одній частині іспиту.
  v_exam_failed:=v_theory_failed or v_practical_failed;

  v_gold:=coalesce(v_min_module_score,0)>80
    and coalesce(v_theory.score,0)>80
    and coalesce(v_practical.distinction,false);

  select * into v_cert
  from public.issued_certificates
  where user_id=v_uid
  for update;

  -- Уже виданий сертифікат. Єдина зміна, яка тут дозволена, — підвищення
  -- сертифіката про проходження курсу до повного, коли людина перескладе
  -- іспит і закриє курс. Номер при цьому зберігається, бо посилання на
  -- перевірку вже може бути комусь надіслане.
  if found then
    if v_complete and v_cert.certificate_type='attendance' then
      update public.issued_certificates
         set certificate_type=case when v_gold then 'gold' else 'standard' end,
             updated_at=now()
       where id=v_cert.id
      returning * into v_cert;
    end if;

    return jsonb_build_object(
      'eligible',true,
      'course_complete',v_complete,
      'attendance_only',v_cert.certificate_type='attendance',
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

  -- Ще нічого не видано, і підстав для видачі немає.
  if not v_complete and not v_exam_failed then
    return jsonb_build_object(
      'eligible',false,
      'course_complete',false,
      'attendance_eligible',false,
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

  -- Ім’я на сертифікаті підтверджується до видачі — однаково для обох
  -- випадків: і для повного курсу, і для сертифіката про проходження.
  select certificate_name,english_version,certificate_name_en
  into v_holder,v_english,v_holder_en
  from public.certificate_name_confirmations
  where user_id=v_uid;

  if v_holder is null then
    return jsonb_build_object(
      'eligible',false,
      'course_complete',v_complete,
      'attendance_eligible',not v_complete,
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

  v_type:=case
            when not v_complete then 'attendance'
            when v_gold then 'gold'
            else 'standard'
          end;
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
    'course_complete',v_complete,
    'attendance_only',v_cert.certificate_type='attendance',
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
