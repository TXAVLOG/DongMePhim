# TODO LIST - WebFilm

Danh sách chi tiết các công việc cần làm cho dự án WebFilm, chia theo từng phase.

---

## Phase 0: Project Governance (Đã hoàn thành 100%)
- [x] Tạo `ROADMAP.md`
- [x] Tạo `CLAUDE.md`
- [x] Tạo `ARCHITECTURE.md`
- [x] Tạo `DATABASE.md`
- [x] Tạo `API_STRATEGY.md`
- [x] Xác nhận kế hoạch với người dùng (Đã duyệt)

---

## Phase 1: Frontend Foundation (100%)
- [x] Cài đặt TailwindCSS v4 mới nhất bằng CLI phù hợp.
- [x] Cấu hình thiết lập CSS và fonts (Inter/Outfit) trong `src/styles/index.css`.
- [x] Tạo `src/layouts/MainLayout.astro` (layout chung cho ứng dụng).
- [x] Tạo `src/layouts/WatchLayout.astro` (layout tập trung tối đa cho Player).
- [x] Xây dựng Header & Navbar responsive (Hỗ trợ tìm kiếm, menu thể loại, nút đăng nhập).
- [x] Xây dựng Footer responsive.
- [x] Tạo bộ UI component cơ bản trong `src/components/ui/`:
  - [x] `Button.tsx` (hoặc `.astro`)
  - [x] `Card.astro` (Movie Card)
  - [x] `Modal.tsx`
  - [x] `Badge.astro`
- [x] Tích hợp component SEO cơ bản trong MainLayout.

---

## Phase 2: Database Design (100% - Đã tạo file SQL Schema & RLS trong init.sql)
- [x] Sử dụng **Supabase MCP** (`execute_sql`) / Script SQL (`init.sql`) để tạo các bảng dữ liệu trên database thật.
- [x] Thiết kế cấu trúc bảng `movies` chỉ lưu trữ metadata (Tên, Tên gốc, Slug, Năm, Poster, Banner, Loại, Trạng thái, Số tập hiện có, Tổng số tập, Chất lượng, Ngôn ngữ) - **Tuyệt đối không lưu link tập phim hay stream URL**.
- [x] Tạo các bảng `actors`, `genres`, `countries`.
- [x] Tạo các bảng quan hệ nhiều-nhiều: `movie_actors`, `movie_genres`, `movie_countries`.
- [x] Tạo bảng `users` (đồng bộ tự động từ `auth.users`).
- [x] Tạo bảng `watch_history` (lưu vị trí xem theo `episode_slug` và `episode_name`, không lưu link phát).
- [x] Tạo bảng `watch_lists` (danh sách yêu thích) và `schedules` (lịch chiếu phim).
- [x] Tạo bảng `settings` (lưu trữ Key-Value cấu hình SMTP, Telegram, PWA và danh sách sự kiện vòng quay `lucky_draw_events`).
- [x] Tạo bảng `notifications`, `hot_searches`, `client_errors`.
- [x] Viết PostgreSQL Function và Trigger để tự động đồng bộ user khi có tài khoản mới đăng ký.
- [x] Thiết lập chỉ mục (Indexes) tối ưu hóa hiệu suất truy vấn (đặc biệt cho slug phim và views/clicks).
- [x] Kích hoạt RLS (Row Level Security) và định nghĩa chính sách bảo mật cho từng bảng.

---

