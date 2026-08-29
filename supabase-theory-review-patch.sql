create or replace function public.pe_admin_theory_review(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $pe$
declare
  v_attempt public.theory_exam_attempts%rowtype;
  v_student jsonb;
  v_scores jsonb;
begin
  if not public.pe_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;

  select *
  into v_attempt
  from public.theory_exam_attempts
  where id = p_attempt_id;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select jsonb_build_object(
    'user_id', p.user_id,
    'full_name', p.full_name,
    'email', p.email
  )
  into v_student
  from public.profiles p
  where p.user_id = v_attempt.user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attempt_id', s.attempt_id,
        'question_no', s.question_no,
        'points', s.points,
        'reviewed_by', s.reviewed_by,
        'updated_at', s.updated_at
      )
      order by s.question_no
    ),
    '[]'::jsonb
  )
  into v_scores
  from public.theory_manual_scores s
  where s.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'attempt', to_jsonb(v_attempt),
    'student', coalesce(v_student,'{}'::jsonb),
    'scores', coalesce(v_scores,'[]'::jsonb)
  );
end;
$pe$;

grant execute on function public.pe_admin_theory_review(uuid) to authenticated;
