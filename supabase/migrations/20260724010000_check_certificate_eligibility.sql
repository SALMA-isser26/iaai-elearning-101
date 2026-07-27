-- ─────────────────────────────────────────────────────────────────────────────
-- Complète la migration du 21/07 (certificat unique de fin de parcours).
--
-- Contexte : certificateService.js (côté client) était resté sur l'ancien
-- modèle "un certificat par module" :
--   - checkCertificateEligibility(userId, moduleId) vérifiait un seul module ;
--     appelée sans moduleId depuis QuizResultPage/CurriculumPage, elle
--     retournait systématiquement `eligible: false` (module_id = undefined).
--   - generateCertificate faisait un INSERT direct dans `certificates`, or
--     la migration du 19/07 a fait REVOKE INSERT ... FROM anon, authenticated :
--     même éligible, l'insertion aurait échoué (permission refusée).
--
-- Cette fonction expose, en lecture seule, la même logique d'éligibilité que
-- issue_certificate() (parcours complet = toutes les leçons de tous les
-- modules publiés + quiz réussi pour chacun), sans effet de bord, pour que
-- l'UI puisse afficher un état "éligible / pas encore" avant d'émettre.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_certificate_eligibility()
RETURNS TABLE (
  eligible boolean,
  avg_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_incomplete_modules integer;
  v_avg_score integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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

  SELECT round(avg(best_score))::integer INTO v_avg_score
  FROM (
    SELECT qa.module_id, max(qa.score) AS best_score
    FROM public.quiz_attempts qa
    WHERE qa.user_id = v_user_id AND qa.passed = true
    GROUP BY qa.module_id
  ) per_module_scores;

  RETURN QUERY SELECT (v_incomplete_modules = 0), coalesce(v_avg_score, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_certificate_eligibility() TO authenticated;
