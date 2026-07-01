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
  PRIMARY KEY (id)
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
  country character varying,
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
  pinned boolean NOT NULL DEFAULT false,
  source character varying DEFAULT 'manual'::character varying,
  PRIMARY KEY (id)
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

-- Table: public.actors
CREATE TABLE IF NOT EXISTS public.actors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  avatar_url character varying,
  bio text,
  tmdb_id integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.actors ENABLE ROW LEVEL SECURITY;

-- Table: public.genres
CREATE TABLE IF NOT EXISTS public.genres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Table: public.countries
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
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

-- Initial seed data for packages in settings table
INSERT INTO public.settings (key, value) VALUES (
  'packages',
  '[
    {
      "id": "free",
      "title": "Gói Free",
      "price": 0,
      "cycle": "free",
      "style_type": "default",
      "features": ["Có chứa quảng cáo ngẫu nhiên", "Xem chất lượng SD tiêu chuẩn", "Chỉ xem các server thường"],
      "permissions": {
        "max_resolution": "SD",
        "allowed_servers": ["Vietsub", "Thuyết Minh", "Lồng Tiếng"],
        "max_playlists": 10,
        "watch_together": false,
        "hide_watermark": false,
        "vip_badge": false,
        "bypass_ads": false
      }
    },
    {
      "id": "TXA_P1_28062026_0004",
      "title": "Gói Tiêu Chuẩn (Standard)",
      "price": 39000,
      "annual_price": 399000,
      "cycle": "monthly",
      "style_type": "custom_color",
      "custom_color": "#3b82f6",
      "features": [
        "Không có quảng cáo pop-under / nhảy trang",
        "Chỉ có quảng cáo trong trình phát khi xem",
        "Xem chất lượng HD/FHD nét mượt",
        "Hỗ trợ các server Vietsub, Thuyết Minh & Lồng Tiếng"
      ],
      "permissions": {
        "max_resolution": "FHD",
        "allowed_servers": [
          "#Hà Nội (Vietsub)",
          "#Hà Nội (Thuyết Minh)",
          "#Hà Nội (Lồng Tiếng)",
          "Vietsub",
          "Thuyết Minh",
          "Lồng Tiếng"
        ],
        "max_playlists": 50,
        "watch_together": false,
        "hide_watermark": false,
        "vip_badge": false,
        "bypass_ads": false,
        "ads_only_in_player": true
      }
    },
    {
      "id": "TXA_P2_28062026_0005",
      "title": "Gói VIP",
      "price": 69000,
      "annual_price": 699000,
      "cycle": "monthly",
      "style_type": "default",
      "features": ["Hoàn toàn không có quảng cáo", "Xem chất lượng cực nét 4K UHD", "Mở khóa toàn bộ các server VIP tốc độ cao", "Hỗ trợ tính năng Xem Chung"],
      "permissions": {
        "max_resolution": "4K",
        "allowed_servers": ["DongMePhim VIP", "FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"],
        "max_playlists": 1000,
        "watch_together": true,
        "hide_watermark": true,
        "vip_badge": true,
        "bypass_ads": true
      }
    },
    {
      "id": "bypass_zalo",
      "title": "Gói Key Bypass Duyệt Zalo (15 Thiết bị)",
      "price": 49000,
      "annual_price": 399000,
      "cycle": "monthly",
      "style_type": "custom_color",
      "custom_color": "#a78bfa",
      "features": [
        "Tự động duyệt Zalo 100% ngay lập tức",
        "Cấp mã Key 8 ký tự độc lập (Dạng DPxxxxxx)",
        "Sử dụng trên tối đa 15 trình duyệt/thiết bị khác nhau",
        "Không cần đợi Admin phê duyệt thủ công"
      ],
      "permissions": {
        "max_resolution": "FHD",
        "allowed_servers": ["Vietsub", "Thuyết Minh", "Lồng Tiếng"],
        "max_playlists": 50,
        "watch_together": false,
        "hide_watermark": false,
        "vip_badge": false,
        "bypass_ads": true
      }
    }
  ]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Initial seed data for all setting keys in settings table
