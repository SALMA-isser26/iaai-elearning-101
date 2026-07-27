-- Migration : créer le bucket Storage 'avatars' (manquant)
--
-- Contexte : src/services/settingsService.js::uploadAvatar() upload déjà
-- vers le bucket 'avatars' (chemin '${userId}/avatar.${ext}') et c'est bien
-- ce service qui est branché sur le bouton "Changer la photo" dans
-- SettingsPage.jsx. Mais ce bucket n'a jamais été créé côté Supabase :
-- la fonctionnalité échouait donc en pratique avec une erreur
-- "Bucket not found".
--
-- (Le bucket 'images' créé dans 20240715000... / storage_bucket_rls
-- reste inutilisé par le code réel : src/services/storageService.js n'est
-- importé nulle part et a été retiré. On ne le supprime pas ici pour ne
-- pas perdre de données si un admin l'a déjà utilisé manuellement, mais
-- il n'est plus référencé par l'app.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- public : les avatars doivent être visibles sans authentification
  2097152, -- 2MB max, aligné sur la validation côté client (settingsService.js)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar file" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar file" ON storage.objects;

-- Lecture publique (les avatars sont affichés partout dans l'app)
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Un utilisateur ne peut écrire QUE dans son propre dossier '<son-uid>/...'
-- (settingsService.js uploade sur '${userId}/avatar.${ext}')
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own avatar file"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own avatar file"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NB : pas de COMMENT ON POLICY ici, storage.objects appartient à
-- supabase_storage_admin — le rôle de migration ne peut pas y ajouter
-- de commentaire (cf. note dans 20260715000001_storage_bucket_rls.sql).
-- Users upload own avatar : un utilisateur ne peut uploader que dans son
-- propre dossier avatars/<son-uid>/, jamais dans celui d'un autre.
