-- Table lesson_notes pour les notes personnelles

-- Fonction utilitaire pour updated_at (définie ici en CREATE OR REPLACE :
-- sans danger si elle existe déjà via une autre migration/le schéma de base).
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS lesson_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_id ON lesson_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson_id ON lesson_notes(lesson_id);

-- RLS (Row Level Security)
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres notes
CREATE POLICY "Users can view own notes"
  ON lesson_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent insérer leurs propres notes
CREATE POLICY "Users can insert own notes"
  ON lesson_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent mettre à jour leurs propres notes
CREATE POLICY "Users can update own notes"
  ON lesson_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete own notes"
  ON lesson_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_lesson_notes_updated_at BEFORE UPDATE ON lesson_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();