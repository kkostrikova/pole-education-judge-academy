-- Перевірка: чи встановлено архівування та видалення студента
-- ===========================================================
-- Нічого не змінює. Запусти в Supabase → SQL Editor і надішли мені результат.
-- У колонці «є» має бути true навпроти кожного рядка.

select e.тип, e.обʼєкт,
       case when e.тип = 'функція'
            then exists (select 1
                           from pg_proc p
                           join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = e.обʼєкт)
            when e.тип = 'колонка'
            then exists (select 1
                           from information_schema.columns c
                          where c.table_schema = 'public'
                            and c.table_name = 'profiles'
                            and c.column_name = e.обʼєкт)
            else false
       end as "є"
  from (values
         ('колонка', 'archived_at'),
         ('колонка', 'archived_by'),
         ('функція', 'pe_admin_archive_student'),
         ('функція', 'pe_admin_restore_student'),
         ('функція', 'pe_admin_student_footprint'),
         ('функція', 'pe_admin_delete_student'),
         ('функція', 'pe_nda_status'),
         ('функція', 'pe_is_admin')
       ) as e(тип, обʼєкт);

-- Чи бачить база саме тебе як адміністратора:
select auth.uid() as "мій id",
       public.pe_is_admin() as "я адмін",
       (select role from public.profiles where user_id = auth.uid()) as "роль у профілі";
