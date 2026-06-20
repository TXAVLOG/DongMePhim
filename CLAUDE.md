# CLAUDE - Technical Memory & Guidelines

Tài liệu này lưu giữ toàn bộ trí nhớ kỹ thuật, quy chuẩn mã nguồn và các quyết định kiến trúc của dự án **WebFilm**.

---

## 🛠️ Technology Stack

* **Frontend Framework**: Astro 6.x (SSR Mode trên Cloudflare)
* **Interactive Components**: React 19 (dành cho client-side logic phức tạp như Player, Auth, User Settings)
* **Styling**: TailwindCSS v4
* **Language**: TypeScript
* **Database & Auth**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
* **Hosting Platform**: Cloudflare Workers & Cloudflare Pages/Assets
* **Video Player**: ArtPlayer v5+ (HTML5 Player)

---

## 📁 Folder Structure Conventions

Cấu trúc thư mục bắt buộc của dự án như sau:

```
src/
├── assets/             # Tài nguyên tĩnh (images, icons, logos...)
├── components/         # UI Components
│   ├── actor/          # Components liên quan đến nghệ sĩ/diễn viên
│   ├── movie/          # Components liên quan đến phim (cards, lists...)
│   ├── player/         # Video player component (ArtPlayer integration)
│   └── ui/             # Core UI components dùng chung (buttons, inputs...)
├── layouts/            # Layouts chính của trang
│   ├── MainLayout.astro   # Layout chung cho trang chủ, chi tiết, danh sách
│   └── WatchLayout.astro  # Layout tối ưu cho giao diện xem phim (Player focus)
├── lib/                # Thư viện dùng chung
│   ├── api.ts          # Cấu hình API và Router Service
│   └── supabase.ts     # Supabase Client SDK configuration
├── pages/              # Trang / Routing của Astro
│   ├── index.astro        # Trang chủ
│   ├── phim/              # Chi tiết phim (`/phim/[slug]`)
│   ├── xem/               # Xem phim (`/xem/[slug]`)
│   ├── nghe-si/           # Nghệ sĩ (`/nghe-si/[slug]`)
│   ├── the-loai/          # Thể loại (`/the-loai/[slug]`)
│   ├── quoc-gia/          # Quốc gia (`/quoc-gia/[slug]`)
│   └── lich-chieu/        # Lịch chiếu phim (`/lich-chieu`)
├── services/           # Service Layer cho Data Abstraction (MovieService, ActorService...)
├── styles/             # Stylesheet toàn cục (index.css)
└── types/              # Định nghĩa Typescript
    ├── actor.ts           # Types liên quan đến nghệ sĩ
    └── movie.ts           # Types liên quan đến phim, tập phim, server phát
```

---

## ✍️ Coding Style & Guidelines

### TypeScript
- Luôn khai báo kiểu dữ liệu rõ ràng, tránh sử dụng `any`.
- Sử dụng interface cho các đối tượng phức tạp và type cho các union/intersection types.
- Strict null checks được kích hoạt trong `tsconfig.json`.

### Astro Components
- Sử dụng frontmatter (`---`) để xử lý các dữ liệu server-side và imports.
- Chỉ client-side scripts khi thực sự cần thiết (sử dụng thuộc tính `is:inline` hoặc thẻ `<script>` chuẩn của Astro). **Lưu ý quan trọng**: Do dự án sử dụng Astro View Transitions (`<ClientRouter />`), tất cả client-side script tương tác với DOM phải lắng nghe sự kiện `'astro:page-load'` thay vì `'DOMContentLoaded'` để tránh lỗi treo/đơ loader khi nhấn nút back/forward.
- Layout và page templates phải tối ưu thẻ meta SEO thông qua props truyền vào.

