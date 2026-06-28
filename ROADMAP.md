# ROADMAP - WebFilm Project

Tài liệu này theo dõi lộ trình phát triển và tiến độ thực hiện dự án **WebFilm** theo các phase.

---

## 📊 Tiến độ tổng thể

| Phase | Tên Giai Đoạn | Trạng Thái | Tiến Độ | Dependencies |
|---|---|---|---|---|
| **Phase 0** | Project Governance & Plan | ✅ Hoàn thành | 100% | Không |
| **Phase 1** | Frontend Foundation & Theme | ✅ Hoàn thành | 100% | Phase 0 |
| **Phase 2** | Database Design & Migrations | ✅ Hoàn thành | 100% | Phase 0 |
| **Phase 3** | Authentication System | ✅ Hoàn thành | 100% (Mock & Turnstile & SMTP) | Phase 1, Phase 2 |
| **Phase 4** | Movie System & Routing | ✅ Hoàn thành | 100% | Phase 1, Phase 2, Phase 7 |
| **Phase 5** | Player & Watch History | ✅ Hoàn thành | 100% | Phase 1, Phase 3, Phase 4 |
| **Phase 6** | Progressive Web App (PWA) | 🔄 Đang thực hiện | 50% | Phase 1 |
| **Phase 7** | Mock Data & Abstraction | ✅ Hoàn thành | 100% | Phase 0 |
| **Phase 8** | UI/UX, Bug Fixes & Cloudflare Prep | ✅ Hoàn thành | 100% | Phase 1, 3, 4, 5, 7 |

---

## 🎯 Chi tiết các Phase & Tiêu chí hoàn thành (Milestones)

### Phase 0: Project Governance (Quản trị dự án)
* **Mục tiêu**: Thiết lập cấu trúc dự án, tài liệu thiết kế, quy chuẩn mã nguồn và chiến lược trừu tượng hóa dữ liệu trước khi viết code.
* **Tài liệu cần tạo**:
  - `ROADMAP.md`: Lộ trình phát triển chi tiết.
  - `CLAUDE.md`: Trí nhớ kỹ thuật, convention và coding style.
  - `ARCHITECTURE.md`: Kiến trúc hệ thống và luồng xử lý dữ liệu.
  - `DATABASE.md`: Thiết kế database, ERD và chiến lược bảo mật RLS.
  - `API_STRATEGY.md`: Kiến trúc API Provider Layer để trừu tượng hóa nguồn dữ liệu.
  - `TODO.md`: Danh sách công việc cần làm chi tiết.
* **Tiêu chí hoàn thành**: Tất cả các tài liệu được viết chi tiết, thống nhất với Tech Lead và được phê duyệt.
* **Tỷ lệ hoàn thành**: 100% (đã hoàn thiện và được người dùng xác nhận).

---

### Phase 1: Frontend Foundation (Nền tảng giao diện)
* **Mục tiêu**: Tích hợp TailwindCSS mới nhất (v4), xây dựng các layout responsive, giao diện tối mặc định (Dark Mode), bộ UI component và tối ưu hóa SEO.
* **Danh sách công việc**:
  - Tích hợp TailwindCSS mới nhất.
  - Tạo `MainLayout.astro` và `WatchLayout.astro`.
  - Thiết kế Header, Navbar, Footer responsive với triết lý Mobile First.
  - Xây dựng bộ UI components tái sử dụng (Button, Card, Input, Modal, v.v.) trong thư mục `src/components/ui`.
  - Tích hợp SEO metadata động, cấu trúc JSON-LD và OpenGraph.
* **Tiêu chí hoàn thành**: 
  - `npm run build` thành công.
  - Giao diện chạy mượt mà trên Mobile, Tablet và Desktop.
  - Điểm số Lighthouse cho Performance và SEO > 90.
* **Tỷ lệ hoàn thành**: 100%

---

