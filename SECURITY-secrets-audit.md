# Audit des secrets — IAAI eLearning 101

Dernière revue : 16 juillet 2026. Objectif : vérifier qu'aucun secret n'est
exposé côté client ou committé dans le code, et documenter où chaque secret
vit réellement.

## Méthode utilisée

- Recherche de motifs de clés (`sk_live_`, `sk_test_`, `AIza...`, JWT
  `eyJ...`, `service_role`) sur l'ensemble du repo hors `node_modules`/`dist`.
- Revue de tous les usages de `import.meta.env` (client) et `Deno.env.get`
  (Edge Functions).
- Revue du `.gitignore`, de `docker-compose.yml`, du `Dockerfile`, du
  `AdminSettingsPage.jsx` (déjà corrigé une fois par le passé pour une fuite
  de secret côté client) et de la table `settings` (RLS).
- **Non couvert par cet audit** : l'historique Git complet (le zip fourni ne
  contient pas de dossier `.git`). À faire séparément en local avec
  `git log -p --all | grep -iE "sk_live_|service_role|AIza"` ou un outil
  comme `trufflehog3`.

## Registre des secrets

| Secret | Où il vit | Qui l'utilise | Exposé côté client ? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Vercel env vars (build-time) | Frontend | Oui — public par design |
| `VITE_SUPABASE_ANON_KEY` | Vercel env vars (build-time) | Frontend | Oui — public par design, protégé par RLS |
| `SB_SERVICE_ROLE_KEY` | Supabase → Edge Functions → Secrets | `stripe-checkout`, `stripe-webhook`, `aria`, `admin-delete-user`, `admin-invite-user` | Non |
| `STRIPE_SECRET_KEY` | Supabase → Edge Functions → Secrets | `stripe-checkout`, `stripe-webhook` | Non |
| `STRIPE_WEBHOOK_SECRET` | Supabase → Edge Functions → Secrets | `stripe-webhook` | Non |
| `STRIPE_PRICE_ID` | Supabase → Edge Functions → Secrets | `stripe-checkout` | Non (pas un secret à proprement parler, mais gardé au même endroit) |
| `GEMINI_API_KEY` | Supabase → Edge Functions → Secrets **et** `.env` local (script d'ingestion) | `aria`, `scripts/embed-chunks.js` | Non |
| `APP_URL` / `APP_URLS` | Supabase → Edge Functions → Secrets | `_shared/cors.ts`, `admin-invite-user`, `stripe-checkout` | Non (URLs publiques de toute façon, pas un vrai secret) |

## Comment définir/faire tourner un secret Edge Function

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets list   # vérifier ce qui est déjà configuré, sans afficher les valeurs
```

En cas de fuite suspectée (ex: trouvée dans l'historique Git) : **révoquer et
régénérer côté fournisseur** (Stripe Dashboard → Developers → API keys ;
Supabase Dashboard → Settings → API pour la service role key ; Google AI
Studio pour Gemini), puis mettre à jour le secret côté Supabase. Retirer la
clé du code ne suffit jamais si elle a déjà été committée.

## Constat au 16/07/2026

Aucun secret en dur trouvé dans le code source, les Edge Functions, les
scripts, ou les fichiers de configuration Docker/Vercel. Les seules valeurs
exposées côté client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) sont
publiques par conception et protégées par les policies RLS plutôt que par
leur confidentialité. Point ouvert : vérifier l'historique Git complet
(non inclus dans cet audit, voir section Méthode).
