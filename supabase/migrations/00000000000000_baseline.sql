


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."add_points"("user_id" "uuid", "points_to_add" integer, "badge_to_add" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."add_points"("user_id" "uuid", "points_to_add" integer, "badge_to_add" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_icon" "text" DEFAULT 'notifications'::"text", "p_icon_bg" "text" DEFAULT 'bg-[#f0dbff]'::"text", "p_icon_text" "text" DEFAULT 'text-[#8127cf]'::"text", "p_action_url" "text" DEFAULT NULL::"text", "p_action_label" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.notifications
    (user_id, type, title, body, icon, icon_bg, icon_text, action_url, action_label)
  VALUES
    (p_user_id, p_type, p_title, p_body, p_icon, p_icon_bg, p_icon_text, p_action_url, p_action_label);
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_icon" "text", "p_icon_bg" "text", "p_icon_text" "text", "p_action_url" "text", "p_action_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_module_stats"() RETURNS TABLE("module_id" "uuid", "lessons_count" bigint, "quizzes_count" bigint, "enrolled_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    m.id AS module_id,
    COUNT(DISTINCT l.id)  AS lessons_count,
    COUNT(DISTINCT q.id)  AS quizzes_count,
    COUNT(DISTINCT up.user_id) AS enrolled_count
  FROM public.modules m
  LEFT JOIN public.lessons l       ON l.module_id = m.id
  LEFT JOIN public.quizzes q       ON q.module_id = m.id
  LEFT JOIN public.user_progress up ON up.module_id = m.id
  GROUP BY m.id;
$$;


ALTER FUNCTION "public"."get_admin_module_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_admin_module_stats"() IS 'Retourne pour chaque module : nombre de leçons, nombre de quiz, nombre d''apprenants uniques inscrits. Agrégation SQL unique utilisée par AdminCoursesPage au lieu d''un comptage côté client.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'LEARNER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_comment_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."increment_comment_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Retourne true si l''utilisateur connecté a le rôle ADMIN ou SUPER_ADMIN dans profiles.';



CREATE OR REPLACE FUNCTION "public"."notify_on_certificate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_module_title TEXT;
BEGIN
  SELECT title INTO v_module_title
  FROM public.modules WHERE id = NEW.module_id;

  PERFORM public.create_notification(
    NEW.user_id,
    'certificate',
    '🎖️ Nouveau certificat obtenu !',
    'Votre certificat pour "' || COALESCE(v_module_title, 'ce module') || '" a été généré avec un score de ' || NEW.score || '%. Partagez votre réussite !',
    'workspace_premium',
    'bg-yellow-50',
    'text-yellow-600',
    '/certificates',
    'Voir mes certificats'
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_certificate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_lesson_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_lesson_title  TEXT;
  v_module_title  TEXT;
  v_module_id     UUID;
  v_total         INT;
  v_completed     INT;
BEGIN
  -- Seulement si la leçon vient d'être marquée complète
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN

    -- Récupérer le titre de la leçon et du module
    SELECT l.title, l.module_id, m.title
    INTO v_lesson_title, v_module_id, v_module_title
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = NEW.lesson_id;

    -- Notification : leçon complétée
    PERFORM public.create_notification(
      NEW.user_id,
      'lesson',
      '✅ Leçon complétée',
      'Bravo ! Vous avez terminé "' || COALESCE(v_lesson_title, 'cette leçon') || '" dans ' || COALESCE(v_module_title, 'le module') || '.',
      'check_circle',
      'bg-green-50',
      'text-green-600',
      NULL,
      NULL
    );

    -- Vérifier si le module entier est terminé
    SELECT COUNT(*) INTO v_total
    FROM public.lessons WHERE module_id = v_module_id;

    SELECT COUNT(*) INTO v_completed
    FROM public.user_progress
    WHERE user_id = NEW.user_id
      AND module_id = v_module_id
      AND completed = true;

    IF v_total > 0 AND v_completed >= v_total THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'module',
        '🎓 Module terminé !',
        'Félicitations, vous avez complété le module "' || COALESCE(v_module_title, '') || '". Le quiz vous attend !',
        'emoji_events',
        'bg-[#f0dbff]',
        'text-[#8127cf]',
        '/curriculum',
        'Faire le quiz'
      );
    END IF;

  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_lesson_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_premium_upgrade"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Seulement quand plan passe à 'premium'
  IF NEW.plan = 'premium' AND (OLD.plan IS NULL OR OLD.plan != 'premium') THEN
    PERFORM public.create_notification(
      NEW.id,
      'premium',
      '⭐ Bienvenue dans le plan Premium !',
      'Votre accès Premium est actif. Les 7 modules avancés, les projets pratiques et ARIA illimitée sont désormais disponibles.',
      'star',
      'bg-[#f0dbff]',
      'text-[#8127cf]',
      '/curriculum',
      'Explorer les modules'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_premium_upgrade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_on_quiz_attempt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_quiz_title   TEXT;
  v_module_title TEXT;
BEGIN
  -- Récupérer le titre du quiz et du module
  SELECT q.title, m.title
  INTO v_quiz_title, v_module_title
  FROM public.quizzes q
  JOIN public.modules m ON m.id = q.module_id
  WHERE q.id = NEW.quiz_id;

  IF NEW.passed THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'quiz',
      '🏆 Quiz réussi — ' || NEW.score || '%',
      'Excellent ! Vous avez réussi le quiz "' || COALESCE(v_quiz_title, v_module_title, 'Module') || '" avec un score de ' || NEW.score || '%. Votre certificat est disponible !',
      'task_alt',
      'bg-green-50',
      'text-green-600',
      '/certificates',
      'Voir mon certificat'
    );
  ELSE
    PERFORM public.create_notification(
      NEW.user_id,
      'quiz',
      '📝 Quiz — Score : ' || NEW.score || '%',
      'Vous avez obtenu ' || NEW.score || '% au quiz "' || COALESCE(v_quiz_title, v_module_title, 'Module') || '". Révisez les leçons et retentez votre chance !',
      'quiz',
      'bg-amber-50',
      'text-amber-600',
      NULL,
      'Réessayer'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_quiz_attempt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_self_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Modification du rôle interdite : réservé aux administrateurs';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_self_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."similarity_search"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 4, "filter_lesson_id" "uuid" DEFAULT NULL::"uuid", "filter_module_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "lesson_id" "uuid", "module_id" "uuid", "content" "text", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    lc.id,
    lc.lesson_id,
    lc.module_id,
    lc.content,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM public.lesson_chunks lc
  WHERE
    (filter_lesson_id IS NULL OR lc.lesson_id = filter_lesson_id)
    AND (filter_module_id IS NULL OR lc.module_id = filter_module_id)
    AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."similarity_search"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_lesson_id" "uuid", "filter_module_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_streak"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_streak"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "certificate_number" "text" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "lesson_id" "uuid",
    "module_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "category" "text" DEFAULT 'Questions'::"text" NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "liked_by" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "comment_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "community_posts_category_check" CHECK (("category" = ANY (ARRAY['Questions'::"text", 'Projets'::"text", 'Ressources'::"text", 'Annonces'::"text"])))
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_recommendations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "action_label" "text" DEFAULT 'Voir'::"text" NOT NULL,
    "route" "text" DEFAULT '/curriculum'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "category" character varying(100) DEFAULT 'général'::character varying,
    "order_index" integer DEFAULT 0,
    "is_published" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."faqs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_chunks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(768),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lesson_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "lesson_id" "uuid",
    "content" "text" NOT NULL,
    "highlights" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "video_url" "text",
    "duration_minutes" integer DEFAULT 5 NOT NULL,
    "order_index" integer NOT NULL,
    "is_free" boolean DEFAULT false NOT NULL,
    "content_notes" "text",
    "tip" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_published" boolean DEFAULT false
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lessons"."is_published" IS 'Indique si la leçon est publiée et visible par les apprenants. Les brouillons (false) ne sont visibles que par les admins.';



CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "order_index" integer NOT NULL,
    "duration_minutes" integer DEFAULT 0 NOT NULL,
    "level" "text" DEFAULT 'débutant'::"text" NOT NULL,
    "is_premium" boolean DEFAULT false NOT NULL,
    "thumbnail_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_published" boolean DEFAULT true NOT NULL,
    CONSTRAINT "modules_level_check" CHECK (("level" = ANY (ARRAY['débutant'::"text", 'intermédiaire'::"text", 'avancé'::"text"])))
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."modules"."is_published" IS 'Contrôle la visibilité du module dans le catalogue public. false = brouillon, visible uniquement dans /admin.';



CREATE TABLE IF NOT EXISTS "public"."newsletter_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "source" character varying(50) DEFAULT 'landing'::character varying,
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."newsletter_subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "icon" "text" DEFAULT 'notifications'::"text" NOT NULL,
    "icon_bg" "text" DEFAULT 'bg-[#f0dbff]'::"text" NOT NULL,
    "icon_text" "text" DEFAULT 'text-[#8127cf]'::"text" NOT NULL,
    "action_url" "text",
    "action_label" "text",
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['lesson'::"text", 'quiz'::"text", 'certificate'::"text", 'module'::"text", 'premium'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "role" "text" DEFAULT 'LEARNER'::"text" NOT NULL,
    "preferred_lang" "text" DEFAULT 'fr'::"text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_session_id" "text",
    "upgraded_at" timestamp with time zone,
    "bio" "text",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "profiles_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'premium'::"text"]))),
    CONSTRAINT "profiles_preferred_lang_check" CHECK (("preferred_lang" = ANY (ARRAY['fr'::"text", 'ar'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['LEARNER'::"text", 'ADMIN'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "order_index" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "passed" boolean DEFAULT false NOT NULL,
    "answers_given" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_attempts_score_check" CHECK ((("score" >= 0) AND ("score" <= 100)))
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "passing_score" integer DEFAULT 80 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_published" boolean DEFAULT false,
    CONSTRAINT "quizzes_passing_score_check" CHECK ((("passing_score" >= 0) AND ("passing_score" <= 100)))
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" character varying(255) NOT NULL,
    "role" character varying(255) DEFAULT 'Apprenant'::character varying,
    "avatar_url" "text",
    "content" "text" NOT NULL,
    "rating" integer DEFAULT 5,
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "testimonials_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."testimonials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" DEFAULT 'lesson'::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "detail" "text",
    "action" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_activity_type_check" CHECK (("type" = ANY (ARRAY['lesson'::"text", 'quiz'::"text", 'module'::"text", 'certificate'::"text"])))
);


ALTER TABLE "public"."user_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_points" (
    "user_id" "uuid" NOT NULL,
    "points" integer DEFAULT 0,
    "badges" "jsonb" DEFAULT '[]'::"jsonb",
    "streak_days" integer DEFAULT 0,
    "last_activity_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "progress_percent" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_progress_progress_percent_check" CHECK ((("progress_percent" >= 0) AND ("progress_percent" <= 100)))
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "study_time" "text" DEFAULT '0h'::"text" NOT NULL,
    "lessons_completed" integer DEFAULT 0 NOT NULL,
    "quizzes_passed" integer DEFAULT 0 NOT NULL,
    "badges_earned" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_module_id_key" UNIQUE ("user_id", "module_id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_recommendations"
    ADD CONSTRAINT "course_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faqs"
    ADD CONSTRAINT "faqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_chunks"
    ADD CONSTRAINT "lesson_chunks_lesson_id_chunk_index_key" UNIQUE ("lesson_id", "chunk_index");



ALTER TABLE ONLY "public"."lesson_chunks"
    ADD CONSTRAINT "lesson_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscribers"
    ADD CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_bookmarks_created" ON "public"."bookmarks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_bookmarks_lesson" ON "public"."bookmarks" USING "btree" ("lesson_id");



CREATE INDEX "idx_bookmarks_user" ON "public"."bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_chat_history_created_at" ON "public"."chat_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_chat_history_user_id" ON "public"."chat_history" USING "btree" ("user_id");



CREATE INDEX "idx_community_comments_post" ON "public"."community_comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_community_posts_author" ON "public"."community_posts" USING "btree" ("author_id");



CREATE INDEX "idx_community_posts_category" ON "public"."community_posts" USING "btree" ("category");



CREATE INDEX "idx_community_posts_created" ON "public"."community_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_community_posts_pinned" ON "public"."community_posts" USING "btree" ("pinned", "created_at" DESC);



CREATE INDEX "idx_faqs_category" ON "public"."faqs" USING "btree" ("category");



CREATE INDEX "idx_faqs_order" ON "public"."faqs" USING "btree" ("order_index");



CREATE INDEX "idx_faqs_published" ON "public"."faqs" USING "btree" ("is_published");



CREATE INDEX "idx_lesson_chunks_embedding" ON "public"."lesson_chunks" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_lesson_chunks_lesson_id" ON "public"."lesson_chunks" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_chunks_module_id" ON "public"."lesson_chunks" USING "btree" ("module_id");



CREATE INDEX "idx_lesson_notes_lesson_id" ON "public"."lesson_notes" USING "btree" ("lesson_id");



CREATE INDEX "idx_lesson_notes_user_id" ON "public"."lesson_notes" USING "btree" ("user_id");



CREATE INDEX "idx_modules_is_published" ON "public"."modules" USING "btree" ("is_published");



CREATE INDEX "idx_newsletter_email" ON "public"."newsletter_subscribers" USING "btree" ("email");



CREATE INDEX "idx_newsletter_status" ON "public"."newsletter_subscribers" USING "btree" ("status");



CREATE INDEX "idx_newsletter_subscribed_at" ON "public"."newsletter_subscribers" USING "btree" ("subscribed_at" DESC);



CREATE INDEX "idx_notifications_user_created" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_profiles_preferences" ON "public"."profiles" USING "gin" ("preferences");



CREATE INDEX "idx_profiles_stripe_session" ON "public"."profiles" USING "btree" ("stripe_session_id") WHERE ("stripe_session_id" IS NOT NULL);



CREATE INDEX "idx_quiz_attempts_user_id" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_testimonials_featured" ON "public"."testimonials" USING "btree" ("is_featured");



CREATE INDEX "idx_testimonials_published" ON "public"."testimonials" USING "btree" ("is_published");



CREATE INDEX "idx_testimonials_rating" ON "public"."testimonials" USING "btree" ("rating");



CREATE INDEX "idx_testimonials_user" ON "public"."testimonials" USING "btree" ("user_id");



CREATE INDEX "idx_user_activity_user_id" ON "public"."user_activity" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_points_points" ON "public"."user_points" USING "btree" ("points" DESC);



CREATE INDEX "idx_user_points_streak" ON "public"."user_points" USING "btree" ("streak_days" DESC);



CREATE INDEX "idx_user_progress_module_id" ON "public"."user_progress" USING "btree" ("user_id", "module_id");



CREATE INDEX "idx_user_progress_user_id" ON "public"."user_progress" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_comment_count" AFTER INSERT OR DELETE ON "public"."community_comments" FOR EACH ROW EXECUTE FUNCTION "public"."increment_comment_count"();



CREATE OR REPLACE TRIGGER "trg_notify_certificate" AFTER INSERT ON "public"."certificates" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_certificate"();



CREATE OR REPLACE TRIGGER "trg_notify_lesson_complete" AFTER INSERT OR UPDATE OF "completed" ON "public"."user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_lesson_complete"();



CREATE OR REPLACE TRIGGER "trg_notify_premium_upgrade" AFTER UPDATE OF "plan" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_premium_upgrade"();



CREATE OR REPLACE TRIGGER "trg_notify_quiz_attempt" AFTER INSERT ON "public"."quiz_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_quiz_attempt"();



CREATE OR REPLACE TRIGGER "trg_prevent_role_self_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_self_escalation"();



CREATE OR REPLACE TRIGGER "update_faqs_updated_at" BEFORE UPDATE ON "public"."faqs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lesson_notes_updated_at" BEFORE UPDATE ON "public"."lesson_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_testimonials_updated_at" BEFORE UPDATE ON "public"."testimonials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_points_updated_at" BEFORE UPDATE ON "public"."user_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_author_profile_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_comments"
    ADD CONSTRAINT "community_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_profile_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_recommendations"
    ADD CONSTRAINT "course_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_chunks"
    ADD CONSTRAINT "lesson_chunks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_chunks"
    ADD CONSTRAINT "lesson_chunks_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_notes"
    ADD CONSTRAINT "lesson_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."testimonials"
    ADD CONSTRAINT "testimonials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity"
    ADD CONSTRAINT "user_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_points"
    ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_stats"
    ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete newsletter subscribers" ON "public"."newsletter_subscribers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can manage lessons" ON "public"."lessons" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"()));



COMMENT ON POLICY "Admins can manage lessons" ON "public"."lessons" IS 'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';



CREATE POLICY "Admins can manage modules" ON "public"."modules" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"()));



COMMENT ON POLICY "Admins can manage modules" ON "public"."modules" IS 'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';



CREATE POLICY "Admins can manage profiles" ON "public"."profiles" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"()));



COMMENT ON POLICY "Admins can manage profiles" ON "public"."profiles" IS 'Les admins peuvent gérer tous les profils. Les service_role (Edge Functions) aussi.';



CREATE POLICY "Admins can manage quizzes" ON "public"."quizzes" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"()));



COMMENT ON POLICY "Admins can manage quizzes" ON "public"."quizzes" IS 'Les admins peuvent tout voir/modifier (y compris les brouillons). Les service_role (Edge Functions) aussi.';



CREATE POLICY "Admins can manage testimonials" ON "public"."testimonials" USING ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"())) WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR "public"."is_admin"()));



COMMENT ON POLICY "Admins can manage testimonials" ON "public"."testimonials" IS 'Les admins peuvent gérer tous les témoignages. Les service_role (Edge Functions) aussi.';



CREATE POLICY "Admins can update newsletter subscribers" ON "public"."newsletter_subscribers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Admins can view newsletter subscribers" ON "public"."newsletter_subscribers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Anyone can insert newsletter subscribers" ON "public"."newsletter_subscribers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can insert bookmarks" ON "public"."bookmarks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can insert testimonials" ON "public"."testimonials" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Faqs are viewable by everyone" ON "public"."faqs" FOR SELECT USING (true);



CREATE POLICY "Lecture publique des posts" ON "public"."community_posts" FOR SELECT USING (true);



CREATE POLICY "Les utilisateurs connectés peuvent poster" ON "public"."community_posts" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Les utilisateurs modifient leurs propres posts" ON "public"."community_posts" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Only admins can delete faqs" ON "public"."faqs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can delete testimonials" ON "public"."testimonials" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can insert faqs" ON "public"."faqs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can update faqs" ON "public"."faqs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Only admins can update testimonials" ON "public"."testimonials" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'ADMIN'::"text")))));



CREATE POLICY "Public can view approved testimonials" ON "public"."testimonials" FOR SELECT USING (("is_published" = true));



COMMENT ON POLICY "Public can view approved testimonials" ON "public"."testimonials" IS 'Les visiteurs ne voient que les témoignages publiés (is_published = true).';



CREATE POLICY "Public can view published lessons" ON "public"."lessons" FOR SELECT USING (("is_published" = true));



COMMENT ON POLICY "Public can view published lessons" ON "public"."lessons" IS 'Les visiteurs du catalogue public ne voient que les leçons publiées.';



CREATE POLICY "Public can view published modules" ON "public"."modules" FOR SELECT USING (("is_published" = true));



COMMENT ON POLICY "Public can view published modules" ON "public"."modules" IS 'Les visiteurs du catalogue public ne voient que les modules publiés.';



CREATE POLICY "Public can view published quizzes" ON "public"."quizzes" FOR SELECT USING (("is_published" = true));



COMMENT ON POLICY "Public can view published quizzes" ON "public"."quizzes" IS 'Les visiteurs du catalogue public ne voient que les quiz publiés.';



CREATE POLICY "Published testimonials are viewable by everyone" ON "public"."testimonials" FOR SELECT USING (("is_published" = true));



CREATE POLICY "Users can delete own notes" ON "public"."lesson_notes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own bookmarks" ON "public"."bookmarks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own chat history" ON "public"."chat_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notes" ON "public"."lesson_notes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own points" ON "public"."user_points" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notes" ON "public"."lesson_notes" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own points" ON "public"."user_points" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



COMMENT ON POLICY "Users can update own profile" ON "public"."profiles" IS 'Les utilisateurs peuvent modifier leur propre profil uniquement.';



CREATE POLICY "Users can view own chat history" ON "public"."chat_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notes" ON "public"."lesson_notes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own points" ON "public"."user_points" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



COMMENT ON POLICY "Users can view own profile" ON "public"."profiles" IS 'Les utilisateurs peuvent voir leur propre profil uniquement.';



CREATE POLICY "Users can view their own bookmarks" ON "public"."bookmarks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own testimonials" ON "public"."testimonials" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_delete_certificates" ON "public"."certificates" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "admin_select_all_profiles" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "admin_update_certificates" ON "public"."certificates" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_write_lessons" ON "public"."lessons" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_write_modules" ON "public"."modules" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_write_questions" ON "public"."questions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admin_write_quizzes" ON "public"."quizzes" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "allow_authenticated_read_activity" ON "public"."user_activity" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_authenticated_read_attempts" ON "public"."quiz_attempts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_authenticated_read_certificates" ON "public"."certificates" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_authenticated_read_lessons" ON "public"."lessons" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_authenticated_read_modules" ON "public"."modules" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_authenticated_read_progress" ON "public"."user_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_authenticated_read_recommendations" ON "public"."course_recommendations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answers: lecture authentifiée" ON "public"."answers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "answers: écriture admin" ON "public"."answers" USING ("public"."is_admin"());



CREATE POLICY "authenticated_select_comments" ON "public"."community_comments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_select_posts" ON "public"."community_posts" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certificates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificates: admin voir tout" ON "public"."certificates" USING ("public"."is_admin"());



CREATE POLICY "certificates: insérer les siens" ON "public"."certificates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "certificates: voir les siens" ON "public"."certificates" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "certificates: vérification publique" ON "public"."certificates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."chat_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faqs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_chunks: lecture authentifiée" ON "public"."lesson_chunks" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "lesson_chunks: écriture admin" ON "public"."lesson_chunks" USING ("public"."is_admin"());



ALTER TABLE "public"."lesson_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lessons: gratuites pour tous" ON "public"."lessons" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("is_free" = true)));



CREATE POLICY "lessons: premium pour abonnés" ON "public"."lessons" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("is_free" = false) AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."plan" = 'premium'::"text")))))));



