// supabase/functions/aria/index.ts
// Edge Function ARIA — Gemini Free + pgvector similarity search
// Déploiement : supabase functions deploy aria --project-ref jabcimevpdmdgzezhdgn

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL   = Deno.env.get("SB_URL")   ?? "";
const SUPABASE_KEY   = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? "";

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
const CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, lessonId, moduleId, history = [] } = await req.json();

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question vide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── 1. Embedder la question avec Gemini text-embedding-004 ────────────────
    const embedRes = await fetch(EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",   
        content: { parts: [{ text: question }] },
      }),
    });

    const embedData = await embedRes.json();
    const embedding = embedData?.embedding?.values;

    if (!embedding) {
      throw new Error("Embedding Gemini échoué : " + JSON.stringify(embedData));
    }

    // ── 2. Recherche vectorielle dans Supabase ────────────────────────────────
    const { data: chunks, error: searchError } = await supabase.rpc("similarity_search", {
      query_embedding:  embedding,
      match_threshold:  0.45,
      match_count:      4,
      filter_lesson_id: lessonId ?? null,
      filter_module_id: moduleId ?? null,
    });

    if (searchError) throw new Error("similarity_search error: " + searchError.message);

    // ── 3. Construire le prompt système ───────────────────────────────────────
    const contexte = chunks?.length
      ? chunks.map((c: any, i: number) =>
          `[Source ${i + 1} — similarité ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`
        ).join("\n\n---\n\n")
      : null;

    const systemPrompt = contexte
      ? `Tu es ARIA, l'assistante pédagogique IA de la plateforme IAAI eLearning 101.
Tu dois répondre UNIQUEMENT à partir du contexte des leçons fourni ci-dessous.
Si la réponse ne se trouve pas dans le contexte, dis honnêtement : "Je n'ai pas cette information dans le cours actuel."
Réponds en français. Sois clair, pédagogique et encourage l'apprenant.
Ne fabrique jamais d'informations.

=== CONTEXTE DES LEÇONS ===
${contexte}
=== FIN DU CONTEXTE ===`
      : `Tu es ARIA, l'assistante pédagogique IA de la plateforme IAAI eLearning 101.
Tu aides les apprenants à comprendre les concepts d'Intelligence Artificielle.
Si tu ne connais pas la réponse, dis-le honnêtement.
Réponds en français. Sois concis, clair et encourageant.`;

    // ── 4. Construire les messages pour Gemini ────────────────────────────────
    // Gemini utilise "user" / "model" (pas "assistant")
    const recentHistory = (history as any[]).slice(-6).map((m: any) => ({
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const contents = [
      ...recentHistory,
      { role: "user", parts: [{ text: question }] },
    ];

    // ── 5. Appel Gemini 1.5 Flash ─────────────────────────────────────────────
    const chatRes = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature:     0.3,
          maxOutputTokens: 1024,
          topP:            0.9,
        },
      }),
    });

    const chatData = await chatRes.json();
    const reponse  = chatData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reponse) {
      throw new Error("Gemini n'a pas retourné de réponse : " + JSON.stringify(chatData));
    }

    // ── 6. Retourner la réponse + les sources ─────────────────────────────────
    const sources = chunks?.map((c: any) => ({
      lessonId:   c.lesson_id,
      moduleId:   c.module_id,
      similarity: Math.round(c.similarity * 100),
      preview:    c.content.slice(0, 100) + "…",
    })) ?? [];

    return new Response(
      JSON.stringify({ reponse, sources, chunksFound: chunks?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[ARIA Edge Function]", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});