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
  package character varying DEFAULT 'free'::character varying,
  status character varying DEFAULT 'active'::character varying,
  email_verified boolean DEFAULT true,
  expiry_date timestamp with time zone,
  join_date timestamp with time zone,
  phone character varying,
  avatar_change_count integer DEFAULT 0,
  last_avatar_changed_at timestamp with time zone,
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
  require_login boolean NOT NULL DEFAULT false,
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

-- Table: public.favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT favorites_movie_id_fkey FOREIGN KEY (movie_id) REFERENCES public.movies(id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_user_id_movie_id_key UNIQUE (user_id, movie_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

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
        "allowed_servers": [
          "#Hà Nội (Vietsub)",
          "Vietsub #1",
          "#Hà Nội (Vietsub + Lồng Tiếng)",
          "Vietsub",
          "#Hà Nội (NoSub)",
          "Vietsub #2",
          "#Hà Nội (Vietsusb)",
          "#Hà Nội (Thuyết Minh)",
          "#Hà Nội (Thuyết Minh YOUKU)",
          "#Hà Nội (Thuyết Minh IQI)",
          "#Hà Nội (Thuyết Minh FPT)",
          "#Hà Nội (Vietsub + Thuyết Minh)",
          "#Hà Nội (Thuyết Minh FPTPLAY)",
          "#Hà Nội (Thuyết Minh VIEON)",
          "#Hà Nội (Thuyết Minh TV360)",
          "#Hà Nội (Thuyết Minh IQIYI)",
          "Thuyết Minh",
          "Lồng Tiếng"
        ],
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
    "app_version": "5.0.3",
    "app_release_notes": "- 📺 [STORYBOARD] Tích hợp tính năng xem trước ảnh thu nhỏ storyboard khi tua (kéo thả hoặc nhấn phím remote)\\n- 🎛️ [REMOTE] Hỗ trợ hoàn toàn D-Pad remote Smart TV cho Panel Cài đặt cải tiến\\n- 🌍 [I18N] Việt hóa/Đa ngôn ngữ toàn bộ giao diện điều chỉnh tùy chọn kiểu dáng phụ đề\\n- 💎 [SUBTITLE] Cho phép tùy biến cỡ chữ, màu sắc, kiểu viền, độ mờ nền và vị trí của phụ đề song ngữ trực tiếp trong ngăn kéo Cài đặt\\n- ⚙️ [SYS] Đồng bộ và lưu cấu hình người dùng vào SharedPreferences tự động áp dụng khi đổi tập",
    "app_changelogs": [
      {
        "version": "5.0.3",
        "date": "2026-07-15",
        "title": "🚀 v5.0.3 - Storyboard Scrubbing & Subtitle Styling",
        "content": "- 📺 [STORYBOARD] Tích hợp tính năng xem trước ảnh thu nhỏ storyboard khi tua (kéo thả hoặc nhấn phím remote)\\n- 🎛️ [REMOTE] Hỗ trợ hoàn toàn D-Pad remote Smart TV cho Panel Cài đặt cải tiến\\n- 🌍 [I18N] Việt hóa/Đa ngôn ngữ toàn bộ giao diện điều chỉnh tùy chọn kiểu dáng phụ đề\\n- 💎 [SUBTITLE] Cho phép tùy biến cỡ chữ, màu sắc, kiểu viền, độ mờ nền và vị trí của phụ đề song ngữ trực tiếp trong ngăn kéo Cài đặt\\n- ⚙️ [SYS] Đồng bộ và lưu cấu hình người dùng vào SharedPreferences tự động áp dụng khi đổi tập"
      },
      {
        "version": "5.0.2",
        "date": "2026-07-12",
        "title": "🚀 v5.0.2 - Smart TV Settings Panel & Subtitle Sync",
        "content": "- ⚙️ [SYS] Thiết kế Sidebar Cài đặt trên Mobile & TV (Bỏ qua Intro, Tự chuyển tập, Ngôn ngữ phụ đề ưu tiên)\\n- 📺 [TV] Hỗ trợ hoàn hảo điều hướng D-Pad phím remote TV trên Panel Cài đặt\\n- 🔄 [SEAMLESS] Trải nghiệm chuyển tập liền mạch không gián đoạn trình phát\\n- 🛠️ [FIX] Giải quyết hoàn toàn lỗi khựng hình/feedback loop khi kéo thanh tua\\n- 🌍 [SUBTITLE] Bổ sung panel cào & ghép phụ đề từ VSMOV cho các tập phim KKPhim\\n- 🖼️ [TMDB] Tự động đồng bộ và lấy ảnh thu nhỏ (still_path) tập phim từ TMDB trong các tác vụ cron"
      },
      {
        "version": "5.0.1",
        "date": "2026-07-11",
        "title": "🚀 v5.0.1 - R2 Fix, Font Decode & TV Pairing Stability",
        "content": "- 📺 [R2] Bổ sung HTTP headers chuẩn khi tải luồng stream từ Cloudflare R2, sửa lỗi không phát được video\\n- 🔤 [FONT] Khắc phục triệt để lỗi hiển thị font tiếng Việt (diacritics) từ API bằng giải mã UTF-8\\n- 📱 [CONTROLS] Tối ưu hóa phản hồi chạm để ẩn/hiện thanh điều khiển trình phát video ngay lập tức\\n- 🔄 [HISTORY] Khắc phục lỗi lưu lịch sử xem phim và đồng bộ tiến độ thời gian thực giữa TV và điện thoại di động\\n- 📡 [TV-PAIR] Sửa lỗi polling khiến mất trạng thái kết nối TV khi QR code hết hạn, cải thiện độ ổn định ghép nối mã TV"
      },
      {
        "version": "5.0.0",
        "date": "2026-07-09",
        "title": "🚀 v5.0.0 - Rebranding, Sync Progress & TV Pairing",
        "content": "- 🎨 [BRAND] Đồng bộ thương hiệu mới DongMePhim trên ứng dụng di động\\n- 🔄 [SYNC] Tự động đồng bộ lịch sử và tiến trình xem phim thời gian thực giữa Web và Mobile App\\n- 💎 [VIP] Nâng cấp cơ chế mua gói và chuyển hướng SePay qua Data URI bảo mật\\n- 📺 [TV] Đồng bộ hiển thị và tối ưu hóa hàng đợi kết nối TV Pairing đồng thời qua QR/Code\\n- 🛠️ [FIX] Thiết lập cấu hình ProGuard và khắc phục hoàn toàn lỗi crash khi quét mã QR trên Android"
      },
      {
        "version": "4.7.5",
        "date": "2026-07-04",
        "title": "🚀 v4.7.5 - Player Fixes, Ad Buffering & Upgrades Stability",
        "content": "- 📺 [PLAYER] Khắc phục lỗi ẩn thanh controls trình phát ArtPlayer trên trình duyệt Safari/Chrome mobile\\n- 🔄 [AUTO-NEXT] Sửa lỗi tự động chuyển tập nhảy nhanh và rò rỉ trạng thái giữa các tập\\n- 🎬 [AD] Nâng cấp cơ chế buffering quảng cáo pre-roll, tự động bỏ qua nếu link quảng cáo lỗi giúp người dùng vào thẳng phim\\n- 💎 [VIP] Chuẩn hóa đồng bộ logic gói cước chữ thường để khắc phục lỗi không nhận diện gói Premium nâng cấp trên App\\n- ⚙️ [SYS] Nâng cấp phiên bản hệ thống lên v4.7.5 tương thích hoàn toàn"
      },
      {
        "version": "4.7.0",
        "date": "2026-06-28",
        "title": "🚀 v4.7.0 - Mobile API Adapter & Subscriptions",
        "content": "- 🚀 [v4.7.0] Chuẩn hóa toàn bộ các Mobile API Adapter cho di động\\n- 💎 [VIP] Phát triển tính năng chọn và đăng ký nâng cấp gói cước trực tiếp trên Flutter app tích hợp cổng SePay / VietQR\\n- 📺 [CAST] Tích hợp trang chiếu lên TV (/cast) độc lập tối ưu cho màn hình TV\\n- ⭐️ [RATING] Hệ thống đánh giá phim 1-10 sao đồng bộ giữa Web và Mobile App\\n- 🔄 [CRON] Cron Job tự động quét và cập nhật tập phim mới từ nguồn KKPhim, tự động thông báo tới người dùng có phim trong danh sách Yêu thích"
      },
      {
        "version": "4.5.0",
        "date": "2026-06-04",
        "title": "🚀 v4.5.0 - API Structure Update & UI Improvements",
        "content": "- 🔄 [API] Cập nhật API /home trả về các key mới: TXA_PB1, TXA_PL1, TXA_NEW1, TXA_HOT1, TXA_HH1, TXA_TV1, TXA_CR1, TXA_LIST1\\n- 🌍 [I18N] API trả về key bản dịch thay vì chuỗi tiếng Việt để hỗ trợ đa ngôn ngữ tốt hơn\\n- 📱 [APP] Cập nhật Flutter app dùng các key mới từ API /home\\n- 🎨 [UI] Fix responsive layout cho section \"Đường Đua Điện Ảnh Quốc Tế\" (mobile/desktop)\\n- 🎬 [WEB] Thêm 3 chủ đề curated vào trang chủ: Phim Mùa Hè Hấp Dẫn, Cổ Trang Đỉnh Cao, Hành Động Mạnh Mẽ\\n- ⚡ [PERF] Fix Flutter app UI update ngay khi đổi ngôn ngữ (không cần reload app)\\n- 🛠️ [FIX] Tối ưu hóa hiển thị section phim theo quốc gia trên mobile\\n"
      },
      {
        "version": "4.4.0",
        "date": "2026-05-30",
        "title": "Auto Error Logging & Device Tracking - v4.4.0",
        "content": "🚀 [v4.4.0 - Auto Error Logging & Device Tracking]\\n- 📊 [NEW] Tự động gửi error log lên server khi có lỗi xảy ra.\\n- 📱 [NEW] Thu thập thông tin thiết bị (loại, tên, model, phiên bản OS, UDID).\\n- 🌍 [NEW] Tự động phát hiện IP và vị trí địa lý của người dùng.\\n- 🔐 [NEW] Thêm error logging vào màn hình đăng nhập/đăng ký.\\n- 🛡️ [SYS] Tối ưu hóa hệ thống theo dõi lỗi để debug nhanh hơn."
      },
      {
        "version": "4.3.0",
        "date": "2026-05-27",
        "title": "Cloudflare HLS Premium Streaming - v4.3.0",
        "content": "🚀 [v4.3.0 - Cloudflare Premium CDN Streaming]\\n- ⚡ [NEW] Tích hợp bộ giải quyết luồng cao tốc Stream V6 trực tiếp qua Cloudflare Worker.\\n- 🚀 [PERF] Tải video và tải xuống mượt mà hơn gấp 5 lần thông qua hệ thống bộ nhớ đệm tự động R2 CDN.\\n- 🛡️ [SYS] Khắc phục hoàn toàn lỗi phân giải phân đoạn HLS và lỗi không tìm thấy tập phim trên máy chủ Vercel.\\n- 💎 [UI] Tối ưu hóa trình phát TxaPlayer thích ứng tốt hơn với kết nối mạng yếu."
      }
    ],
    "app_android_download_enable": true,
    "app_android_download_url": "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim-Mobile.apk",
    "app_apk_size": "74159873",
    "app_apk_sha256": "b8d50a7c30cf9b67b4232b9292bb1b558cbe4b47b013c61d3f6a8ad5d4d4b488",
    "app_ios_direct_install_enable": false,
    "app_ios_download_url": "/ios-access",
    "app_ios_ipa_download_enable": true,
    "app_ios_ipa_url": "https://github.com/TXAVLOG/dongmephim-mobile/releases/download/v5.0.3_503/DongMePhim-Premium-v5.0.3+503.ipa",
    "app_google_play_enable": false,
    "app_google_play_url": "",
    "app_app_store_enable": false,
    "app_app_store_url": "",
    "app_smart_tv_enable": true,
    "app_smart_tv_url": "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim-TV.apk",
    "app_smart_tv_size": "74159873",
    "app_smart_tv_sha256": "b8d50a7c30cf9b67b4232b9292bb1b558cbe4b47b013c61d3f6a8ad5d4d4b488",
    "app_smart_tv_code": "3779765",
    "app_windows_download_enable": true,
    "app_windows_download_url": "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim_v5.0.3_Setup.exe",
    "app_windows_size": "26144959",
    "app_windows_sha256": "90bf7e1e184f4cfa040f686f2bd4ec54904575ccffc09f5862b65b8be8d773fa",
    "app_maintenance_enable": false,
    "app_maintenance_message": "Ứng dụng đang được bảo trì định kỳ để nâng cao hiệu năng. Vui lòng quay lại sau ít phút!"
  }\'::jsonb
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
  movie_slug character varying,
  episode_name character varying,
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
  source character varying,
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
  note text,
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
CREATE POLICY "all_favorites" ON public.favorites FOR ALL TO public USING (((auth.uid() = user_id) OR is_admin()));
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

-- Table: public.txa_cron_logs
CREATE TABLE IF NOT EXISTS public.txa_cron_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_name character varying NOT NULL,
  status character varying NOT NULL,
  message text,
  details jsonb,
  duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.txa_cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_txa_cron_logs" ON public.txa_cron_logs FOR ALL TO public USING (true);

-- Table: public.movie_requests
CREATE TABLE IF NOT EXISTS public.movie_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name character varying NOT NULL,
  origin_name character varying,
  publish_year integer,
  link character varying,
  author character varying,
  status character varying DEFAULT 'pending'::character varying,
  reject_reason text,
  source character varying,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT movie_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

ALTER TABLE public.movie_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_movie_requests" ON public.movie_requests FOR SELECT TO public USING (((user_id = auth.uid()) OR is_admin()));
CREATE POLICY "insert_movie_requests" ON public.movie_requests FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "modify_movie_requests" ON public.movie_requests FOR ALL TO public USING (is_admin());

-- Table: public.txa_tv_devices
-- Lưu thông tin thiết bị TV đã đăng ký
CREATE TABLE IF NOT EXISTS public.txa_tv_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id character varying NOT NULL UNIQUE,        -- Unique ID thiết bị TV
  device_name character varying NOT NULL,              -- Tên TV (e.g. "Samsung Living Room")
  device_model character varying,                       -- Model TV
  device_os character varying,                          -- Android TV / Google TV
  os_version character varying,                         -- Version OS
  screen_resolution character varying,                  -- "1920x1080" / "3840x2160"
  ip_address character varying,                         -- IP local
  user_id uuid,                                         -- User đã pair (NULL = chưa pair)
  pair_code character varying,                          -- Mã pair hiện tại (TXTV + 4 số)
  pair_code_expires_at timestamp with time zone,        -- Hết hạn mã pair
  is_active boolean DEFAULT true,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT txa_tv_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
ALTER TABLE public.txa_tv_devices ENABLE ROW LEVEL SECURITY;

-- Table: public.txa_tv_pairing_sessions
-- Quản lý các phiên đăng nhập/pair giữa Mobile ↔ TV
CREATE TABLE IF NOT EXISTS public.txa_tv_pairing_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id character varying NOT NULL,                 -- TV device_id
  pair_code character varying NOT NULL,                 -- Mã 8 số: TXTV + 4 số random
  qr_token character varying UNIQUE,                    -- Token QR code (unique per session)
  qr_payload text,                                      -- Encoded QR data (encrypted)
  session_type character varying NOT NULL DEFAULT 'code', -- 'code' | 'qr'
  status character varying NOT NULL DEFAULT 'pending',  -- 'pending' | 'waiting_confirm' | 'confirmed' | 'rejected' | 'expired'
  user_id uuid,                                         -- User đang pair (set khi mobile nhập mã)
  user_info jsonb,                                      -- Cache user info (name, avatar, etc.)
  location_info jsonb,                                  -- Vị trí TV (cho xác nhận QR)
  expires_at timestamp with time zone NOT NULL,         -- Mã hết hạn (code: 10min, QR: 30s)
  confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);
