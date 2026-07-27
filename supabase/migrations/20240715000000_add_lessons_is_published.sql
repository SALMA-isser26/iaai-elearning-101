-- Ajouter la colonne is_published à la table lessons
-- Permet de gérer le workflow de publication des leçons

ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.lessons.is_published IS 
  'Indique si la leçon est publiée et visible par les apprenants. Les brouillons (false) ne sont visibles que par les admins.';

-- Mettre à jour les leçons existantes comme publiées par défaut
-- (pour ne pas casser le contenu existant)
UPDATE public.lessons 
SET is_published = true 
WHERE is_published IS NULL;
