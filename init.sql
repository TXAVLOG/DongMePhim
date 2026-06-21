-- =================================================================================
-- INITIALIZATION SQL SCRIPT cho các bảng mở rộng của TPhimX / WebFilm
-- =================================================================================

-- 1. Bảng lưu trữ Phiên Đăng Nhập (Bảo mật Session Cookies)
CREATE TABLE IF NOT EXISTS public.txa_user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  session_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL
);

-- Index hỗ trợ tốc độ kiểm tra token
CREATE INDEX IF NOT EXISTS idx_txa_user_sessions_token ON public.txa_user_sessions(session_token);

-- 2. Bảng lưu trữ Lịch Sử Gửi Email (Email Logs)
CREATE TABLE IF NOT EXISTS public.txa_email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient text NOT NULL,
  sender text NOT NULL,
  subject text NOT NULL,
  category text,
  status text,
  response_code text,
  parameters jsonb,
  smtp_config jsonb,
  html text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index hỗ trợ tìm kiếm log theo recipient
CREATE INDEX IF NOT EXISTS idx_txa_email_logs_recipient ON public.txa_email_logs(recipient);
