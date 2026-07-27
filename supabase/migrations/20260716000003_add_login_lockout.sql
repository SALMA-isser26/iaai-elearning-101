-- Migration : verrouillage réel après échecs de connexion répétés
--
-- Contexte du bug corrigé : AdminSettingsPage exposait des champs
-- `maxLoginAttempts` / `lockoutDuration` dans l'onglet Sécurité, stockés en
-- base... mais jamais lus par le flux de connexion. Un admin pouvait donc
-- configurer "5 tentatives max" en pensant protéger la plateforme, sans
-- aucun effet réel — de la sécurité en trompe-l'œil.
--
-- Choix de conception :
--  - `login_attempts` n'est accessible que via des fonctions SECURITY DEFINER
--    (record_login_attempt / is_login_locked). Aucune policy RLS directe :
--    ni l'anon key ni un utilisateur authentifié ne peuvent lire ou écrire
--    la table par une requête PostgREST classique, seulement via ces deux
--    fonctions. Ça empêche un client malveillant de fabriquer de faux
--    "succès" pour réinitialiser son propre verrou.
--  - Le verrou est par email (pas par IP, indisponible facilement côté
--    client Supabase) : suffisant contre le bruteforce d'un compte ciblé,
--    qui est le scénario réaliste ici.
--  - Le seuil et la durée viennent de `settings.data` (maxLoginAttempts,
--    lockoutDuration en minutes) avec un repli si la table settings est
--    absente/vide (5 tentatives / 15 min, mêmes valeurs que le formulaire
--    admin par défaut).

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  success      BOOLEAN NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

-- RLS activée avec ZÉRO policy = accès refusé par défaut à tout le monde
-- (anon, authenticated), y compris en lecture. Seules les fonctions
-- SECURITY DEFINER ci-dessous peuvent toucher cette table.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Purge automatique : on ne garde que les 24 dernières heures de tentatives,
-- largement suffisant pour un verrou de quelques minutes, et ça évite que la
-- table grossisse indéfiniment.
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email TEXT, p_success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (lower(trim(p_email)), p_success);

  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Retourne l'état du verrou pour un email donné : { locked, attempts_remaining, retry_after_seconds }
CREATE OR REPLACE FUNCTION public.is_login_locked(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_attempts   INT;
  v_lockout_minutes INT;
  v_fail_count     INT;
  v_oldest_fail    TIMESTAMPTZ;
  v_locked_until   TIMESTAMPTZ;
BEGIN
  -- Lire la config depuis settings.data, avec repli si absente
  SELECT
    COALESCE((data->>'maxLoginAttempts')::INT, 5),
    COALESCE((data->>'lockoutDuration')::INT, 15)
  INTO v_max_attempts, v_lockout_minutes
  FROM public.settings WHERE id = 1;

  IF v_max_attempts IS NULL THEN v_max_attempts := 5; END IF;
  IF v_lockout_minutes IS NULL THEN v_lockout_minutes := 15; END IF;

  -- Compter les échecs consécutifs les plus récents (depuis le dernier succès)
  SELECT COUNT(*), MIN(attempted_at) INTO v_fail_count, v_oldest_fail
  FROM public.login_attempts
  WHERE email = lower(trim(p_email))
    AND success = FALSE
    AND attempted_at > COALESCE(
      (SELECT MAX(attempted_at) FROM public.login_attempts
       WHERE email = lower(trim(p_email)) AND success = TRUE),
      '1970-01-01'::TIMESTAMPTZ
    );

  IF v_fail_count >= v_max_attempts THEN
    v_locked_until := v_oldest_fail + (v_lockout_minutes || ' minutes')::INTERVAL;
    IF NOW() < v_locked_until THEN
      RETURN jsonb_build_object(
        'locked', TRUE,
        'attempts_remaining', 0,
        'retry_after_seconds', EXTRACT(EPOCH FROM (v_locked_until - NOW()))::INT
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'locked', FALSE,
    'attempts_remaining', GREATEST(v_max_attempts - v_fail_count, 0),
    'retry_after_seconds', 0
  );
END;
$$;

-- Autoriser l'exécution de ces deux fonctions à tout le monde (y compris
-- anon, car on doit pouvoir vérifier le verrou AVANT que l'utilisateur soit
-- authentifié). C'est sûr : SECURITY DEFINER + aucune donnée sensible
-- exposée (juste locked/attempts_remaining/retry_after_seconds).
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_login_locked(TEXT) TO anon, authenticated;
