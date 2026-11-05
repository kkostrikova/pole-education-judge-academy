-- Чому Валерії не видається золотий диплом
-- =========================================
-- Нічого не змінює. Запусти в Supabase → SQL Editor і надішли мені таблицю.
-- Якщо прізвище в базі написане інакше — заміни текст у лапках нижче.

with v as (
  select user_id, full_name, email
    from public.profiles
   where full_name ilike '%Печникова%'
      or full_name ilike '%Валері%'
),
m as (
  select r.user_id,
         count(distinct r.module_id)::int            as модулів,
         bool_and(q.passed)                          as усі_складені,
         min(q.score)                                as найгірший_модуль
    from public.module_results r
    join lateral (select max(score) as score, bool_or(passed) as passed
                    from public.module_results x
                   where x.user_id = r.user_id and x.module_id = r.module_id) q on true
   where r.module_id between 1 and 8
   group by r.user_id
),
t as (
  select distinct on (user_id) user_id, score as теорія_бал, passed as теорія_складена,
         result_published_at as теорія_опублікована
    from public.theory_exam_attempts
   where result_published_at is not null
   order by user_id, attempt_number desc
),
p as (
  select distinct on (user_id) user_id, passed as практика_складена, distinction as відзнака,
         result_published_at as практика_опублікована
    from public.practical_exam_attempts
   where result_published_at is not null
   order by user_id, attempt_number desc
)
select v.full_name as "студентка", v.email,
       m.модулів, m.усі_складені, m.найгірший_модуль,
       t.теорія_бал, t.теорія_складена,
       p.практика_складена, p.відзнака,
       c.certificate_no as "номер сертифіката",
       c.certificate_type as "тип зараз",
       -- кожна з чотирьох умов золотого диплома окремо
       (m.модулів = 8 and m.усі_складені)        as "1 модулі ок",
       (coalesce(m.найгірший_модуль,0) > 80)     as "2 модулі >80",
       (coalesce(t.теорія_бал,0) > 80)           as "3 теорія >80",
       (coalesce(p.відзнака,false))              as "4 відзнака"
  from v
  left join m on m.user_id = v.user_id
  left join t on t.user_id = v.user_id
  left join p on p.user_id = v.user_id
  left join public.issued_certificates c on c.user_id = v.user_id;

-- Чи є взагалі колонка «відзнака» в базі (якщо false — не запускався
-- supabase-certificates-patch.sql, і галочка не зберігається):
select exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='practical_exam_attempts'
                  and column_name='distinction') as "колонка distinction є";
