-- Audit des policies RLS du schéma de base
-- But : documenter et vérifier les policies RLS existantes sur les tables principales
-- Tables concernées : profiles, lessons, quizzes, faqs, testimonials, etc.

-- Activer RLS sur les tables principales si pas déjà fait
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Profiles : lecture publique limitée, écriture restreinte
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage profiles"
  ON public.profiles
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin()
  );

-- Lessons : déjà protégé par la migration 20240715000001_lessons_rls_policies.sql
-- Cette migration assure que les policies existent et sont correctes

-- Quizzes : protection similaire aux lessons
-- La colonne is_published n'a jamais été ajoutée à quizzes (contrairement à
-- modules et lessons qui ont chacun leur migration dédiée) alors que le code
-- applicatif (quizService.js, AdminQuizzesPage.jsx) l'utilise déjà. On l'ajoute
-- ici avant de créer la policy qui en dépend.
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.quizzes.is_published IS
  'Indique si le quiz est publié et visible par les apprenants. Les brouillons (false) ne sont visibles que par les admins.';

-- Ne pas casser le contenu existant : quiz déjà en place considérés publiés
UPDATE public.quizzes
SET is_published = true
WHERE is_published IS NULL;

DROP POLICY IF EXISTS "Public can view published quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can manage quizzes" ON public.quizzes;

CREATE POLICY "Public can view published quizzes"
  ON public.quizzes
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage quizzes"
  ON public.quizzes
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin()
  );

-- FAQs : déjà protégé par la migration 20240710110000_add_faqs.sql
-- Cette migration assure que les policies existent et sont correctes

-- Testimonials : lecture publique, écriture admin
-- Note : la colonne réelle est `is_published` (cf. testimonialService.js), pas `is_approved`
DROP POLICY IF EXISTS "Public can view approved testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;

CREATE POLICY "Public can view approved testimonials"
  ON public.testimonials
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_admin()
  );

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS
  'Les utilisateurs peuvent voir leur propre profil uniquement.';

COMMENT ON POLICY "Users can update own profile" ON public.profiles IS
  'Les utilisateurs peuvent modifier leur propre profil uniquement.';

COMMENT ON POLICY "Admins can manage profiles" ON public.profiles IS
  'Les admins peuvent gérer tous les profils. Les service_role (Edge Functions) aussi.';

COMMENT ON POLICY "Public can view published quizzes" ON public.quizzes IS
  'Les visiteurs du catalogue public ne voient que les quiz publiés.';

COMMENT ON POLICY "Admins can manage quizzes" ON public.quizzes IS
  'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';

COMMENT ON POLICY "Public can view approved testimonials" ON public.testimonials IS
  'Les visiteurs ne voient que les témoignages publiés (is_published = true).';

COMMENT ON POLICY "Admins can manage testimonials" ON public.testimonials IS
  'Les admins peuvent gérer tous les témoignages. Les service_role (Edge Functions) aussi.';
