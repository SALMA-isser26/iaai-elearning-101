// supabase/functions/stripe-checkout/index.ts
// Edge Function Stripe Checkout — crée une session de paiement
// Déploiement : supabase functions deploy stripe-checkout --project-ref jabcimevpdmdgzezhdgn

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { corsHeadersFor } from "../_shared/cors.ts";

const STRIPE_SECRET_KEY   = Deno.env.get("STRIPE_SECRET_KEY")   ?? "";
const STRIPE_PRICE_ID     = Deno.env.get("STRIPE_PRICE_ID")     ?? "";
const SUPABASE_URL        = Deno.env.get("SB_URL")              ?? "";
const SUPABASE_KEY        = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";

// URL de la plateforme (fallback localhost pour les tests)
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:5173";

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
    // ── 1. Vérifier l'authentification ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Récupérer l'utilisateur depuis le JWT ─────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Vérifier que l'utilisateur n'est pas déjà premium ────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.plan === "premium") {
      return new Response(JSON.stringify({ error: "Vous êtes déjà abonné Premium" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Créer la session Stripe Checkout ──────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      // Métadonnées pour le webhook
      metadata: {
        user_id:    user.id,
        user_email: user.email ?? "",
      },
      customer_email: user.email,
      success_url: `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/settings/upgrade`,
      locale: "fr",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur", details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});