CREATE POLICY "lessons: écriture admin" ON "public"."lessons" USING ("public"."is_admin"());



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules: lecture authentifiée" ON "public"."modules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "modules: écriture admin" ON "public"."modules" USING ("public"."is_admin"());



ALTER TABLE "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "own_certificates_select" ON "public"."certificates" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "own_insert_quiz_attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "own_select_quiz_attempts" ON "public"."quiz_attempts" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "own_write_certificates" ON "public"."certificates" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: admin voir tout" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "profiles: insertion via trigger" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles: modifier le sien" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles: voir le sien" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions: lecture authentifiée" ON "public"."questions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "questions: écriture admin" ON "public"."questions" USING ("public"."is_admin"());



ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quiz_attempts: admin voir tout" ON "public"."quiz_attempts" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "quiz_attempts: insérer les siennes" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "quiz_attempts: voir les siennes" ON "public"."quiz_attempts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quizzes: lecture authentifiée" ON "public"."quizzes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "quizzes: écriture admin" ON "public"."quizzes" USING ("public"."is_admin"());



CREATE POLICY "recommendations: admin gérer" ON "public"."course_recommendations" USING ("public"."is_admin"());



CREATE POLICY "recommendations: voir les siennes" ON "public"."course_recommendations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "service_role_insert_notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."testimonials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_activity: admin voir tout" ON "public"."user_activity" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "user_activity: insérer la sienne" ON "public"."user_activity" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_activity: voir la sienne" ON "public"."user_activity" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_progress: admin voir tout" ON "public"."user_progress" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "user_progress: insérer le sien" ON "public"."user_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress: modifier le sien" ON "public"."user_progress" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_progress: voir le sien" ON "public"."user_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_stats: modifier les siennes" ON "public"."user_stats" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_stats: voir les siennes" ON "public"."user_stats" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_delete_own_comments" ON "public"."community_comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "users_delete_own_posts" ON "public"."community_posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "author_id"));