## Phase 3: Authentication (95% - Mock Mode, SMTP Forgot Password & Turnstile Integrated)
- [x] Xây dựng modal Auth thống nhất (Đăng ký/Đăng nhập) dạng 1 cột căn giữa theo cobephim.org.
- [x] Tích hợp thực tế Cloudflare Turnstile Captcha vào Form Đăng ký/Đăng nhập/Quên mật khẩu.
- [x] Triển khai API verify Turnstile Token ở Server-side (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`).
- [x] Tích hợp Google One-Tap & Google Client Login (Token Client) phía người dùng.
- [x] Triển khai verify Google OAuth Token (`/api/auth/google-login`) và lưu mock session.
- [x] Phát triển cơ chế OAuth callback popup (`/api/auth/txa-callback.ts`) hỗ trợ Zalo & X (Twitter) PKCE.
- [x] Thiết lập hệ thống chọn địa chỉ Tỉnh/Huyện/Xã cho thành viên mới qua global modal.
- [x] Xây dựng chức năng Quên mật khẩu chỉ hoạt động/bật khi admin cấu hình xong SMTP.
- [ ] Cài đặt và cấu hình Supabase Auth SDK (Deferred - Kích hoạt ở phase sau theo yêu cầu).

---

## Phase 4: Movie System (100%)
- [x] Tạo cấu trúc types cho phim và nghệ sĩ (`src/types/movie.ts`, `src/types/actor.ts`).
- [x] Triển khai các dynamic routes trong `src/pages/`:
  - [x] Trang chủ (`index.astro`): Slider phim hot, danh mục phim mới, phim bộ, phim lẻ, lịch chiếu hôm nay.
  - [x] Chi tiết phim (`phim/[slug].astro`): Banner, tóm tắt, thông diễn/diễn viên, nút xem phim, danh sách tập phim.
  - [x] Xem phim (`xem/[slug].astro`): Trình phát video, danh sách tập, server chọn, phim liên quan.
  - [x] Nghệ sĩ (`nghe-si/[slug].astro`): Bio nghệ sĩ, danh sách phim nghệ sĩ tham gia.
  - [x] Thể loại (`the-loai/[slug].astro`): Danh sách phim theo thể loại, hỗ trợ lọc/phân trang.
  - [x] Quốc gia (`quoc-gia/[slug].astro`): Danh sách phim theo quốc gia.
  - [x] Lịch chiếu (`lich-chieu.astro`): Giao diện lịch phát sóng phim theo từng thứ trong tuần.
- [x] Tích hợp OpenGraph tags và JSON-LD Structured Data động theo từng trang phim.

---

## Phase 5: Player & Watch History (100%)
- [x] Cài đặt thư viện `artplayer` bằng CLI.
- [x] Tạo component `src/components/player/ArtPlayer.tsx` tích hợp React 19.
- [x] Cấu hình watermark "WebFilm - https://webfilm.dongmephim.online" cố định và hiển thị overlay chống ẩn.
- [x] Tích hợp API tự động gửi lịch sử xem phim:
  - [x] Lắng nghe sự kiện `timeupdate` của ArtPlayer.
  - [x] Lưu vị trí hiện tại (`currentTime`) của tập phim vào localStorage hoặc gọi Service API gửi lên DB.
- [x] Tạo logic resume playback: khi mở lại phim, tự động hiển thị popup gợi ý tua đến thời điểm xem gần nhất.

---

## Phase 6: PWA (100%)
- [x] Tạo file `public/manifest.json` chứa thông tin ứng dụng PWA.
- [x] Tạo file Service Worker `public/sw.js` để cache shell và xử lý offline mode.
- [x] Viết script đăng ký Service Worker trong `MainLayout.astro`.
- [x] Thiết kế banner / nút mời gọi cài đặt ứng dụng trên thiết bị di động.

---

## Phase 7: Test Data & Validation (100%)
- [x] Triển khai `MockMovieProvider` sử dụng cấu trúc dữ liệu mô phỏng theo API thực tế của `phimapi.com` (gồm cấu trúc trả về `movie` và `episodes` động).
- [x] Tạo file dữ liệu mock tĩnh mô phỏng chính xác bộ phim "Cây cam ở nhà cậu ấy nhưng quả cam luôn rơi sang nhà tôi" (1 phim lẻ, 1 phim bộ gồm nhiều tập/nhiều link m3u8 để test player).
- [x] Kiểm tra tích hợp toàn diện giao diện, routing động và luồng hoạt động (gồm cả việc lưu watch history cho các tập) mà không cần kết nối Supabase thật.
- [x] Tinh chỉnh chất lượng, hiệu năng tối ưu điểm số Lighthouse.

---

## Phase 8: Nâng Cấp UI/UX, Sửa Lỗi & Sẵn Sàng Cloudflare Pages (Hoàn thành 100%)
- [x] Thiết kế Hero Carousel với nút điều hướng Trái/Phải và thanh indicator thumbnail động. Tự động ẩn nút ở biên và reset auto-slide 7s khi click.
- [x] Sửa lỗi trống các grid phim trên trang chủ ("Khum có film nào") nhờ cơ chế Hydration dữ liệu Hybrid (SSR Seed Data + Client-side crawled movies).
- [x] Giải quyết dứt điểm lỗi Splash Screen xoay vô tận khi nhấn nút Quay lại (Back/Forward) bằng việc lắng nghe sự kiện `astro:page-load` thay cho `DOMContentLoaded` của Astro View Transitions.
- [x] Khắc phục lỗi lặp chữ "Tập Tập" trên bảng điều khiển Admin Dashboard và chuẩn hóa hiển thị trạng thái "Film Full" cho phim lẻ.
- [x] Đồng bộ các tài liệu và cấu hình dự án để deploy lên Cloudflare Pages/Workers thành công.
