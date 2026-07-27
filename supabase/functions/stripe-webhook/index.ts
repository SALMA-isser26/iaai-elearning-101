// supabase/functions/stripe-webhook/index.ts
// Edge Function Stripe Webhook — écoute la confirmation de paiement
// et met à jour plan = 'premium' dans profiles
// Déploiement : supabase functions deploy stripe-webhook --project-ref jabcimevpdmdgzezhdgn

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeadersFor } from "../_shared/cors.ts";

const STRIPE_SECRET_KEY      = Deno.env.get("STRIPE_SECRET_KEY")      ?? "";
const STRIPE_WEBHOOK_SECRET  = Deno.env.get("STRIPE_WEBHOOK_SECRET")  ?? "";
const SUPABASE_URL           = Deno.env.get("SB_URL")                 ?? "";
const SUPABASE_KEY           = Deno.env.get("SB_SERVICE_ROLE_KEY")    ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Vérifier la signature Stripe ─────────────────────────────────────
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Signature manquante", { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Signature Stripe invalide:", err.message);
      return new Response(`Webhook signature invalide: ${err.message}`, { status: 400 });
    }

    // ── 2. Traiter l'événement checkout.session.completed ───────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Récupérer l'user_id depuis les métadonnées
      const userId = session.metadata?.user_id;
      if (!userId) {
        console.error("user_id manquant dans les métadonnées Stripe");
        return new Response("user_id manquant", { status: 400 });
      }

      // Vérifier que le paiement est bien réussi
      if (session.payment_status !== "paid") {
        console.log("Paiement non confirmé, statut:", session.payment_status);
        return new Response("Paiement non confirmé", { status: 200 });
      }

      // ── 3. Mettre à jour le plan dans Supabase ───────────────────────────
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const { error } = await supabase
        .from("profiles")
        .update({
          plan:             "premium",
          stripe_session_id: session.id,
          upgraded_at:      new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Erreur mise à jour Supabase:", error);
        return new Response("Erreur mise à jour profil", { status: 500 });
      }

      console.log(`✅ Utilisateur ${userId} mis à jour → plan premium`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});