### Phase 2: Database Design (Thiết kế Cơ sở Dữ liệu)
* **Mục tiêu**: Thiết kế schema cho Supabase PostgreSQL bao gồm các bảng, khoá ngoại, chỉ mục (indexes) và chính sách bảo mật Row Level Security (RLS).
* **Danh sách bảng**:
  - `movies`, `actors`, `genres`, `countries`.
  - Bảng trung gian: `movie_actors`, `movie_genres`, `movie_countries`.
  - Người dùng & Tương tác: `users` (mở rộng auth.users), `watch_history`, `watch_lists`, `schedules`.
* **Tiêu chí hoàn thành**:
  - Thiết kế file Migration SQL chuẩn cho Supabase.
  - Thiết lập đầy đủ chính sách RLS cho phép truy cập public đối với phim/diễn viên, và chỉ chủ sở hữu được xem/sửa watch_history/watch_list.
* **Tỷ lệ hoàn thành**: 100% (Đã tạo schema `init.sql` 597 dòng đầy đủ bảng, RLS, triggers & seed data)

---

### Phase 3: Authentication (Hệ thống Xác thực)
* **Mục tiêu**: Tích hợp xác thực, Google One-Tap, OAuth popup PKCE cho Zalo/X, Turnstile Captcha, Quên mật khẩu qua SMTP, và mock session.
* **Danh sách công việc**:
  - Thiết kế modal Auth dạng 1 cột căn giữa giống cobephim.org cho Mobile & Desktop.
  - Tích hợp bảo mật Cloudflare Turnstile Captcha thực tế (giao diện widget + API verify token ở server-side).
  - Tích hợp Google Token Client & Google One-Tap Prompt phía client.
  - Phát triển API `/api/auth/txa-callback.ts` và `/api/auth/google-login.ts` xử lý giải mã JWT/PKCE challenge.
  - Tích hợp bộ chọn địa chỉ 3 cấp (Tỉnh/Huyện/Xã) cho tài khoản mới đăng nhập lần đầu.
  - Đồng bộ logic hiển thị Redirect/Callback URIs trong admin.
  - Xây dựng tính năng Quên mật khẩu phục hồi tài khoản và chỉ bật/hiển thị khi admin đã cấu hình xong SMTP Mail.
* **Tiêu chí hoàn thành**:
  - Giao diện modal đăng nhập/đăng ký/quên mật khẩu căn giữa 1¢, responsive tốt trên Mobile.
  - Đăng nhập Google, Zalo, X (Twitter) giả lập qua popup hoạt động chính xác.
  - Verify Turnstile ở server-side trả về kết quả đúng trước khi cho phép Login/Register/Forgot.
  - Nút "Quên mật khẩu?" ẩn/hiện động và API kiểm tra cấu hình SMTP trước khi gửi mail test.
* **Tỷ lệ hoàn thành**: 100%

---

### Phase 4: Movie System (Hệ thống Phim)
* **Mục tiêu**: Phát triển toàn bộ các trang chức năng hiển thị thông tin phim, danh sách, tìm kiếm, lọc theo thể loại, quốc gia, nghệ sĩ và lịch chiếu.
* **Các trang cần phát triển**:
  - Trang chủ (`/`)
  - Chi tiết phim (`/phim/[slug]`)
  - Xem phim (`/xem/[slug]`)
  - Nghệ sĩ (`/nghe-si/[slug]`)
  - Thể loại (`/the-loai/[slug]`)
  - Quốc gia (`/quoc-gia/[slug]`)
  - Lịch chiếu (`/lich-chieu`)
  - Tìm kiếm (`/tim-kiem`)
* **Tiêu chí hoàn thành**:
  - Dynamic Routing hoạt động chính xác.
  - SEO dynamic metadata hiển thị đúng tiêu đề, mô tả và ảnh OpenGraph cho từng trang.
* **Tỷ lệ hoàn thành**: 100%

---

