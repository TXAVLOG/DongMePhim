# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Khán giả yêu thích xem phim trực tuyến (phim lẻ, phim bộ, anime, điện ảnh chiếu rạp) tại Việt Nam trên thiết bị Desktop, Tablet và Mobile.

## Product Purpose
Cung cấp nền tảng xem phim trực tuyến tốc độ cao, chất lượng hình ảnh sắc nét từ Full HD đến 4K, giao diện hiện đại phong cách điện ảnh cao cấp (cinematic streaming), đồng bộ tiến trình xem và tương tác cộng đồng.

## Positioning
Nền tảng streaming phim mượt mà, tối ưu trải nghiệm rạp chiếu phim tại gia với giao diện tối (Dark Mode) chuẩn Netflix/Disney+, tải trang cực nhanh trên Cloudflare SSR + Astro, phát video ổn định, hỗ trợ đa thiết bị.

## Operating Context
Người dùng truy cập qua trình duyệt Web (Chrome, Safari, Edge trên PC/Mac/iOS/Android) hoặc PWA. Trải nghiệm xem phim ban đêm hoặc giải trí rảnh rỗi, tìm kiếm phim theo thể loại, quốc gia, diễn viên, thảo luận bình luận phim và xem chung.

## Capabilities and Constraints
- Công nghệ: Astro 7 + React 19 + TailwindCSS v4 + Cloudflare Workers SSR.
- Video Player: ArtPlayer v5 + HLS streaming.
- Database & Auth: Supabase (Auth, RLS, Realtime comments, ratings).
- Dark Mode mặc định toàn hệ thống.
- Yêu cầu responsive mượt mà từ màn hình di động nhỏ (360px) đến desktop rộng (1440px+).

## Brand Commitments
- Tên nền tảng: **Động Mê Phim** / **DongMePhim** (Sử dụng dữ liệu động `{settings.general.site_name}`, tuyệt đối không hardcode thương hiệu của web khác).
- Tông màu chủ đạo: Neon Purple / Violet (`#7c3aed`, `#d2bbff`), Cyan / Sky (`#00e3fd`, `#38bdf8`), Warm Gold/Amber (`#fecf59`, `#f59e0b`), nền tối sâu điện ảnh (`#0A0A0B`, `#141416`, `#0f111a`).
- Phong cách UI: Giao diện kính mờ (glassmorphism), viền mỏng tinh tế, hiệu ứng chuyển động mượt mà (micro-interactions), không giật lag.

## Product Principles
1. **Trải nghiệm điện ảnh đỉnh cao (Cinematic Immersion)**: Nền tối sâu, poster nổi bật, visual hierarchy rõ ràng giúp người xem tập trung trọn vẹn vào phim.
2. **Mượt mà & Tối ưu hiệu năng (Silky Smooth Performance)**: Tận dụng GPU CSS transitions, will-change hợp lý, zero layout shift, cuộn êm ái trên cả touch và chuột.
3. **Thích ứng hoàn hảo (Impeccable Responsiveness)**: Mọi thành phần (Header/Nav, Hero Banner, Topic Cards, Bento Top Bình Luận, 4 cột xếp hạng, Sliders phim) đều tự động co giãn và hiển thị tối ưu trên 360px, 480px, 768px, 1024px, 1280px+.
4. **Tương tác trực quan & Sang trọng (Refined Micro-interactions)**: Card hover hiệu ứng nâng nhẹ, glow gradient tinh tế, pill badges đồng bộ, phản hồi cảm ứng mượt mà.