INSERT INTO public.settings (key, value) VALUES (
  'general',
  '{
    "site_name": "DongMePhim",
    "site_url": "https://localhost:4321",
    "site_description": "Nền tảng xem phim trực tuyến cao cấp và hoàn toàn miễn phí",
    "site_keywords": "xem phim, phim bộ, phim lẻ, phim hay, phim mới, dongmephim, phim hd, xem phim online",
    "maintenance_enable": false,
    "maintenance_message": "Hệ thống đang được nâng cấp để mang lại trải nghiệm điện ảnh đỉnh cao hơn.",
    "maintenance_end_time": "1970-01-01T02:00:00.000Z",
    "api_encrypt_enable": true,
    "api_encrypt_pass": "tphimx",
    "tmdb_api_key": "",
    "site_title_template": "%title% | %site_name%",
    "meta_robots": "index, follow",
    "og_image_default": "/favicon.png",
    "google_verification": "",
    "bing_verification": "",
    "schema_logo_url": "/favicon.png",
    "schema_business_name": "DongMePhim"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'smtp',
  '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 465,
    "smtp_secure": "SSL",
    "smtp_user": "noreply@dongmephim.com",
    "smtp_pass": "mock_app_password",
    "smtp_from_email": "noreply@dongmephim.com",
    "smtp_from_name": "DongMePhim System"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'telegram',
  '{
    "telegram_bot_token": "mock_bot_token",
    "telegram_chat_id": "123456789",
    "telegram_channel_id": "@dongphimtxa",
    "telegram_bot_username": "dongphimbot",
    "telegram_verified": true,
    "telegram_notify_report": true,
    "telegram_notify_zalo": true,
    "telegram_notify_user": true,
    "telegram_notify_luckydraw": true
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'app',
  '{
    "app_version": "4.7.0",
    "app_release_notes": "- 🚀 [v4.7.0] Chuẩn hóa toàn bộ các Mobile API Adapter cho di động\\n- 💎 [VIP] Phát triển tính năng chọn và đăng ký nâng cấp gói cước trực tiếp trên Flutter app tích hợp cổng SePay / VietQR\\n- 📺 [CAST] Tích hợp trang chiếu lên TV (/cast) độc lập tối ưu cho màn hình TV\\n- ⭐️ [RATING] Hệ thống đánh giá phim 1-10 sao đồng bộ giữa Web và Mobile App\\n- 🔄 [CRON] Cron Job tự động quét và cập nhật tập phim mới từ nguồn KKPhim, tự động thông báo tới người dùng có phim trong danh sách Yêu thích",
    "app_android_download_enable": true,
    "app_android_download_url": "https://app.nrotxa.online/TPHIMX.apk",
    "app_apk_size": "66122454",
    "app_apk_sha256": "4f7df1b9932e36159f6c4ee76fb305d627b45e972864f15695a8aaca7baaa0ef",
    "app_ios_direct_install_enable": false,
    "app_ios_download_url": "/ios-access",
    "app_ios_ipa_download_enable": true,
    "app_ios_ipa_url": "https://github.com/TXAVLOG/tphimx-setup/releases/download/v4.7.0_470/TPHIMX-Premium-v4.7.0+470.ipa",
    "app_google_play_enable": false,
    "app_google_play_url": "",
    "app_app_store_enable": false,
    "app_app_store_url": ""
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'user',
  '{
    "allow_registration": true,
    "require_email_verification": true,
    "verification_method": "link",
    "verification_token_expiry": 3600,
    "reset_password_token_expiry": 1800
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'login',
  '{
    "login_standard_enable": true,
    "login_google_enable": true,
    "login_google_client_id": "mock_google_id",
    "login_google_client_secret": "mock_google_secret",
    "login_google_onetap_enable": true,
    "login_fb_enable": true,
    "login_fb_app_id": "mock_fb_id",
    "login_fb_app_secret": "mock_fb_secret",
    "login_apple_enable": false,
    "login_apple_client_id": "",
    "login_apple_team_id": "",
    "login_apple_key_id": "",
    "login_zalo_enable": true,
    "login_zalo_app_id": "mock_zalo_id",
    "login_zalo_secret_key": "mock_zalo_secret",
    "login_discord_enable": false,
    "login_discord_client_id": "",
    "login_discord_client_secret": "",
    "login_github_enable": false,
    "login_github_client_id": "",
    "login_github_client_secret": "",
    "login_x_enable": false,
    "login_x_client_id": "",
    "login_x_client_secret": "",
    "turnstile_enable": false,
    "turnstile_site_key": "",
    "turnstile_secret_key": ""
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'social',
  '{
    "social_fb_enable": true,
    "social_fb_url": "https://www.facebook.com/tphimx",
    "social_fb_group_enable": true,
    "social_fb_group_url": "https://www.facebook.com/groups/1819522938713878",
    "social_telegram_enable": true,
    "social_telegram_url": "https://t.me/dongphimtxa",
    "social_tiktok_enable": false,
    "social_tiktok_url": "",
    "social_zalo_group_enable": true,
    "social_zalo_group_url": "https://zalo.me/g/nc4aaozaxnr5fszvnxdb",
    "social_discord_enable": false,
    "social_discord_url": "",
    "decoy_enable": false,
    "decoy_passcode": "phimtxadinhvai",
    "zalo_lock_enable": false
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'luckyDraw',
  '{
    "lucky_draw_active_event_id": "summer_event_2024"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'payments',
  '{
    "sandbox_mode": false,
    "sepay_sandbox_mode": false,
    "payos_enable": true,
    "payos_client_id": "mock_payos_id",
    "payos_api_key": "mock_api_key",
    "payos_checksum_key": "mock_checksum_key",
    "paypal_enable": true,
    "paypal_client_id": "mock_paypal_id",
    "sepay_enable": true,
    "sepay_api_key": "mock_sepay_key",
    "sepay_merchant_id": "SP-LIVE-TX5B9345",
    "sepay_secret_key": "spsk_live_xdFNcCKmERhi2Y3teu8YRN8bLKSbNQxQ",
    "sepay_ipn_secret_key": "TPHIMX_SECRET_999",
    "sepay_sandbox_api_key": "",
    "sepay_integration_type": "gateway",
    "sepay_bank_account_id": "",
    "sepay_bank_name": "",
    "sepay_account_no": "",
    "sepay_account_name": "",
    "vnpay_enable": true,
    "vnpay_tmn_code": "mock_tmn_code",
    "vnpay_hash_secret": "mock_hash_secret",
    "stripe_enable": true,
    "stripe_publishable_key": "mock_stripe_pub_key",
    "stripe_secret_key": "mock_stripe_sec_key",
    "vat_rate": 8,
    "manual_enable": true,
    "manual_bank_name": "Techcombank",
    "manual_account_no": "2923252311",
    "manual_account_name": "TANG XUAN ANH"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, value) VALUES (
  'ads',
  '{
    "pre_roll_enable": false,
    "pre_roll_type": "video",
    "pre_roll_url": "https://www.w3schools.com/html/mov_bbb.mp4",
    "pre_roll_skip_seconds": 5,
    "click_ad_enable": false,
    "click_ad_code": "https://shope.ee",
    "click_ad_threshold": 5,
    "google_ads_enable": false,
    "google_ads_client_id": "ca-pub-123456789",
    "offerwall_enable": false,
    "offerwall_script": "",
    "ad_provider": "none"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

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
  episode_name text,
  server_name text,
  is_spoiler boolean DEFAULT false,
  is_reported boolean DEFAULT false,
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
  sale_price numeric,
  sale_months integer,
  sale_end_date timestamp with time zone,
  sale_annual_price numeric,
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

-- Table: public.txa_zalo_bypass_keys
CREATE TABLE IF NOT EXISTS public.txa_zalo_bypass_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_code character varying NOT NULL UNIQUE,
  package_title character varying NOT NULL,
  recipient_email character varying,
  note text,
  duration_months integer DEFAULT 1,
  max_devices integer DEFAULT 15,
  expiry_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_zalo_bypass_keys ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_zalo_key_logs
CREATE TABLE IF NOT EXISTS public.txa_zalo_key_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key_code character varying NOT NULL,
  browser_token text NOT NULL,
  nickname character varying,
  ip character varying,
  user_agent text,
  used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_zalo_key_logs ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "all_txa_zalo_bypass_keys" ON public.txa_zalo_bypass_keys FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "all_txa_zalo_key_logs" ON public.txa_zalo_key_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: public.txa_promo_codes
CREATE TABLE IF NOT EXISTS public.txa_promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL UNIQUE,
  discount_type character varying NOT NULL DEFAULT 'percent'::character varying,
  discount_value numeric NOT NULL DEFAULT 0,
  package_scope character varying NOT NULL DEFAULT 'all'::character varying,
  max_uses integer NOT NULL DEFAULT 100,
  used_count integer NOT NULL DEFAULT 0,
  expiry_date timestamp with time zone NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_txa_promo_codes" ON public.txa_promo_codes FOR ALL TO public USING (true);

-- Table: public.txa_promo_code_uses
CREATE TABLE IF NOT EXISTS public.txa_promo_code_uses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL,
  username character varying NOT NULL,
  email character varying,
  ip character varying,
  user_agent text,
  txid character varying,
  used_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_promo_code_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_txa_promo_code_uses" ON public.txa_promo_code_uses FOR ALL TO public USING (true);
