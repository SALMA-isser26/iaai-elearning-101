-- Phase 2 : RLS publique sur modules
-- But : les visiteurs non-admin ne voient que les modules publiés (is_published = true)
--       les admins voient tout (nécessaire pour l'admin)

-- Créer la fonction is_admin() si elle n'existe pas déjà
-- (utilisée par les policies RLS pour vérifier si l'utilisateur connecté est admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Retourne true si l''utilisateur connecté a le rôle ADMIN dans profiles.';

-- Activer RLS si pas déjà fait
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent (évite les conflits en cas de ré-exécution)
DROP POLICY IF EXISTS "Public can view published modules" ON public.modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;

-- Policy 1 : tout le monde (y compris non-authentifié) voit uniquement les modules publiés
CREATE POLICY "Public can view published modules"
  ON public.modules
  FOR SELECT
  USING (is_published = true);

-- Policy 2 : les admins peuvent SELECT/INSERT/UPDATE/DELETE tous les modules
CREATE POLICY "Admins can manage modules"
  ON public.modules
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin()
  );

COMMENT ON POLICY "Public can view published modules" ON public.modules IS
  'Les visiteurs du catalogue public ne voient que les modules publiés.';

COMMENT ON POLICY "Admins can manage modules" ON public.modules IS
  'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';
