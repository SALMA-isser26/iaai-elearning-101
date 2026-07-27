-- Migration : créer le bucket Storage 'images' et ses policies RLS
-- Nécessaire pour l'upload d'avatars et de vignettes de modules.

-- Créer le bucket 'images' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,  -- public : les URLs sont accessibles sans authentification
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage module thumbnails" ON storage.objects;

-- Policy 1 : lecture publique (avatars visibles sans connexion)
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Policy 2 : tout utilisateur authentifié peut uploader son avatar
CREATE POLICY "Auth users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- Policy 3 : l'utilisateur peut écraser/mettre à jour son propre avatar
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- Policy 4 : l'utilisateur peut supprimer son propre avatar
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- Policy 5 : seuls les admins peuvent gérer les vignettes de modules
CREATE POLICY "Admins manage module thumbnails"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'modules'
    AND (
      auth.role() = 'service_role' OR
      public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'modules'
    AND (
      auth.role() = 'service_role' OR
      public.is_admin()
    )
  );

-- NB : pas de COMMENT ON POLICY ici — storage.objects appartient à un rôle
-- système (supabase_storage_admin), le rôle de migration n'a pas le droit
-- d'ajouter un commentaire dessus (COMMENT ON POLICY exige d'être owner de
-- la relation), même s'il peut bien y créer des policies.
-- Public read images        : les images (avatars, vignettes) sont publiquement lisibles.
-- Auth users upload avatars : tout utilisateur authentifié peut uploader dans le dossier avatars/
-- Admins manage module thumbnails : seuls les admins peuvent gérer les vignettes dans modules/
