create or replace function public.pe_student_theory_result()
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_uid uuid := auth.uid();
  v_attempt public.theory_exam_attempts%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select *
  into v_attempt
  from public.theory_exam_attempts
  where user_id = v_uid
  order by attempt_number desc
  limit 1;

  if not found then
    return jsonb_build_object('exists',false);
  end if;

  return jsonb_build_object(
    'exists',true,
    'attempt_number',v_attempt.attempt_number,
    'status',v_attempt.status,
    'result_published',v_attempt.result_published_at is not null,
    'score',case when v_attempt.result_published_at is not null then v_attempt.score else null end,
    'passed',case when v_attempt.result_published_at is not null then v_attempt.passed else null end,
    'published_at',v_attempt.result_published_at
  );
end;
$pe$;

grant execute on function public.pe_student_theory_result() to authenticated;
