-- Pole Education · Supabase keep-alive
-- Run once in Supabase SQL Editor.
-- Safe public RPC: performs a tiny database query and returns no private data.

create or replace function public.pe_keepalive()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'project', 'pole-education-judge-academy',
    'checked_at', now()
  );
$$;

revoke all on function public.pe_keepalive() from public;
grant execute on function public.pe_keepalive() to anon, authenticated;
