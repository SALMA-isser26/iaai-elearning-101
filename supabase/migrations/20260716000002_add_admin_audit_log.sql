-- Migration : table `admin_audit_log` (traçabilité des actions admin)
--
-- Contexte : aucune action admin sensible (suppression d'utilisateur,
-- invitation, changement de paramètres système) n'était journalisée nulle
-- part. En cas d'incident (compte supprimé par erreur, paramètre modifié de
-- façon inattendue), impossible de savoir qui a fait quoi et quand.
--
-- Choix de conception :
--  - Append-only : aucune politique UPDATE/DELETE, même pour les admins,
--    pour qu'un log ne puisse jamais être maquillé après coup.
--  - `admin_id` en SET NULL sur suppression du compte admin (on garde la
--    trace de l'action même si le compte qui l'a faite est ensuite supprimé).
--  - `details` en JSONB libre : permet de loguer un contexte différent selon
--    le type d'action sans faire évoluer le schéma à chaque fois.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,                     -- copié au moment de l'action, survit même si le compte est supprimé
  action      TEXT NOT NULL,            -- ex: 'user.delete', 'user.invite', 'settings.update'
  target_type TEXT,                     -- ex: 'user', 'settings'
  target_id   TEXT,                     -- id de la cible (userId, etc.) — TEXT pour rester flexible
  details     JSONB DEFAULT '{}'::jsonb,-- contexte libre (email invité, champs modifiés, etc.)
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id   ON public.admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action      ON public.admin_audit_log (action);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux admins (is_admin() défini dans
-- 20260715000000_fix_is_admin_super_admin.sql)
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_admin());

-- Écriture réservée aux admins également : les actions déclenchées côté
-- client (ex: changement de paramètres, pas d'Edge Function) doivent pouvoir
-- écrire leur propre log. Les Edge Functions (service role) contournent RLS
-- de toute façon et n'ont pas besoin de cette policy.
CREATE POLICY "Admins can insert audit log entries"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_admin());

-- Pas de policy UPDATE ni DELETE : le journal est immuable, y compris pour
-- les administrateurs, via l'API PostgREST/anon-key. Une purge éventuelle
-- (rétention de données) doit passer par une tâche planifiée avec le service
-- role, pas par l'application.
