-- Table user_activity pour tracker l'activité des utilisateurs
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'lesson_view', 'quiz_completed', 'lesson_completed', etc.
  lesson_id UUID REFERENCES lessons(id),
  module_id UUID REFERENCES modules(id),
  duration_seconds INTEGER DEFAULT 0, -- temps passé sur une leçon
  metadata JSONB DEFAULT '{}', -- données additionnelles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_lesson_id ON user_activity(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);

-- RLS (Row Level Security)
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leur propre activité
CREATE POLICY "Users can view own activity"
  ON user_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent insérer leur propre activité
CREATE POLICY "Users can insert own activity"
  ON user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : les admins peuvent voir toute l'activité
CREATE POLICY "Admins can view all activity"
  ON user_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );