-- ─────────────────────────────────────────────────────────────────────────────
-- Vérification publique des certificats (page /verify/:certificate_number)
--
-- Contexte : la migration du 2026-07-19 a supprimé la policy RLS
-- "certificates: vérification publique" (elle exposait toute la table aux
-- utilisateurs authentifiés). Depuis, aucune policy ne permet de lire un
-- certificat par son numéro, et la page de vérification publique renvoie
-- une 404 / échoue silencieusement.
--
-- Plutôt que de rouvrir une policy SELECT large (qui exposerait user_id et
-- permettrait l'énumération via la table elle-même), on expose une fonction
-- SECURITY DEFINER en lecture seule, restreinte aux colonnes strictement
-- nécessaires à l'affichage public : nom, parcours, score, date, numéro.
-- Elle ne retourne rien si le numéro ne correspond à aucun certificat.
-- ─────────────────────────────────────────────────────────────────────────────

-- Une version antérieure de cette fonction existe peut-être déjà en base
-- (créée hors migration, ou avec une signature/un type de retour différent).
-- Postgres refuse un CREATE OR REPLACE qui changerait le type de retour,
-- donc on la supprime d'abord explicitement.
DROP FUNCTION IF EXISTS public.verify_certificate(text);

CREATE OR REPLACE FUNCTION public.verify_certificate(p_certificate_number text)
RETURNS TABLE (
  full_name text,
  module_title text,
  score integer,
  issued_at timestamptz,
  certificate_number text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    p.full_name,
    m.title AS module_title,
    c.score,
    c.issued_at,
    c.certificate_number
  FROM public.certificates c
  JOIN public.profiles p ON p.id = c.user_id
  LEFT JOIN public.modules m ON m.id = c.module_id
  WHERE c.certificate_number = p_certificate_number;
$$;

-- Accessible sans authentification (portail public de vérification)
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
