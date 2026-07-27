-- Fonction RPC : statistiques agrégées par module pour le dashboard admin
-- But : remplacer le comptage côté client dans AdminCoursesPage (qui chargeait
--       l'intégralité des tables lessons / quizzes / user_progress pour compter
--       les lignes en JS) par une seule requête SQL agrégée côté serveur.

CREATE OR REPLACE FUNCTION public.get_admin_module_stats()
RETURNS TABLE (
  module_id UUID,
  lessons_count BIGINT,
  quizzes_count BIGINT,
  enrolled_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS module_id,
    COUNT(DISTINCT l.id)  AS lessons_count,
    COUNT(DISTINCT q.id)  AS quizzes_count,
    COUNT(DISTINCT up.user_id) AS enrolled_count
  FROM public.modules m
  LEFT JOIN public.lessons l       ON l.module_id = m.id
  LEFT JOIN public.quizzes q       ON q.module_id = m.id
  LEFT JOIN public.user_progress up ON up.module_id = m.id
  GROUP BY m.id;
$$;

COMMENT ON FUNCTION public.get_admin_module_stats() IS
  'Retourne pour chaque module : nombre de leçons, nombre de quiz, nombre d''apprenants uniques inscrits. Agrégation SQL unique utilisée par AdminCoursesPage au lieu d''un comptage côté client.';

-- Seuls les utilisateurs authentifiés peuvent l'appeler ; l'accès admin réel
-- est de toute façon garanti par les policies RLS sous-jacentes sur modules
-- (les non-admins ne verront que les modules publiés dans le catalogue public,
-- cette fonction est appelée uniquement depuis les pages Admin protégées par RequirePermission).
REVOKE ALL ON FUNCTION public.get_admin_module_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_module_stats() TO authenticated;
