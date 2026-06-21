-- =================================================================================
-- SUPABASE DATABASE SCHEMA DUMP (STRUCTURE & RLS POLICIES ONLY)
-- Generated on: 2026-06-21T19:14:46.900Z
-- =================================================================================

-- Table: public.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id_seq bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  username character varying UNIQUE,
  email character varying UNIQUE,
  password character varying,
  role USER-DEFINED DEFAULT 'user'::user_role,
  avatar_url character varying,
  name character varying NOT NULL,
  gender USER-DEFINED,
  province character varying,
  ward character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  package character varying DEFAULT 'Free'::character varying,
  status character varying DEFAULT 'active'::character varying,
  email_verified boolean DEFAULT true,
  expiry_date timestamp with time zone,
  join_date timestamp with time zone,
  PRIMARY KEY (id),
  CONSTRAINT txa_user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT watch_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Table: public.movies
CREATE TABLE IF NOT EXISTS public.movies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_id_seq bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  title character varying NOT NULL,
  original_title character varying,
  slug character varying NOT NULL UNIQUE,
  description text,
  poster_url character varying,
  banner_url character varying,
  release_year integer,
  duration_minutes character varying,
  type character varying,
  status character varying,
  episode_current character varying,
  episode_total character varying,
  quality character varying,
  lang character varying,
  imdb_score numeric DEFAULT 0,
  tmdb_score numeric DEFAULT 0,
  broadcast_at character varying,
  views bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  episodes jsonb,
  actors jsonb,
  directors jsonb,
  genres jsonb,
  seasons character varying,
  trailer_url character varying,
  broadcast_schedule jsonb,
  rating_score numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT watch_history_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT schedules_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT watch_lists_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT movie_actors_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT movie_countries_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT movie_genres_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id)
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Table: public.actors
CREATE TABLE IF NOT EXISTS public.actors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  avatar_url character varying,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT movie_actors_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id)
);

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

-- Table: public.genres
CREATE TABLE IF NOT EXISTS public.genres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT movie_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id)
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Table: public.countries
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT movie_countries_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id)
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Table: public.movie_actors
CREATE TABLE IF NOT EXISTS public.movie_actors (
  movie_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  role_name character varying,
  PRIMARY KEY (movie_id, actor_id),
  CONSTRAINT movie_actors_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.actors(id),
  CONSTRAINT movie_actors_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id)
);

ALTER TABLE public.movie_actors ENABLE ROW LEVEL SECURITY;

-- Table: public.movie_genres
CREATE TABLE IF NOT EXISTS public.movie_genres (
  movie_id uuid NOT NULL,
  genre_id uuid NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  CONSTRAINT movie_genres_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT movie_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id)
);

ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;

-- Table: public.movie_countries
CREATE TABLE IF NOT EXISTS public.movie_countries (
  movie_id uuid NOT NULL,
  country_id uuid NOT NULL,
  PRIMARY KEY (movie_id, country_id),
  CONSTRAINT movie_countries_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id),
  CONSTRAINT movie_countries_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id)
);

ALTER TABLE public.movie_countries ENABLE ROW LEVEL SECURITY;

-- Table: public.watch_history
CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL,
  episode_name character varying NOT NULL,
  episode_slug character varying NOT NULL,
  current_time double precision DEFAULT 0,
  duration double precision DEFAULT 0,
  server_index integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT watch_history_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Table: public.watch_lists
CREATE TABLE IF NOT EXISTS public.watch_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  type character varying DEFAULT 'playlist'::character varying,
  PRIMARY KEY (id),
  CONSTRAINT watch_lists_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT watch_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.watch_lists ENABLE ROW LEVEL SECURITY;

-- Table: public.schedules
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL UNIQUE,
  release_day_of_week character varying NOT NULL,
  release_time time without time zone NOT NULL,
  note character varying,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT schedules_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id)
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Table: public.settings
CREATE TABLE IF NOT EXISTS public.settings (
  key character varying NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (key)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title character varying NOT NULL,
  body text NOT NULL,
  image_url character varying,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Table: public.hot_searches
CREATE TABLE IF NOT EXISTS public.hot_searches (
  keyword character varying NOT NULL,
  clicks bigint DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (keyword)
);

ALTER TABLE public.hot_searches ENABLE ROW LEVEL SECURITY;

-- Table: public.client_errors
CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type character varying,
  message text,
  extra jsonb,
  device_info character varying,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Table: public.zalo_access
CREATE TABLE IF NOT EXISTS public.zalo_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token character varying NOT NULL UNIQUE,
  nickname character varying NOT NULL,
  email character varying,
  status character varying DEFAULT 'pending'::character varying,
  ip character varying,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.zalo_access ENABLE ROW LEVEL SECURITY;

-- Table: public.zalo_bypass
CREATE TABLE IF NOT EXISTS public.zalo_bypass (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type character varying NOT NULL,
  value character varying NOT NULL,
  description character varying,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.zalo_bypass ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_error_reports
CREATE TABLE IF NOT EXISTS public.txa_error_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_title character varying NOT NULL,
  movie_slug character varying NOT NULL,
  episode_name character varying NOT NULL,
  episode_slug character varying NOT NULL,
  server_name character varying NOT NULL,
  reason text NOT NULL,
  user_username character varying NOT NULL DEFAULT 'Ẩn danh'::character varying,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_error_reports ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_deleted_movies
CREATE TABLE IF NOT EXISTS public.txa_deleted_movies (
  slug character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (slug)
);

ALTER TABLE public.txa_deleted_movies ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_comments
CREATE TABLE IF NOT EXISTS public.txa_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  movie_slug character varying NOT NULL,
  author character varying NOT NULL,
  content text NOT NULL,
  likes integer DEFAULT 0,
  replies jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_comments ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_movie_ratings
CREATE TABLE IF NOT EXISTS public.txa_movie_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL,
  movie_slug character varying NOT NULL,
  rating integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_movie_ratings ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_payment_logs
CREATE TABLE IF NOT EXISTS public.txa_payment_logs (
  txid character varying NOT NULL,
  username character varying NOT NULL,
  email character varying,
  package_title character varying NOT NULL,
  price numeric NOT NULL,
  cycle character varying NOT NULL,
  method character varying NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying,
  receipt_img character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (txid)
);

ALTER TABLE public.txa_payment_logs ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_email_logs
CREATE TABLE IF NOT EXISTS public.txa_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient text,
  sender text,
  subject text,
  category text,
  status text,
  response_code text,
  parameters jsonb,
  smtp_config jsonb,
  html text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: public.txa_user_sessions
CREATE TABLE IF NOT EXISTS public.txa_user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  session_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_agent text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT txa_user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =================================================================================
-- ROW LEVEL SECURITY POLICIES
-- =================================================================================

CREATE POLICY "select_movies" ON public.movies FOR SELECT TO public USING (true);
CREATE POLICY "select_actors" ON public.actors FOR SELECT TO public USING (true);
CREATE POLICY "select_genres" ON public.genres FOR SELECT TO public USING (true);
CREATE POLICY "select_countries" ON public.countries FOR SELECT TO public USING (true);
CREATE POLICY "select_movie_actors" ON public.movie_actors FOR SELECT TO public USING (true);
CREATE POLICY "select_movie_genres" ON public.movie_genres FOR SELECT TO public USING (true);
CREATE POLICY "select_movie_countries" ON public.movie_countries FOR SELECT TO public USING (true);
CREATE POLICY "select_schedules" ON public.schedules FOR SELECT TO public USING (true);
CREATE POLICY "insert_users" ON public.users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_users" ON public.users FOR UPDATE TO public USING (((auth.uid() = id) OR is_admin()));
CREATE POLICY "delete_users" ON public.users FOR DELETE TO public USING (((auth.uid() = id) OR is_admin()));
CREATE POLICY "all_watch_history" ON public.watch_history FOR ALL TO public USING (((auth.uid() = user_id) OR is_admin()));
CREATE POLICY "all_watch_lists" ON public.watch_lists FOR ALL TO public USING (((auth.uid() = user_id) OR is_admin()));
CREATE POLICY "select_notifications" ON public.notifications FOR SELECT TO public USING (((user_id = auth.uid()) OR (user_id IS NULL) OR is_admin()));
CREATE POLICY "select_hot_searches" ON public.hot_searches FOR SELECT TO public USING (true);
CREATE POLICY "modify_hot_searches" ON public.hot_searches FOR ALL TO public USING (true);
CREATE POLICY "insert_client_errors" ON public.client_errors FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "select_client_errors" ON public.client_errors FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "insert_zalo_access" ON public.zalo_access FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "select_users" ON public.users FOR SELECT TO public USING (((auth.uid() = id) OR is_admin()));
CREATE POLICY "select_settings" ON public.settings FOR SELECT TO public USING ((((key)::text = ANY ((ARRAY['general'::character varying, 'social'::character varying])::text[])) OR is_admin()));
CREATE POLICY "select_zalo_access" ON public.zalo_access FOR SELECT TO public USING (is_admin());
CREATE POLICY "modify_movies" ON public.movies FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_actors" ON public.actors FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_genres" ON public.genres FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_countries" ON public.countries FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_movie_actors" ON public.movie_actors FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_movie_genres" ON public.movie_genres FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_movie_countries" ON public.movie_countries FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_schedules" ON public.schedules FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_settings" ON public.settings FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_notifications" ON public.notifications FOR ALL TO public USING (is_admin());
CREATE POLICY "modify_zalo_access" ON public.zalo_access FOR ALL TO public USING (is_admin());
CREATE POLICY "all_zalo_bypass" ON public.zalo_bypass FOR ALL TO public USING (is_admin());
CREATE POLICY "insert_error_reports" ON public.txa_error_reports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "select_error_reports" ON public.txa_error_reports FOR SELECT TO public USING (is_admin());
CREATE POLICY "update_error_reports" ON public.txa_error_reports FOR UPDATE TO public USING (is_admin());
CREATE POLICY "delete_error_reports" ON public.txa_error_reports FOR DELETE TO public USING (is_admin());
CREATE POLICY "select_txa_deleted_movies" ON public.txa_deleted_movies FOR SELECT TO public USING (true);
CREATE POLICY "select_txa_comments" ON public.txa_comments FOR SELECT TO public USING (true);
CREATE POLICY "insert_txa_comments" ON public.txa_comments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_txa_comments" ON public.txa_comments FOR UPDATE TO public USING (true);
CREATE POLICY "delete_txa_comments" ON public.txa_comments FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "modify_txa_deleted_movies" ON public.txa_deleted_movies FOR ALL TO public USING (is_admin());
CREATE POLICY "all_txa_movie_ratings" ON public.txa_movie_ratings FOR ALL TO public USING (true);
CREATE POLICY "all_txa_payment_logs" ON public.txa_payment_logs FOR ALL TO public USING (true);
