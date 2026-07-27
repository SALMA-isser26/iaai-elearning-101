-- 20240713_add_modules_description.sql
-- La modale d'édition des modules dans l'admin utilise un champ "description"
-- qui n'était jamais persisté (le bouton "Enregistrer" ne sauvegardait rien).
-- On s'assure que la colonne existe réellement avant de brancher la sauvegarde,
-- sans écraser quoi que ce soit si elle existe déjà dans le schéma de base.

alter table public.modules
  add column if not exists description text;