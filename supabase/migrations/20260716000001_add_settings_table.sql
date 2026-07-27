-- Migration : table `settings` (configuration système, page Admin > Paramètres)
--
-- Contexte du bug corrigé : AdminSettingsPage.jsx interroge `settings` depuis
-- le lancement du projet, mais aucune migration n'a jamais créé cette table.
-- PostgREST renvoie alors une erreur "table introuvable dans le schema cache"
-- (code PGRST205), que le frontend ne reconnaissait pas (il ne gérait que
-- PGRST116 = "aucune ligne trouvée"), d'où le message "Impossible de charger
-- les paramètres." — voir aussi le correctif apporté à AdminSettingsPage.jsx.
--
-- Choix : une seule ligne singleton (id = 1) avec un blob JSONB `data`,
-- même pattern que `profiles.preferences` déjà utilisé ailleurs dans le
-- projet. Ça évite les soucis de casse entre colonnes SQL (snake_case) et
-- clés JS (camelCase), et permet d'ajouter de nouveaux paramètres sans
-- nouvelle migration.

CREATE TABLE IF NOT EXISTS public.settings (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- une seule ligne possible
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ligne par défaut, avec les mêmes valeurs que le fallback côté frontend
-- (AdminSettingsPage.jsx) pour que le premier chargement soit cohérent.
INSERT INTO public.settings (id, data)
VALUES (1, '{
  "siteName": "IAAI eLearning 101",
  "siteDescription": "Plateforme d''apprentissage de l''intelligence artificielle",
  "maintenanceMode": false,
  "allowRegistration": true,
  "maxUsers": 1000,
  "stripePublicKey": "",
  "priceFree": 0,
  "pricePremium": 29.99,
  "currency": "EUR",
  "trialDays": 7,
  "emailFrom": "noreply@iaai-elearning.com",
  "emailFromName": "IAAI eLearning",
  "requireEmailVerification": true,
  "sessionTimeout": 30,
  "maxLoginAttempts": 5,
  "lockoutDuration": 15,
  "autoPublishFAQs": false,
  "moderateTestimonials": true,
  "defaultLessonOrder": "sequential"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Trigger updated_at (réutilise la fonction déjà définie par d'autres migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS : lecture et écriture réservées aux admins (is_admin() défini dans
-- 20260715000000_fix_is_admin_super_admin.sql)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON public.settings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pas de politique INSERT/DELETE : la ligne id=1 est créée une seule fois par
-- cette migration ; le frontend ne doit faire que du SELECT / UPDATE dessus.
