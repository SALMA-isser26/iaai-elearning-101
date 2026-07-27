-- Migration : corriger is_admin() pour inclure SUPER_ADMIN
-- Problème : la fonction is_admin() ne vérifie que le rôle 'ADMIN',
-- ce qui bloque les SUPER_ADMIN des opérations protégées par RLS.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Retourne true si l''utilisateur connecté a le rôle ADMIN ou SUPER_ADMIN dans profiles.';
