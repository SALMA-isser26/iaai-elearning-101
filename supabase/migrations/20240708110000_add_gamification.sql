-- Table user_points pour la gamification

-- Fonction utilitaire pour updated_at (CREATE OR REPLACE : sans danger si déjà définie ailleurs)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  points INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]',
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_points_points ON user_points(points DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_streak ON user_points(streak_days DESC);

-- RLS (Row Level Security)
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir leurs propres points
CREATE POLICY "Users can view own points"
  ON user_points FOR SELECT
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent insérer leurs propres points
CREATE POLICY "Users can insert own points"
  ON user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent mettre à jour leurs propres points
CREATE POLICY "Users can update own points"
  ON user_points FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour ajouter des points
CREATE OR REPLACE FUNCTION add_points(user_id UUID, points_to_add INTEGER, badge_to_add TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_points (user_id, points, badges)
  VALUES (user_id, points_to_add, CASE WHEN badge_to_add IS NOT NULL THEN ARRAY[badge_to_add] ELSE ARRAY[]::TEXT[] END)
  ON CONFLICT (user_id) DO UPDATE SET
    points = user_points.points + points_to_add,
    badges = CASE 
      WHEN badge_to_add IS NOT NULL AND NOT (badge_to_add = ANY(user_points.badges))
      THEN array_append(user_points.badges, badge_to_add)
      ELSE user_points.badges
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le streak
CREATE OR REPLACE FUNCTION update_streak(user_id UUID)
RETURNS VOID AS $$
DECLARE
  last_activity user_points.last_activity_date%TYPE;
  today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date INTO last_activity
  FROM user_points
  WHERE user_id = user_points.user_id;

  IF last_activity IS NULL THEN
    -- Premier jour d'activité
    INSERT INTO user_points (user_id, streak_days, last_activity_date)
    VALUES (user_id, 1, today)
    ON CONFLICT (user_id) DO UPDATE SET
      streak_days = 1,
      last_activity_date = today;
  ELSIF last_activity = today - INTERVAL '1 day' THEN
    -- Activité consécutive, incrémenter le streak
    UPDATE user_points
    SET streak_days = streak_days + 1,
        last_activity_date = today
    WHERE user_id = user_points.user_id;
  ELSIF last_activity < today THEN
    -- Activité non consécutive, réinitialiser le streak
    UPDATE user_points
    SET streak_days = 1,
        last_activity_date = today
    WHERE user_id = user_points.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;