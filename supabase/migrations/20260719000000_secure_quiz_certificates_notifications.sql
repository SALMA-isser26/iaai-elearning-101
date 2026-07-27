-- Les résultats, certificats et notifications sont des données de confiance :
-- ils ne doivent jamais être fournis directement par le navigateur.

DROP POLICY IF EXISTS "own_insert_quiz_attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts: insérer les siennes" ON public.quiz_attempts;
DROP POLICY IF EXISTS "allow_authenticated_read_certificates" ON public.certificates;
DROP POLICY IF EXISTS "certificates: insérer les siens" ON public.certificates;
DROP POLICY IF EXISTS "own_write_certificates" ON public.certificates;
DROP POLICY IF EXISTS "certificates: vérification publique" ON public.certificates;
DROP POLICY IF EXISTS "service_role_insert_notifications" ON public.notifications;

REVOKE INSERT ON TABLE public.quiz_attempts FROM anon, authenticated;
REVOKE INSERT ON TABLE public.certificates FROM anon, authenticated;
REVOKE INSERT ON TABLE public.notifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  id uuid,
  quiz_id uuid,
  module_id uuid,
  score integer,
  passed boolean,
  correct integer,
  total integer,
  attempted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_module_id uuid;
  v_passing_score integer;
  v_question record;
  v_answer_id uuid;
  v_correct integer := 0;
  v_total integer := 0;
  v_score integer;
  v_passed boolean;
  v_answers_given jsonb := '[]'::jsonb;
  v_attempt public.quiz_attempts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF jsonb_typeof(COALESCE(p_answers, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Answers must be an array';
  END IF;

  SELECT q.module_id, q.passing_score
  INTO v_module_id, v_passing_score
  FROM public.quizzes q
  WHERE q.id = p_quiz_id AND q.is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz unavailable';
  END IF;

  FOR v_question IN SELECT q.id FROM public.questions q WHERE q.quiz_id = p_quiz_id
  LOOP
    v_total := v_total + 1;
    v_answer_id := NULL;

    BEGIN
      SELECT NULLIF(answer->>'answerId', '')::uuid
      INTO v_answer_id
      FROM jsonb_array_elements(COALESCE(p_answers, '[]'::jsonb)) answer
      WHERE answer->>'questionId' = v_question.id::text
      LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      v_answer_id := NULL;
    END;

    IF v_answer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.answers a
      WHERE a.id = v_answer_id AND a.question_id = v_question.id AND a.is_correct = true
    ) THEN
      v_correct := v_correct + 1;
    END IF;

    IF v_answer_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.answers a WHERE a.id = v_answer_id AND a.question_id = v_question.id
    ) THEN
      v_answers_given := v_answers_given || jsonb_build_array(
        jsonb_build_object('questionId', v_question.id, 'answerId', v_answer_id)
      );
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Quiz has no questions';
  END IF;

  v_score := round((v_correct::numeric / v_total) * 100)::integer;
  v_passed := v_score >= v_passing_score;

  INSERT INTO public.quiz_attempts (user_id, quiz_id, module_id, score, passed, answers_given, attempted_at)
  VALUES (v_user_id, p_quiz_id, v_module_id, v_score, v_passed, v_answers_given, now())
  RETURNING * INTO v_attempt;

  RETURN QUERY SELECT v_attempt.id, v_attempt.quiz_id, v_attempt.module_id,
    v_attempt.score, v_attempt.passed, v_correct, v_total, v_attempt.attempted_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_certificate(p_module_id uuid)
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_lessons integer;
  v_completed_lessons integer;
  v_score integer;
  v_certificate public.certificates;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(*) INTO v_total_lessons FROM public.lessons WHERE module_id = p_module_id;
  IF v_total_lessons = 0 THEN
    RAISE EXCEPTION 'Module unavailable';
  END IF;

  SELECT count(*) INTO v_completed_lessons
  FROM public.user_progress
  WHERE user_id = v_user_id AND module_id = p_module_id AND completed = true;

  SELECT qa.score INTO v_score
  FROM public.quiz_attempts qa
  WHERE qa.user_id = v_user_id AND qa.module_id = p_module_id AND qa.passed = true
  ORDER BY qa.score DESC, qa.attempted_at ASC
  LIMIT 1;

  IF v_completed_lessons <> v_total_lessons OR v_score IS NULL THEN
    RAISE EXCEPTION 'Certificate requirements not met';
  END IF;

  SELECT * INTO v_certificate
  FROM public.certificates
  WHERE user_id = v_user_id AND module_id = p_module_id;
  IF FOUND THEN
    RETURN v_certificate;
  END IF;

  INSERT INTO public.certificates (user_id, module_id, certificate_number, score, issued_at)
  VALUES (
    v_user_id,
    p_module_id,
    'IAAI-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    v_score,
    now()
  ) RETURNING * INTO v_certificate;

  RETURN v_certificate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid) TO authenticated;
