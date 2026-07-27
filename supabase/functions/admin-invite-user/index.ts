// supabase/functions/admin-invite-user/index.ts
// Invite un nouvel utilisateur par email (lien magique d'inscription).
// Nécessite le service role pour appeler auth.admin.inviteUserByEmail.
//
// Déploiement : supabase functions deploy admin-invite-user --project-ref <ref>
// Secrets requis : SB_URL, SB_SERVICE_ROLE_KEY, APP_URLS (ou APP_URL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";
// URL utilisée dans le lien d'invitation envoyé par email — on prend la
// première origine autorisée par défaut (généralement la prod).
const REDIRECT_BASE_URL = (Deno.env.get("APP_URLS") ?? Deno.env.get("APP_URL") ?? "http://localhost:5173")
  .split(",")[0]
  .trim();

const ADMIN_TIER_ROLES = ["SUPER_ADMIN", "ADMIN"];

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405, corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401, corsHeaders);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return json({ error: "Session invalide" }, 401, corsHeaders);

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !ADMIN_TIER_ROLES.includes(callerProfile.role)) {
      return json({ error: "Permissions insuffisantes" }, 403, corsHeaders);
    }

    const { email } = await req.json();
    if (!email || !EMAIL_RE.test(email)) {
      return json({ error: "Adresse email invalide" }, 400, corsHeaders);
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${REDIRECT_BASE_URL}/onboarding/step-1`,
    });

    if (error) {
      // Message plus clair si l'email existe déjà
      const msg = /already registered|already exists/i.test(error.message)
        ? "Un compte existe déjà avec cet email."
        : error.message;
      return json({ error: msg }, 400, corsHeaders);
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: caller.id,
      admin_email: caller.email,
      action: "user.invite",
      target_type: "user",
      target_id: data.user?.id ?? null,
      details: { email },
    });

    return json({ success: true, userId: data.user?.id }, 200, corsHeaders);
  } catch (err) {
    console.error("[admin-invite-user]", err);
    return json({ error: "Erreur interne" }, 500, corsHeaders);
  }
});