### Phase 5: Player & Watch History (Trình phát & Lịch sử xem)
* **Mục tiêu**: Tích hợp trình phát video ArtPlayer, hỗ trợ nhiều server/tập phim, watermark thương hiệu và tự động lưu/resume tiến trình xem phim của người dùng.
* **Yêu cầu kỹ thuật**:
  - Tích hợp ArtPlayer làm React component.
  - Hiển thị Watermark động và tĩnh (WebFilm - https://webfilm.dongmephim.online).
  - Tự động bắt sự kiện timeupdate để lưu lịch sử xem phim (`currentTime`, `episode_id`, `movie_id`) qua API Service.
  - Tự động gợi ý resume video từ vị trí cũ khi tải trang xem phim.
* **Tiêu chí hoàn thành**:
  - Player chạy ổn định, chuyển tập và server mượt mà.
  - Tính năng resume playback hoạt động trên cả máy tính và thiết bị di động.
* **Tỷ lệ hoàn thành**: 100%

---

### Phase 6: PWA (Progressive Web App)
* **Mục tiêu**: Chuyển đổi WebFilm thành ứng dụng PWA chạy offline shell, hỗ trợ cài đặt trực tiếp trên Android, iOS và Desktop.
* **Danh sách công việc**:
  - Thiết lập manifest file với đầy đủ icons và thông tin cấu hình.
  - Viết Service Worker để lưu cache các tài nguyên tĩnh quan trọng và trang offline fallback.
  - Xử lý UI mời gọi cài đặt (Install Prompt).
* **Tiêu chí hoàn thành**:
  - Ứng dụng đạt chuẩn PWA trên công cụ kiểm tra Lighthouse.
  - Cài đặt thành công trên môi trường Android và Desktop.
* **Tỷ lệ hoàn thành**: 50% (Đã tạo `sw.js` và đăng ký Service Worker trong `MainLayout.astro`)

---

### Phase 7: Mock Data & Abstraction (Dữ liệu mẫu & Trừu tượng hóa)
* **Mục tiêu**: Xây dựng các Provider để cung cấp dữ liệu giả lập chất lượng cao cho toàn bộ ứng dụng trước khi kết nối trực tiếp với DB thật.
* **Danh sách công việc**:
  - Triển khai `MockMovieProvider`, `MockActorProvider`, `MockScheduleProvider`.
  - Chuẩn bị dữ liệu đầy đủ cho ít nhất 1 phim (nhiều tập, nhiều server), nghệ sĩ, thể loại và lịch chiếu.
* **Tiêu chí hoàn thành**:
  - Hệ thống chạy hoàn chỉnh với dữ liệu mock mà không cần gọi đến API Supabase thật.
* **Tỷ lệ hoàn thành**: 100%

---

### Phase 8: UI/UX, Bug Fixes & Cloudflare Prep (Nâng cấp giao diện, sửa lỗi & Triển khai)
* **Mục tiêu**: Nâng cấp các trải nghiệm tương tác động, khắc phục lỗi trống danh mục phim, sửa lỗi vòng lặp sự kiện splash transitions, chuẩn hoá dữ liệu Admin và chuẩn bị đầy đủ cho Cloudflare Pages deployment.
* **Danh sách công việc**:
  - Tích hợp arrows và dynamic indicators/thumbnails cho Hero Carousel.
  - Xử lý Hydration Hybrid gộp seedMovies tĩnh và crawled movies lưu cục bộ để loại bỏ hoàn toàn lỗi trống phim trên UI.
  - Sửa lỗi loader bị freeze do transition bằng cách chuyển sang lắng nghe `astro:page-load`.
  - Fix lặp chữ "Tập Tập" ở admin dashboard và hiển thị rõ trạng thái phim lẻ/phim bộ.
  - Cập nhật tài liệu kỹ thuật của dự án cho phù hợp với môi trường deployment Cloudflare.
* **Tiêu chí hoàn thành**:
  - Giao diện chạy mượt mà trên client, không lỗi console hay đơ trang khi back/forward.
  - Cập nhật thành công tài liệu và chuẩn bị triển khai lên môi trường Cloudflare.
* **Tỷ lệ hoàn thành**: 100%

---

## 📈 Kế hoạch kiểm soát chất lượng (Quality Gates)

Trước khi chuyển giao giữa các Phase, bắt buộc phải vượt qua:
1. `npm run dev` không có lỗi runtime/console.
2. `npm run build` không có lỗi biên dịch.
3. Test build deploy trên Cloudflare Preview Environment chạy ổn định.
4. Trình duyệt không có lỗi console đỏ liên quan đến logic nghiệp vụ của phase đó.
