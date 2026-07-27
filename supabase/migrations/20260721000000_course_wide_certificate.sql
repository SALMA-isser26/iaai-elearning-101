-- ─────────────────────────────────────────────────────────────────────────────
-- CORRECTION : un seul certificat par utilisateur (fin de parcours complet),
-- au lieu d'un certificat par module.
--
-- Avant : issue_certificate(p_module_id) vérifiait uniquement le module passé
--         en paramètre → un certificat était émis dès le 1er quiz réussi.
-- Après : issue_certificate() vérifie TOUS les modules publiés (leçons +
--         quiz) avant d'émettre l'unique certificat de l'utilisateur.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. La table certificates n'est plus liée à un module précis.
ALTER TABLE public.certificates
  ALTER COLUMN module_id DROP NOT NULL;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_user_id_module_id_key;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_user_id_key UNIQUE (user_id);

-- 2. Nouvelle fonction : vérifie l'ensemble du parcours, pas un module isolé.
DROP FUNCTION IF EXISTS public.issue_certificate(uuid);

CREATE OR REPLACE FUNCTION public.issue_certificate()
RETURNS public.certificates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_incomplete_modules integer;
  v_avg_score integer;
  v_certificate public.certificates;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Un module est "incomplet" s'il lui manque au moins une leçon terminée
  -- par l'utilisateur, OU s'il n'a pas de tentative de quiz réussie.
  SELECT count(*) INTO v_incomplete_modules
  FROM public.modules m
  WHERE m.is_published = true
    AND (
      EXISTS (
        SELECT 1 FROM public.lessons l
        WHERE l.module_id = m.id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_progress up
          WHERE up.user_id = v_user_id
            AND up.lesson_id = l.id
            AND up.completed = true
        )
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.quiz_attempts qa
        WHERE qa.user_id = v_user_id
          AND qa.module_id = m.id
          AND qa.passed = true
      )
    );

  IF v_incomplete_modules > 0 THEN
    RAISE EXCEPTION 'Certificate requirements not met';
  END IF;

  -- Certificat déjà émis pour cet utilisateur ? On le retourne tel quel.
  SELECT * INTO v_certificate
  FROM public.certificates
  WHERE user_id = v_user_id;
  IF FOUND THEN
    RETURN v_certificate;
  END IF;

  -- Score : moyenne de la meilleure tentative réussie par module.
  SELECT round(avg(best_score))::integer INTO v_avg_score
  FROM (
    SELECT qa.module_id, max(qa.score) AS best_score
    FROM public.quiz_attempts qa
    WHERE qa.user_id = v_user_id AND qa.passed = true
    GROUP BY qa.module_id
  ) per_module_scores;

  INSERT INTO public.certificates (user_id, module_id, certificate_number, score, issued_at)
  VALUES (
    v_user_id,
    NULL,
    'IAAI-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    coalesce(v_avg_score, 0),
    now()
  ) RETURNING * INTO v_certificate;

  RETURN v_certificate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate() TO authenticated;
