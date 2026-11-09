-- Список усіх сертифікатів для адміністратора
-- ===========================================
-- Запусти цей файл цілком в Supabase → SQL Editor.
-- Він нічого не змінює й не стирає: додає одну функцію читання.
--
-- Навіщо. Сторінка друку намагалася читати таблицю issued_certificates
-- напряму з браузера й отримувала «permission denied»: ролі authenticated
-- ніколи не видавали дозволу на цю таблицю. Решта сайту цього не помічала,
-- бо читає сертифікати через security definer функції, які дозволи на
-- таблицю обходять. Замість того щоб відкривати таблицю назовні, тут
-- зроблено те саме, що й усюди: одна функція, яка сама перевіряє, що її
-- викликає адміністратор.

create or replace function public.pe_admin_certificates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $pe$
declare
  v_certs jsonb;
  v_without jsonb;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.issued_at), '[]'::jsonb)
    into v_certs
    from public.issued_certificates c
   where c.is_active;

  -- Запис про сертифікат з’являється тоді, коли студентка вперше відкриває
  -- його у себе в кабінеті. Хто цього ще не робив — друкувати нема з чого,
  -- і сторінка має показати їх окремо, а не мовчки пропустити.
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', p.user_id,
           'full_name', p.full_name,
           'email', p.email
         ) order by p.full_name nulls last), '[]'::jsonb)
    into v_without
    from public.profiles p
   where coalesce(p.role,'student') <> 'admin'
     and not exists (select 1 from public.issued_certificates c
                      where c.user_id = p.user_id and c.is_active);

  return jsonb_build_object('certificates', v_certs, 'without_certificate', v_without);
end;
$pe$;

grant execute on function public.pe_admin_certificates() to authenticated;
