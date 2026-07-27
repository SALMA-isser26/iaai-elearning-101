-- RLS publique sur lessons
-- But : les visiteurs non-admin ne voient que les leçons publiées (is_published = true)
--       les admins voient tout (nécessaire pour l'admin)

-- Activer RLS si pas déjà fait
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent (évite les conflits en cas de ré-exécution)
DROP POLICY IF EXISTS "Public can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;

-- Policy 1 : tout le monde (y compris non-authentifié) voit uniquement les leçons publiées
CREATE POLICY "Public can view published lessons"
  ON public.lessons
  FOR SELECT
  USING (is_published = true);

-- Policy 2 : les admins peuvent SELECT/INSERT/UPDATE/DELETE toutes les leçons
CREATE POLICY "Admins can manage lessons"
  ON public.lessons
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin()
  );

COMMENT ON POLICY "Public can view published lessons" ON public.lessons IS
  'Les visiteurs du catalogue public ne voient que les leçons publiées.';

COMMENT ON POLICY "Admins can manage lessons" ON public.lessons IS
  'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';
