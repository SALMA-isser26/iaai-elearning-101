-- Anti-triche léger sur les quiz : journalise les sorties d'onglet/fenêtre
-- détectées côté client pendant un quiz. Une violation = quiz invalidé
-- immédiatement côté frontend ; cette table sert de journal consultable
-- par les admins/modérateurs (par étudiant, par quiz).

CREATE TABLE IF NOT EXISTS public.quiz_proctoring_violations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id       uuid REFERENCES public.quizzes(id) ON DELETE SET NULL,
  module_id     uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  violation_type text NOT NULL CHECK (violation_type IN ('tab_hidden', 'window_blur')),
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_violations_user ON public.quiz_proctoring_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_quiz ON public.quiz_proctoring_violations(quiz_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_created_at ON public.quiz_proctoring_violations(created_at DESC);

ALTER TABLE public.quiz_proctoring_violations ENABLE ROW LEVEL SECURITY;

-- Un utilisateur authentifié peut journaliser SA PROPRE violation (insert seul, pas de update/delete)
CREATE POLICY "Users can log their own violations"
  ON public.quiz_proctoring_violations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Un utilisateur peut consulter ses propres violations
CREATE POLICY "Users can view their own violations"
  ON public.quiz_proctoring_violations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Les admins/modérateurs (rôle stocké sur profiles.role) voient tout
CREATE POLICY "Admins and moderators can view all violations"
  ON public.quiz_proctoring_violations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')
    )
  );
