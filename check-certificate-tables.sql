-- Які базові таблиці вже є. Нічого не змінює.
-- Supabase виконує скрипт однією транзакцією: одна помилка всередині
-- відкочує весь патч, тому спершу треба знати, чого бракує.

select t.потрібна_таблиця,
       exists (select 1 from information_schema.tables it
                where it.table_schema = 'public'
                  and it.table_name = t.потрібна_таблиця) as є,
       coalesce((select count(*)::text from information_schema.columns ic
                  where ic.table_schema = 'public'
                    and ic.table_name = t.потрібна_таблиця), '0') as колонок
  from (values
    ('issued_certificates'),
    ('certificate_name_confirmations'),
    ('certifications'),
    ('profiles'),
    ('module_results'),
    ('theory_exam_attempts'),
    ('practical_exam_attempts'),
    ('theory_exam_results')
  ) as t(потрібна_таблиця)
 order by 2, 1;
