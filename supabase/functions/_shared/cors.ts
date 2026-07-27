// supabase/functions/_shared/cors.ts
//
// Bug corrigé : chaque Edge Function fixait un unique `Access-Control-Allow-Origin`
// via le secret APP_URL (ex: l'URL de prod Vercel). Résultat : dès que l'appel
// venait d'une autre origine (ex: http://localhost:5173 en développement), le
// navigateur bloquait la réponse au niveau du preflight CORS et le SDK
// supabase-js remontait "Failed to send a request to the Edge Function" — un
// message générique qui ne dit rien sur la vraie cause (CORS), d'où la
// confusion en debug.
//
// Fix : le secret APP_URLS (nouveau, au pluriel) accepte une liste d'origines
// séparées par des virgules. On reflète l'origine de la requête entrante si
// elle est dans la liste, sinon on retombe sur la première autorisée.
//
// Secret à définir sur le projet Supabase :
//   supabase secrets set APP_URLS="http://localhost:5173,https://iaai-elearning-101.vercel.app"
//
// Rétrocompatible avec l'ancien secret APP_URL (une seule origine) si APP_URLS
// n'est pas encore configuré.

const ALLOWED_ORIGINS = (
  Deno.env.get("APP_URLS") ??
  Deno.env.get("APP_URL") ??
  "http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
