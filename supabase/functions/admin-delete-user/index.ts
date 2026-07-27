// supabase/functions/admin-delete-user/index.ts
// Suppression sécurisée d'un ou plusieurs utilisateurs :
//  - vérifie que l'appelant est authentifié ET a un rôle admin-tier (ADMIN/SUPER_ADMIN)
//  - supprime le compte auth.users via le service role (impossible depuis le client)
//  - la suppression de `profiles` suit automatiquement si une contrainte
//    FK ON DELETE CASCADE existe vers auth.users (à vérifier dans le schéma) ;
//    sinon on la fait explicitement ci-dessous pour rester robuste.
//
// Déploiement : supabase functions deploy admin-delete-user --project-ref <ref>
// Secrets requis : SB_URL, SB_SERVICE_ROLE_KEY, APP_URLS (ou APP_URL)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";

const ADMIN_TIER_ROLES = ["SUPER_ADMIN", "ADMIN"];

function json(body: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405, corsHeaders);

  try {
    // ── 1. Authentifier l'appelant ─────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401, corsHeaders);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) return json({ error: "Session invalide" }, 401, corsHeaders);

    // ── 2. Vérifier que l'appelant est bien admin-tier ─────────────────────
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !ADMIN_TIER_ROLES.includes(callerProfile.role)) {
      return json({ error: "Permissions insuffisantes" }, 403, corsHeaders);
    }

    // ── 3. Récupérer la/les cible(s) ───────────────────────────────────────
    const body = await req.json();
    const targetIds: string[] = body.userIds
      ? body.userIds
      : body.userId
        ? [body.userId]
        : [];

    if (targetIds.length === 0) return json({ error: "userId ou userIds requis" }, 400, corsHeaders);
    if (targetIds.includes(caller.id)) {
      return json({ error: "Vous ne pouvez pas vous supprimer vous-même." }, 400, corsHeaders);
    }

    // ── 4. Empêcher de supprimer le dernier admin-tier ─────────────────────
    const { count: totalAdminTier } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ADMIN_TIER_ROLES);

    const { count: targetsAdminTier } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("id", targetIds)
      .in("role", ADMIN_TIER_ROLES);

    if ((targetsAdminTier ?? 0) > 0 && (targetsAdminTier ?? 0) >= (totalAdminTier ?? 0)) {
      return json({ error: "Impossible : cela supprimerait tous les comptes administrateurs." }, 400, corsHeaders);
    }

    // ── 5. Suppression effective (auth.users + profiles) ───────────────────
    const results = await Promise.allSettled(
      targetIds.map((id) => supabase.auth.admin.deleteUser(id))
    );

    const failed = results
      .map((r, i) => ({ r, id: targetIds[i] }))
      .filter(({ r }) => r.status === "rejected");

    // Filet de sécurité : si une contrainte FK n'a pas de CASCADE, on nettoie
    // manuellement la ligne profiles orpheline pour les suppressions réussies.
    const succeededIds = targetIds.filter((id) => !failed.some((f) => f.id === id));
    if (succeededIds.length > 0) {
      await supabase.from("profiles").delete().in("id", succeededIds);
    }

    if (failed.length > 0) {
      // On journalise quand même les suppressions qui ont réussi, même si
      // d'autres ont échoué dans le même lot.
      if (succeededIds.length > 0) {
        await supabase.from("admin_audit_log").insert({
          admin_id: caller.id,
          admin_email: caller.email,
          action: "user.delete",
          target_type: "user",
          target_id: succeededIds.join(","),
          details: { requested: targetIds, succeeded: succeededIds, failed: failed.map((f) => f.id) },
        });
      }
      return json(
        { error: `${failed.length} suppression(s) ont échoué`, failedIds: failed.map((f) => f.id) },
        207,
        corsHeaders
      );
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: caller.id,
      admin_email: caller.email,
      action: "user.delete",
      target_type: "user",
      target_id: succeededIds.join(","),
      details: { deleted: succeededIds },
    });

    return json({ success: true, deleted: succeededIds }, 200, corsHeaders);
  } catch (err) {
    console.error("[admin-delete-user]", err);
    return json({ error: "Erreur interne" }, 500, corsHeaders);
  }
});