ALTER TABLE public.txa_tv_pairing_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "all_txa_tv_devices" ON public.txa_tv_devices FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "all_txa_tv_pairing_sessions" ON public.txa_tv_pairing_sessions FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: public.txa_discord_connections
CREATE TABLE IF NOT EXISTS public.txa_discord_connections (
  discord_id character varying NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  discord_username character varying NOT NULL,
  discord_avatar character varying,
  access_token character varying,
  refresh_token character varying,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (discord_id),
  CONSTRAINT txa_discord_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
ALTER TABLE public.txa_discord_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_txa_discord_connections" ON public.txa_discord_connections FOR ALL TO public USING (true) WITH CHECK (true);

-- Table: public.txa_user_activity_stats
CREATE TABLE IF NOT EXISTS public.txa_user_activity_stats (
  user_id uuid NOT NULL UNIQUE,
  total_watch_seconds integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  total_comments integer DEFAULT 0,
  discord_message_count integer DEFAULT 0,
  level character varying DEFAULT 'Mầm Non',
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id),
  CONSTRAINT txa_user_activity_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
ALTER TABLE public.txa_user_activity_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_txa_user_activity_stats" ON public.txa_user_activity_stats FOR ALL TO public USING (true) WITH CHECK (true);

-- Materialized View: public.mv_movie_trending_stats
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_movie_trending_stats AS
WITH activity_24h AS (
    SELECT 
        wh.movie_id,
        COUNT(DISTINCT wh.user_id) AS unique_viewers_24h,
        COUNT(*) AS views_24h,
        SUM(COALESCE(wh.current_time, 0)) AS total_watch_time_24h
    FROM public.watch_history wh
    WHERE wh.updated_at >= now() - INTERVAL '24 hours'
    GROUP BY wh.movie_id
),
activity_prev_24h AS (
    SELECT 
        wh.movie_id,
        COUNT(*) AS views_prev_24h
    FROM public.watch_history wh
    WHERE wh.updated_at >= now() - INTERVAL '48 hours' AND wh.updated_at < now() - INTERVAL '24 hours'
    GROUP BY wh.movie_id
),
favs_24h AS (
    SELECT 
        f.movie_id,
        COUNT(*) AS favorites_24h
    FROM public.favorites f
    WHERE f.created_at >= now() - INTERVAL '24 hours'
    GROUP BY f.movie_id
),
favs_prev_24h AS (
    SELECT 
        f.movie_id,
        COUNT(*) AS favorites_prev_24h
    FROM public.favorites f
    WHERE f.created_at >= now() - INTERVAL '48 hours' AND f.created_at < now() - INTERVAL '24 hours'
    GROUP BY f.movie_id
),
comments_24h AS (
    SELECT 
        m.id AS movie_id,
        COUNT(*) AS comments_24h,
        COUNT(DISTINCT c.author) AS unique_commenters_24h
    FROM public.txa_comments c
    JOIN public.movies m ON m.slug = c.movie_slug
    WHERE c.created_at >= now() - INTERVAL '24 hours'
    GROUP BY m.id
),
comments_prev_24h AS (
    SELECT 
        m.id AS movie_id,
        COUNT(*) AS comments_prev_24h
    FROM public.txa_comments c
    JOIN public.movies m ON m.slug = c.movie_slug
    WHERE c.created_at >= now() - INTERVAL '48 hours' AND c.created_at < now() - INTERVAL '24 hours'
    GROUP BY m.id
),
ratings_24h AS (
    SELECT 
        m.id AS movie_id,
        COUNT(*) AS ratings_24h,
        AVG(r.rating) AS avg_rating_24h
    FROM public.txa_movie_ratings r
    JOIN public.movies m ON m.slug = r.movie_slug
    WHERE r.created_at >= now() - INTERVAL '24 hours'
    GROUP BY m.id
),
global_stats AS (
    SELECT COALESCE(AVG(rating), 8.0) AS avg_rating_all FROM public.txa_movie_ratings
),
movie_overall AS (
    SELECT 
        m.id AS movie_id,
        COALESCE(fav.fav_count, 0) AS total_favorites,
        COALESCE(rat.rating_count, 0) AS total_ratings,
        COALESCE(rat.avg_rating, 8.0) AS overall_avg_rating,
        COALESCE(com.comment_count, 0) AS total_comments
    FROM public.movies m
    LEFT JOIN (
        SELECT movie_id, COUNT(*) AS fav_count FROM public.favorites GROUP BY movie_id
    ) fav ON fav.movie_id = m.id
    LEFT JOIN (
        SELECT m.id AS movie_id, COUNT(*) AS rating_count, AVG(r.rating) AS avg_rating
        FROM public.txa_movie_ratings r
        JOIN public.movies m ON m.slug = r.movie_slug
        GROUP BY m.id
    ) rat ON rat.movie_id = m.id
    LEFT JOIN (
        SELECT m.id AS movie_id, COUNT(*) AS comment_count
        FROM public.txa_comments c
        JOIN public.movies m ON m.slug = c.movie_slug
        GROUP BY m.id
    ) com ON com.movie_id = m.id
)
SELECT 
    m.id AS movie_id,
    m.title,
    m.slug,
    m.type,
    m.created_at,
    m.imdb_score,
    m.tmdb_score,
    
    COALESCE(v24.unique_viewers_24h, 0) AS unique_viewers_24h,
    COALESCE(v24.views_24h, 0) AS views_24h,
    COALESCE(v24.total_watch_time_24h, 0) AS total_watch_time_24h,
    
    mo.total_favorites,
    COALESCE(f24.favorites_24h, 0) AS favorites_24h,
    CASE 
        WHEN COALESCE(v24.unique_viewers_24h, 0) > 0 
        THEN (COALESCE(f24.favorites_24h, 0)::numeric / v24.unique_viewers_24h)
        ELSE 0 
    END AS favorite_rate_24h,

    COALESCE(c24.comments_24h, 0) AS comments_24h,
    COALESCE(c24.unique_commenters_24h, 0) AS unique_commenters_24h,
    
    ((COALESCE(r24.ratings_24h, 0) * COALESCE(r24.avg_rating_24h, 8.0) + 5 * (SELECT avg_rating_all FROM global_stats)) / (COALESCE(r24.ratings_24h, 0) + 5)) AS bayesian_rating_24h,
    ((mo.total_ratings * mo.overall_avg_rating + 10 * (SELECT avg_rating_all FROM global_stats)) / (mo.total_ratings + 10)) AS bayesian_rating_overall,
    
    (1 + ln(1 + (
        ABS(
            (COALESCE(v24.views_24h, 0) + COALESCE(f24.favorites_24h, 0) * 5 + COALESCE(c24.comments_24h, 0) * 3) - 
            (COALESCE(vp.views_prev_24h, 0) + COALESCE(fp.favorites_prev_24h, 0) * 5 + COALESCE(cp.comments_prev_24h, 0) * 3)
        )::numeric / GREATEST(COALESCE(vp.views_prev_24h, 0) + COALESCE(fp.favorites_prev_24h, 0) * 5 + COALESCE(cp.comments_prev_24h, 0) * 3, 1)
    ))) AS growth_velocity,
    
    EXTRACT(EPOCH FROM (now() - m.created_at)) / 3600 AS age_hours,
    
    mo.total_ratings,
    mo.total_comments
FROM public.movies m
JOIN movie_overall mo ON mo.movie_id = m.id
LEFT JOIN activity_24h v24 ON v24.movie_id = m.id
LEFT JOIN activity_prev_24h vp ON vp.movie_id = m.id
LEFT JOIN favs_24h f24 ON f24.movie_id = m.id
LEFT JOIN favs_prev_24h fp ON fp.movie_id = m.id
LEFT JOIN comments_24h c24 ON c24.movie_id = m.id
LEFT JOIN comments_prev_24h cp ON cp.movie_id = m.id
LEFT JOIN ratings_24h r24 ON r24.movie_id = m.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_movie_trending_stats_movie_id ON public.mv_movie_trending_stats (movie_id);

-- Recommendations Function
CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(
    p_user_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    poster_url VARCHAR,
    banner_url VARCHAR,
    release_year INT,
    quality VARCHAR,
    status VARCHAR,
    type VARCHAR,
    imdb_score NUMERIC,
    trending_score NUMERIC
) AS $$
DECLARE
    v_has_history BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.watch_history WHERE user_id = p_user_id LIMIT 1
    ) INTO v_has_history;

    IF p_user_id IS NULL OR NOT v_has_history THEN
        RETURN QUERY
        SELECT 
            m.id, m.title, m.slug, m.poster_url, m.banner_url, m.release_year, 
            m.quality, m.status, m.type, m.imdb_score,
            (
                CASE 
                    WHEN (ts.unique_viewers_24h = 0 AND ts.views_24h = 0)
                    THEN COALESCE(m.imdb_score, m.tmdb_score, 8.0) * 10
                    ELSE (
                        (4 * ts.unique_viewers_24h + 0.0017 * ts.total_watch_time_24h + 15 * ts.favorites_24h + 8 * ts.comments_24h) * ts.growth_velocity
                        / POWER((ts.age_hours / 24 + 2), 1.5)
                    )
                END
            )::numeric AS trending_score
        FROM public.movies m
        JOIN public.mv_movie_trending_stats ts ON ts.movie_id = m.id
        ORDER BY trending_score DESC
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        WITH watched_genres AS (
            SELECT DISTINCT jsonb_array_elements_text(m.genres) AS genre
            FROM public.watch_history wh
            JOIN public.movies m ON m.id = wh.movie_id
            WHERE wh.user_id = p_user_id
        ),
        candidate_movies AS (
            SELECT DISTINCT m.id
            FROM public.movies m
            JOIN watched_genres wg ON m.genres @> jsonb_build_array(wg.genre)
            WHERE NOT EXISTS (
                SELECT 1 FROM public.watch_history wh 
                WHERE wh.movie_id = m.id AND wh.user_id = p_user_id
            )
        )
        SELECT 
            m.id, m.title, m.slug, m.poster_url, m.banner_url, m.release_year, 
            m.quality, m.status, m.type, m.imdb_score,
            (
                CASE 
                    WHEN (ts.unique_viewers_24h = 0 AND ts.views_24h = 0)
                    THEN COALESCE(m.imdb_score, m.tmdb_score, 8.0) * 10
                    ELSE (
                        (4 * ts.unique_viewers_24h + 0.0017 * ts.total_watch_time_24h + 15 * ts.favorites_24h + 8 * ts.comments_24h) * ts.growth_velocity
                        / POWER((ts.age_hours / 24 + 2), 1.5)
                    )
                END
            )::numeric AS trending_score
        FROM public.movies m
        JOIN candidate_movies cm ON cm.id = m.id
        JOIN public.mv_movie_trending_stats ts ON ts.movie_id = m.id
        ORDER BY trending_score DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