CREATE POLICY "users_insert_own_comments" ON "public"."community_comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "users_insert_own_posts" ON "public"."community_posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "users_select_own_notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_update_own_notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_update_posts" ON "public"."community_posts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_points"("user_id" "uuid", "points_to_add" integer, "badge_to_add" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_points"("user_id" "uuid", "points_to_add" integer, "badge_to_add" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_points"("user_id" "uuid", "points_to_add" integer, "badge_to_add" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_icon" "text", "p_icon_bg" "text", "p_icon_text" "text", "p_action_url" "text", "p_action_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_icon" "text", "p_icon_bg" "text", "p_icon_text" "text", "p_action_url" "text", "p_action_label" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_body" "text", "p_icon" "text", "p_icon_bg" "text", "p_icon_text" "text", "p_action_url" "text", "p_action_label" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_module_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_module_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_module_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_module_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_comment_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_comment_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_comment_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_certificate"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_certificate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_certificate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_lesson_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_lesson_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_premium_upgrade"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_premium_upgrade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_premium_upgrade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_quiz_attempt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_self_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_self_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_self_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_search"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_lesson_id" "uuid", "filter_module_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_search"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_lesson_id" "uuid", "filter_module_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_search"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "filter_lesson_id" "uuid", "filter_module_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_streak"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."chat_history" TO "anon";
GRANT ALL ON TABLE "public"."chat_history" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_history" TO "service_role";



GRANT ALL ON TABLE "public"."community_comments" TO "anon";
GRANT ALL ON TABLE "public"."community_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."community_comments" TO "service_role";



GRANT ALL ON TABLE "public"."community_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_posts" TO "service_role";



GRANT ALL ON TABLE "public"."course_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."course_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."course_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."faqs" TO "anon";
GRANT ALL ON TABLE "public"."faqs" TO "authenticated";
GRANT ALL ON TABLE "public"."faqs" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_chunks" TO "anon";
GRANT ALL ON TABLE "public"."lesson_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_notes" TO "anon";
GRANT ALL ON TABLE "public"."lesson_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_notes" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."testimonials" TO "anon";
GRANT ALL ON TABLE "public"."testimonials" TO "authenticated";
GRANT ALL ON TABLE "public"."testimonials" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity" TO "anon";
GRANT ALL ON TABLE "public"."user_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity" TO "service_role";



GRANT ALL ON TABLE "public"."user_points" TO "anon";
GRANT ALL ON TABLE "public"."user_points" TO "authenticated";
GRANT ALL ON TABLE "public"."user_points" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_stats" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