### React Components & Authentication State
- Sử dụng React 19 cho các component cần tương tác động (như Player, Auth forms).
- Đảm bảo các component React được import và render trong Astro dưới dạng Astro Island (ví dụ: `<Player client:load />` hoặc `<AuthForm client:load />`).
- **Cơ chế cập nhật trạng thái Auth tự động (Auto Update State)**: Lắng nghe sự kiện `supabase.auth.onAuthStateChange` ở Client-side. Khi trạng thái thay đổi (`SIGNED_IN`, `SIGNED_OUT`), client sẽ tự động đồng bộ session sang Cookie thông qua API Route `/api/auth/session` và trigger reload để cập nhật trạng thái SSR trên Server.

### TailwindCSS v4 & Custom Global Utility Classes
- Sử dụng các class tiện ích của TailwindCSS v4 để xây dựng giao diện.
- Triết lý thiết kế: **Dark Theme mặc định**, **Mobile First** (thiết kế cho màn hình nhỏ nhất rồi scale up bằng các breakpoint `md:`, `lg:`, `xl:`).
- Dự án bắt buộc định nghĩa và sử dụng bộ class CSS đặc trưng trong `src/styles/index.css` cho toàn web:
  * **`txaformat`**: Định dạng hiển thị nội dung văn bản động (ví dụ: các đoạn mô tả HTML cào từ API).
  * **`txatooltip`**: Trình bày thông tin gợi ý khi hover vào phần tử (ví dụ: thông tin chi tiết phim nhanh).
  * **`txamodal`**: Giao diện và hiệu ứng mở/đóng các hộp thoại Modal overlay.
  * **`txatoast`**: Hệ thống hiển thị thông báo nhanh nổi lên màn hình (Toasts).

---

## 🛠️ CLI & Tooling Conventions

* **Supabase (Database & Auth)**:
  - Sử dụng **Supabase MCP** (`execute_sql`, `list_tables`, `generate_typescript_types`...) để thực thi các lệnh SQL, quản lý cấu trúc bảng, và sinh kiểu dữ liệu TypeScript trực tiếp. Tránh gọi các CLI ngoài nếu mcp tool hỗ trợ.
* **Cloudflare (Workers & Assets Deployment)**:
  - Sử dụng **Wrangler CLI** thông qua các lệnh terminal để chạy môi trường phát triển cục bộ (`npm run dev`), build dự án (`npm run build`), và triển khai ứng dụng (`npm run deploy`).


## 🏛️ Architectural Decisions

### 1. Data Abstraction Layer (Bắt buộc)
Không cho phép UI Component tương tác trực tiếp với Database/API. Tất cả các truy vấn dữ liệu phải đi qua kiến trúc 4 lớp:
```
UI -> Service -> Provider Interface -> Data Source (Mock/Supabase/External)
```
Quyết định này đảm bảo chúng ta có thể chuyển đổi nguồn dữ liệu từ Mock sang Supabase thật hoặc bất kỳ bên thứ ba nào mà không cần sửa một dòng code nào trong UI.

### 2. State & Auth Management
- Supabase Auth được sử dụng để quản lý phiên đăng nhập của người dùng.
- Cloudflare Workers đóng vai trò là SSR server, do đó session token của Supabase sẽ được truyền qua Cookie để server-side rendering có thể nhận diện trạng thái xác thực của người dùng ngay lập tức, ngăn ngừa hiện tượng giật lag giao diện (hydration mismatch).

### 3. Video Player
- Sử dụng duy nhất **ArtPlayer** và tích hợp watermark tĩnh/động để tăng độ nhận diện thương hiệu của WebFilm.
- Sự kiện phát video của ArtPlayer sẽ được lắng nghe để gửi thời gian phát hiện tại về Service định kỳ (throttle 5-10 giây) để lưu trữ lịch sử xem của người dùng.

---

## 📈 Trạng thái các Phase

- **Đang thực hiện**: Phase 2 - Database Design & Migrations
- **Tiếp theo**: Phase 6 - Progressive Web App (PWA)
