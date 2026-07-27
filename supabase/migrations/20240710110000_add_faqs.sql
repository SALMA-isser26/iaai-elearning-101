-- Migration pour la table faqs
-- Permet de gérer les questions fréquentes pour les visiteurs

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'général',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_faqs_category ON public.faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_published ON public.faqs(is_published);
CREATE INDEX IF NOT EXISTS idx_faqs_order ON public.faqs(order_index);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Politique RLS : lecture publique pour tous
CREATE POLICY "Faqs are viewable by everyone"
  ON public.faqs FOR SELECT
  USING (true);

-- Politique RLS : seulement les admins peuvent insérer/modifier/supprimer
CREATE POLICY "Only admins can insert faqs"
  ON public.faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can update faqs"
  ON public.faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can delete faqs"
  ON public.faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Insérer quelques FAQs par défaut
INSERT INTO public.faqs (question, answer, category, order_index, is_published) VALUES
  ('Qu'est-ce que IAAI eLearning 101 ?', 'IAAI eLearning 101 est une plateforme d'apprentissage en ligne interactive pour débuter en Intelligence Artificielle. Elle propose 8 modules, 42 leçons et environ 35 heures de contenu en français et en arabe.', 'général', 1, true),
  ('Le cours est-il gratuit ?', 'Le Module 1 est entièrement gratuit. Pour accéder aux modules 2 à 8, aux quiz complets et aux certificats, un abonnement Premium à 299 MAD est requis.', 'pricing', 2, true),
  ('Ai-je besoin de connaissances en programmation ?', 'Non ! IAAI eLearning 101 est conçu pour les débutants. Aucune expérience en programmation n'est requise pour suivre le parcours.', 'cours', 3, true),
  ('Combien de temps dure la formation ?', 'La formation complète comprend environ 35 heures de contenu. Vous pouvez avancer à votre rythme, il n'y a pas de limite de temps.', 'cours', 4, true),
  ('Reçois-je un certificat ?', 'Oui, un certificat de complétion est délivré aux apprenants Premium qui terminent l'ensemble des modules et quiz avec succès.', 'certification', 5, true),
  ('Puis-je suivre le cours sur mobile ?', 'Oui, la plateforme est 100% responsive et optimisée pour mobile. Vous pouvez apprendre depuis n'importe quel appareil.', 'technique', 6, true),
  ('Qu'est-ce que le chatbot ARIA ?', 'ARIA est votre assistante pédagogique IA. Elle utilise la technologie RAG (Retrieval-Augmented Generation) pour répondre à vos questions en s''appuyant sur le contenu des cours.', 'fonctionnalités', 7, true),
  ('Comment fonctionne le paiement ?', 'Le paiement se fait via Stripe de manière sécurisée. Après le paiement, votre compte est automatiquement mis à jour vers le plan Premium.', 'pricing', 8, true),
  ('Puis-je annuler mon abonnement ?', 'L'abonnement est un paiement unique de 299 MAD, sans engagement récurrent. Vous conservez l'accès Premium à vie.', 'pricing', 9, true),
  ('Y a-t-il un support technique ?', 'Oui, vous pouvez nous contacter via le formulaire de contact ou rejoindre notre forum communautaire pour obtenir de l'aide.', 'support', 10, true);