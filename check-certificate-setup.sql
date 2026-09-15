-- Перевірка, чи застосований supabase-certificate-name-patch.sql.
-- Нічого не змінює: лише читає системний каталог і показує, що є в базі.
-- Запустіть у SQL Editor (Supabase → SQL Editor → New query → Run).

with expected(тип, обʼєкт) as (
  values
    ('функція',  'pe_student_certificate'),
    ('функція',  'pe_confirm_certificate_name'),
    ('функція',  'pe_certificate_name_state'),
    ('функція',  'pe_verify_certificate'),
    ('таблиця',  'certificate_name_confirmations')
),
cols(таблиця, колонка) as (
  values
    ('certificate_name_confirmations', 'english_version'),
    ('certificate_name_confirmations', 'certificate_name_en'),
    ('issued_certificates',            'english_version'),
    ('issued_certificates',            'holder_name_en')
)
select e.тип, e.обʼєкт,
       case when e.тип = 'функція'
            then exists (select 1 from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = e.обʼєкт)
            else exists (select 1 from information_schema.tables t
                          where t.table_schema = 'public' and t.table_name = e.обʼєкт)
       end as є
  from expected e
union all
select 'колонка', c.таблиця || '.' || c.колонка,
       exists (select 1 from information_schema.columns ic
                where ic.table_schema = 'public'
                  and ic.table_name   = c.таблиця
                  and ic.column_name  = c.колонка)
  from cols c
order by 1, 2;
