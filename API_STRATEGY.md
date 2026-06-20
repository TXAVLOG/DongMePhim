# API & DATA PROVIDER STRATEGY - WebFilm

Tài liệu này trình bày thiết kế kiến trúc của **Data Abstraction Layer (Lớp trừu tượng dữ liệu)** cho dự án WebFilm, đảm bảo hệ thống có thể chuyển đổi nguồn dữ liệu linh hoạt mà không ảnh hưởng tới UI.

---

## 🏛️ Sơ đồ Luồng Dữ liệu (Data Flow Diagram)

```
+------------------------------------+
|         UI / Page Layer            |
| (Astro Pages & React Components)   |
+------------------------------------+
                  |
                  v  [Giao tiếp qua Service API]
+------------------------------------+
|          Service Layer             |
|  (MovieService, ActorService...)   |
+------------------------------------+
                  |
                  v  [Gọi thông qua interface thống nhất]
+------------------------------------+
|       Provider Layer (Interface)   |
|   (IMovieProvider, IActorProvider) |
+------------------------------------+
                  |
        +---------+---------+
        |                   |
        v                   v
+---------------+   +-------------------+
| Mock Provider |   | Supabase Provider |   ... (External Provider sau này)
+---------------+   +-------------------+
        |                   |
        v                   v
[Local JSON / JS]   [Supabase SDK / DB]
```

---

## 1. Thành phần của Data Abstraction Layer

Kiến trúc bao gồm 4 phần chính:

### A. Data Types & Interfaces (Định nghĩa Kiểu và Giao diện)
Định nghĩa các interface bắt buộc mà mọi Provider phải triển khai.
Ví dụ trong `src/types/movie.ts`:
```typescript
export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  releaseYear: number;
  durationMinutes: string; // "45 phút/tập"
  type: 'movie' | 'series';
  status: 'ongoing' | 'completed';
  episodeCurrent: string;
  episodeTotal: string;
  quality: string;
  lang: string;
}

// Kiểu dữ liệu cho tập phim được lấy động khi xem phim
export interface Episode {
  name: string;      // "Tập 01"
  slug: string;      // "tap-01"
  filename: string;
  linkEmbed: string; // Link nhúng iframe
  linkM3u8: string;  // Link stream m3u8 cho ArtPlayer
}

export interface MovieDetail extends Movie {
  episodes: {
    serverName: string;
    serverData: Episode[];
  }[];
}

export interface IMovieProvider {
  getMovies(params?: any): Promise<Movie[]>;
  getMovieBySlug(slug: string): Promise<MovieDetail | null>;
  getRelatedMovies(movieId: string): Promise<Movie[]>;
  searchMovies(query: string): Promise<Movie[]>;
}
```

### B. Providers (Người cung cấp dữ liệu)
Là nơi triển khai (implement) cụ thể cách lấy dữ liệu từ nguồn.
* **`MockMovieProvider`**: Đọc từ dữ liệu giả lập được khai báo sẵn (JS/JSON tĩnh) bao gồm cả danh sách tập giả lập.
* **`SupabaseMovieProvider`**: 
  - Khi lấy danh sách phim (trang chủ, thể loại...): Chỉ truy vấn từ DB Supabase để hiển thị metadata tốc độ cao.
  - Khi lấy chi tiết phim để xem (`getMovieBySlug`): Truy vấn metadata từ DB Supabase, đồng thời thực hiện **Realtime Fetch** đến API của phimapi.com (`https://phimapi.com/phim/{slug}`) để lấy danh sách tập phim và các link phát (m3u8, embed) trực tiếp. Sau đó gộp dữ liệu lại trả về cho UI.
* **`ExternalMovieProvider`** (Mở rộng trong tương lai): Kết nối với các API nguồn phim bên ngoài khác.

### C. Services (Lớp nghiệp vụ)
Đóng vai trò là điểm tiếp xúc duy nhất của UI để lấy dữ liệu. Lớp này nắm giữ logic chọn Provider nào dựa trên cấu hình hệ thống (Environment Variables).
Ví dụ trong `src/services/MovieService.ts`:
```typescript
import { MockMovieProvider } from './providers/MockMovieProvider';
import { SupabaseMovieProvider } from './providers/SupabaseMovieProvider';
import type { IMovieProvider } from '../types/movie';

// Lựa chọn provider dựa trên biến môi trường ENV
const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'mock';

let movieProvider: IMovieProvider;

if (providerType === 'supabase') {
  movieProvider = new SupabaseMovieProvider();
} else {
  movieProvider = new MockMovieProvider();
}

export const MovieService = {
  getMovies: (params) => movieProvider.getMovies(params),
  getMovieBySlug: (slug) => movieProvider.getMovieBySlug(slug),
  getRelatedMovies: (id) => movieProvider.getRelatedMovies(id),
  searchMovies: (query) => movieProvider.searchMovies(query)
};
```

### D. UI Components (Lớp giao diện)
Chỉ import và gọi các hàm từ `MovieService`.
*Tuyệt đối không import trực tiếp Supabase SDK hoặc file JSON giả lập vào các file `.astro` hay React component.*

---

## 📅 Chiến lược cào dữ liệu và Lịch chiếu (Crawling & Schedule Strategy)

### 1. Đồng bộ Metadata phim
* Bộ cào (Crawler Service) sẽ chạy định kỳ hoặc thủ công: gọi API danh sách phim mới của phimapi.com hoặc fetch phim cụ thể qua slug, sau đó bóc tách thông tin metadata (bỏ qua thông tin tập phim) để lưu/cập nhật vào bảng `movies`, `actors`, `genres`, `countries`.
* Vì không lưu thông tin link tập phim nên dữ liệu trong DB cực kỳ gọn nhẹ và dễ dàng quản lý.

### 2. Thiết lập Lịch chiếu (Schedules)
* Khi phim đã được lưu metadata trong DB của chúng ta (có `movie_id`), Admin có thể thiết lập lịch chiếu trong bảng `schedules` (ví dụ: Phim A chiếu vào 20:00 Thứ Năm hàng tuần).
* Trang `/lich-chieu` sẽ hiển thị danh sách các phim sẽ chiếu dựa trên bảng `schedules` phối hợp với bảng `movies` (để lấy poster, tên phim).
* Khi đến giờ chiếu, hệ thống không cần cập nhật link thủ công. Người dùng click vào xem phim sẽ tự động gọi API phimapi.com để lấy tập phim mới nhất mà nguồn phim vừa phát hành.


### Giai đoạn 1: Mock Data & Client-Side Crawled Hydration (Hiện tại)
* Cấu hình: `PUBLIC_DATA_PROVIDER=mock`
* **SSR (Server-Side)**: Sử dụng danh sách dữ liệu tĩnh `seedMovies` tích hợp sẵn trong mã nguồn để render khung HTML chuẩn SEO.
* **Client-Side Storage**: Toàn bộ dữ liệu phim được người dùng cào qua crawler sẽ được lưu trữ trực tiếp ở `localStorage` (dưới key `txa_crawled_movies`).
* **Hybrid Data Provider (LocalMovieProvider)**:
  - Khi ứng dụng chạy SSR trên Server: Trả về danh sách `seedMovies` tĩnh.
  - Khi ứng dụng chạy trên Client: Hàm `getMovies` tự động gộp (merge) danh sách phim mẫu và phim cào ở `localStorage`.
  - Client-side script sẽ cập nhật trực tiếp nội dung các grid danh mục phim ("Phim Trung Quốc mới", "Phim Hàn Quốc mới", "Top 10 Phim Bộ Hôm Nay") để hiển thị những phim vừa cào mà không làm trống giao diện.
* Toàn bộ UI, routing, trình phát video và logic watch history hoạt động bình thường với dữ liệu giả lập và dữ liệu cào kết hợp.

### Giai đoạn 2: Supabase Real Database (Phase 2 & 3)
* Cấu hình: `PUBLIC_DATA_PROVIDER=supabase`
* Tạo bảng, migration trên Supabase.
* Viết code cho `SupabaseMovieProvider`, `SupabaseActorProvider` để gọi dữ liệu thật.
* **Kết quả**: Giao diện UI hoàn toàn giữ nguyên, dữ liệu tự động đồng bộ sang database thật.

### Giai đoạn 3: Tích hợp nhiều External Providers (Tương lai)
* Cấu hình: `PUBLIC_DATA_PROVIDER=hybrid`
* `HybridMovieProvider` sẽ tự động lấy phim từ bên thứ ba (qua API Crawler hoặc đối tác) và kết hợp với dữ liệu cấu hình trong Supabase.
* Hệ thống hoạt động tự động không làm gián đoạn trải nghiệm người dùng.

---

## 📱 Chiến lược phát triển API Adapter cho Mobile App (TPhimX App)

Để ứng dụng Flutter (TPhimX Mobile App) hoạt động bình thường mà không cần sửa đổi mã nguồn di động, Cloudflare Workers sẽ đóng vai trò là một **API Adapter (Lớp chuyển đổi API)** cung cấp các API endpoints đúng chuẩn 100% theo đặc tả `tphimx_api_specification.md`.

### 1. Sơ đồ hoạt động của API Adapter trên Cloudflare Workers

```
[ TPhimX Mobile App ]
        |
        +-- (Request: GET /api/app/movie/one-piece)
        v
[ Cloudflare Workers ]
        |
        +---> 1. Query metadata phim trong DB Supabase (Lấy id_seq, name, slug...)
        +---> 2. Fetch danh sách tập phim realtime từ phimapi.com qua API
        +---> 3. Gộp thông tin và MAP dữ liệu sang định dạng JSON Mobile yêu cầu:
        |        - Đổi trường: id -> id_seq (bigint)
        |        - Map server_data -> link_m3u8, link_embed, subtitles...
        v
[ TPhimX Mobile App ] (Nhận đúng 100% JSON Response mong đợi)
```

### 2. Các điểm chuyển đổi dữ liệu quan trọng

#### A. Giải quyết vấn đề ID dạng số (UUID vs BIGINT)
* Trình duyệt sử dụng UUID (`movies.id`) cho bảo mật, nhưng app di động cũ yêu cầu ID dạng số tự động tăng (`movies.movie_id_seq`).
* **Giải pháp**: Tầng API Adapter của Workers khi trả dữ liệu cho Mobile App sẽ lấy giá trị `movie_id_seq` trong DB Supabase map đè vào trường `"id"` trong JSON.

#### B. Trình phát video trên Mobile (Server/Episode Mapping)
* Bảng `movies` trong DB của chúng ta không lưu link tập phim.
* **Giải pháp**: Khi nhận request `/api/app/movie/{slug}`, Worker sẽ gọi fetch API của PhimApi lấy danh sách tập, chuyển đổi cấu trúc JSON sang dạng `servers` và `server_data` (gồm các trường `link_m3u8`, `link_embed`) đúng theo cấu trúc mobile app yêu cầu rồi trả về.

#### C. Cầu nối xác thực (Supabase Auth Bridge)
* Flutter app gọi endpoint `/api/auth/login` để lấy JWT token.
* **Giải pháp**: Worker Router nhận thông tin đăng nhập, gọi API xác thực của Supabase Auth, lấy JWT token của Supabase trả về cho Mobile App theo định dạng JSON chuẩn. 
* Các API yêu cầu xác thực tiếp theo từ app (như lấy thông tin tài khoản `/api/auth/me`, lịch sử xem phim `/api/app/watch-history`) sẽ gửi kèm JWT token này trong Header `Authorization: Bearer <token>`. Worker chỉ cần giải mã token này để tương tác với Supabase DB.

#### D. Đồng bộ Cấu hình Vòng quay may mắn (Lucky Draw Bridge)
Ứng dụng di động và giao diện Web sử dụng tính năng vòng quay may mắn sẽ tương tác với API của Cloudflare Workers:
* **Đọc cấu hình**: Workers cung cấp API `GET /api/app/lucky-draw` để đọc sự kiện đang chạy từ `settings` có key là `'lucky_draw_events'`.
* **Thực hiện quay thưởng**: 
  - Khi user nhấn quay (`POST /api/app/lucky-draw/spin`), Workers kiểm tra điều kiện tham gia và số lượng giải thưởng tối đa (`maxWinners`).
  - Logic tính toán giải thưởng theo trọng số xác suất (`probability` / `rate`) được chạy hoàn toàn ở phía Workers để chống gian lận (không chạy ở client).
  - Kết quả trúng giải được lưu thẳng vào trường `winners` và cập nhật trừ đi số lượng trong `prizes` của event tương ứng trong bảng `settings`.
  - **Tự động hóa thông báo**: 
    1. **Telegram Notification**: Workers gọi Telegram Bot API gửi thông báo trực tiếp đến chat ID admin (`telegram_channel_id` hoặc `telegram_chat_id` cấu hình trong bảng `settings`) khi có thành viên trúng giải hoặc gửi SĐT nhận thẻ cào.
    2. **Email Notification**: Gọi SMTP Server cấu hình trong `settings` gửi email chúc mừng kèm thông tin giải thưởng đến người dùng.

---

## 📲 Telegram Bot Integration — Thiết kế chi tiết tích hợp Telegram

Telegram Bot đóng vai trò **kênh thông báo trực tiếp tới Admin** và **kênh phát sóng** cho cộng đồng. Toàn bộ logic gọi Telegram Bot API được thực thi từ **Cloudflare Workers** (server-side only), không bao giờ expose Bot Token ra phía client.

### 1. Sơ đồ luồng tổng quan

```
[ Sự kiện xảy ra trên Website / App ]
         |
         v
[ Cloudflare Worker — Telegram Service ]
         |
         +---> Lấy cấu hình (telegram_bot_token, telegram_chat_id, telegram_channel_id) từ DB settings
         +---> Kiểm tra toggle enable (telegram_notify_report, telegram_notify_user...)
         +---> Build message template (Markdown V2)
         +---> Gọi Telegram Bot API: https://api.telegram.org/bot<TOKEN>/sendMessage
         |
         v
[ Telegram ]
    +---> Chat riêng Admin (telegram_chat_id): OTP, thông báo trúng thưởng, lỗi hệ thống
    +---> Channel công khai (telegram_channel_id): Phim mới, thông báo chung
```

### 2. Telegram Bot API Methods sử dụng

| Method | Mục đích | Khi nào gọi |
|--------|----------|-------------|
| `getMe` | Kiểm tra Bot Token hợp lệ và lấy thông tin bot | Admin nhấn "Kiểm tra & Gửi OTP" trong Settings |
| `sendMessage` | Gửi tin nhắn text (hỗ trợ Markdown V2) | Mọi loại thông báo |
| `sendPhoto` | Gửi ảnh poster phim kèm caption | Thông báo phim mới lên Channel |
| `getUpdates` | Lấy danh sách tin nhắn mới nhất để xác minh OTP | Sau khi gửi OTP, server đọc lại messages |

### 3. Kiểu tin nhắn & Template chi tiết

#### A. OTP Xác minh kết nối Bot (Admin → Chat riêng)
```
🔐 *MÃ XÁC MINH TELEGRAM BOT*
━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Mã OTP: *{otp_code}*
⏰ Hết hạn sau: 5 phút

⚠️ Không chia sẻ mã này cho bất kỳ ai\.
```
- **Trigger**: Admin nhấn "Kiểm tra & Gửi OTP" trong trang Settings.
- **Flow**:
  1. Worker gọi `getMe` kiểm tra token → trả `botInfo` (username, id).
  2. Worker tạo OTP ngẫu nhiên 6 chữ số, lưu tạm vào KV/bộ nhớ (TTL 5 phút).
  3. Worker gọi `sendMessage` gửi OTP tới `telegram_chat_id`.
  4. Admin nhập OTP vào modal trên web.
  5. Worker nhận OTP, so sánh → nếu khớp thì lưu `telegram_verified = true` và `telegram_bot_username`.

#### B. Thông báo Thành viên mới đăng ký (`telegram_notify_user`)
```
👤 *THÀNH VIÊN MỚI ĐĂNG KÝ*
━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: {email}
👤 Tên: {name}
🌐 Phương thức: {provider} (Google / Facebook / Zalo / ...)
🕐 Thời gian: {datetime}
📊 Tổng thành viên: {total_users}
```
- **Gửi tới**: `telegram_chat_id` (Admin riêng)

#### C. Thông báo Báo lỗi phim (`telegram_notify_report`)
```
⚠️ *BÁO CÁO LỖI TỪ THÀNH VIÊN*
━━━━━━━━━━━━━━━━━━━━━━━━
🎬 Phim: [{movie_name}]({movie_url})
📺 Tập: {episode_name}
🔗 Server: {server_name}
❌ Loại lỗi: {error_type}
📝 Mô tả: {description}
👤 Người báo: {reporter_name} ({reporter_email})
🕐 Thời gian: {datetime}
```
- **Gửi tới**: `telegram_chat_id` (Admin riêng)

#### D. Thông báo Trúng thưởng Vòng quay (`telegram_notify_luckydraw`)
```
🎉 *TRÚNG THƯỞNG VÒNG QUAY MAY MẮN\!*
━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Sự kiện: {event_name}
🎁 Giải thưởng: *{prize_name}*
👤 Người trúng: {winner_name} ({winner_email})
📱 SĐT nhận quà: {phone_number}
🕐 Thời gian: {datetime}
📊 Tổng giải đã trao: {total_winners}/{max_winners}
```
- **Gửi tới**: `telegram_chat_id` (Admin riêng)

#### E. Thông báo Yêu cầu duyệt Zalo (`telegram_notify_zalo`)
```
📋 *YÊU CẦU DUYỆT ZALO MỚI*
━━━━━━━━━━━━━━━━━━━━━━━━
📱 Số Zalo: {zalo_phone}
👤 Tên Zalo: {zalo_name}
🕐 Thời gian: {datetime}
📊 Tổng chờ duyệt: {pending_count}
```
- **Gửi tới**: `telegram_chat_id` (Admin riêng)

#### F. Phim mới cập nhật → Channel công khai
```
🎬 *PHIM MỚI CẬP NHẬT*

📺 *{movie_name}* ({release_year})
🏷️ {genres}
🎭 {quality} \| {lang}
📝 {short_description}

🔗 Xem ngay: {movie_url}
```
- **Method**: `sendPhoto` (gửi poster_url kèm caption)
- **Gửi tới**: `telegram_channel_id` (Channel công khai)
- **Trigger**: Khi Crawler thêm phim mới thành công

### 4. Service implementation (Cloudflare Worker)

```typescript
// workers/lib/telegramService.ts

interface TelegramConfig {
  botToken: string;
  chatId: string;       // Admin chat ID
  channelId?: string;   // Public channel ID  
}

type ParseMode = 'MarkdownV2' | 'HTML';

class TelegramService {
  private baseUrl: string;

  constructor(private config: TelegramConfig) {
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /** Kiểm tra bot token hợp lệ */
  async getMe(): Promise<{ ok: boolean; result?: { username: string; id: number } }> {
    const res = await fetch(`${this.baseUrl}/getMe`);
    return res.json();
  }

  /** Gửi tin nhắn text */
  async sendMessage(chatId: string, text: string, parseMode: ParseMode = 'MarkdownV2') {
    return fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });
  }

  /** Gửi ảnh kèm caption */
  async sendPhoto(chatId: string, photoUrl: string, caption: string, parseMode: ParseMode = 'MarkdownV2') {
    return fetch(`${this.baseUrl}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: parseMode,
      }),
    });
  }

  /** Gửi thông báo tới Admin (chat riêng) */
  async notifyAdmin(text: string) {
    return this.sendMessage(this.config.chatId, text);
  }

  /** Phát thông báo ra Channel công khai */
  async broadcastChannel(text: string) {
    if (!this.config.channelId) return;
    return this.sendMessage(this.config.channelId, text);
  }

  /** Phát ảnh poster phim mới ra Channel */
  async broadcastNewMovie(posterUrl: string, caption: string) {
    if (!this.config.channelId) return;
    return this.sendPhoto(this.config.channelId, posterUrl, caption);
  }
}
```

### 5. Escape Markdown V2

Telegram MarkdownV2 yêu cầu escape các ký tự đặc biệt: `_ * [ ] ( ) ~ > # + - = | { } . !`

```typescript
function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
```

> [!WARNING]
> **Không dùng Webhook**: Do Cloudflare Workers chạy serverless (không giữ kết nối lâu dài), chúng ta **không dùng Telegram Webhook**. Thay vào đó, Worker chủ động gọi `sendMessage`/`sendPhoto` khi có sự kiện (Push model, không phải Webhook receive model).

---

## 📧 SMTP Email Integration — Tích hợp Gửi Email tự động

Hệ thống sử dụng SMTP để gửi email giao dịch (transactional emails) như xác minh tài khoản, khôi phục mật khẩu, và thông báo trúng thưởng. Cloudflare Workers sẽ kết nối SMTP server (ví dụ Gmail, SendGrid, Amazon SES) thông qua cấu hình trong bảng `settings`.

### 1. Cấu hình hệ thống (từ `settings`)
Worker đọc các keys sau từ Supabase DB:
- `smtp_host`: Ví dụ `smtp.gmail.com`
- `smtp_port`: Ví dụ `465` (SSL) hoặc `587` (TLS)
- `smtp_secure`: `"SSL"` hoặc `"TLS"`
- `smtp_user`: Email đăng nhập
- `smtp_pass`: App Password (chỉ đọc server-side)
- `smtp_from_email`: Email người gửi
- `smtp_from_name`: Tên người gửi hiển thị (ví dụ "TPhimX System")

### 2. Các Template Email chính

#### A. Xác minh Email đăng ký (`verify_email`)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Xác minh tài khoản của bạn tại TPHIMX</title>
  <style>
    body { background-color: #0b0c10; color: #ffffff; font-family: 'Outfit', 'Inter', sans-serif; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #12141d; border: 1px solid rgba(124, 58, 237, 0.15); border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); }
    .header { padding: 40px 20px; text-align: center; background: linear-gradient(135deg, #12141d 0%, #1a103c 100%); border-bottom: 1px solid rgba(124, 58, 237, 0.1); }
    .logo { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #ffffff; }
    .logo span { color: #7c3aed; text-shadow: 0 0 15px rgba(124, 58, 237, 0.6); }
    .content { padding: 40px; line-height: 1.6; }
    h1 { font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 20px; text-transform: uppercase; }
    p { color: #9ca3af; font-size: 15px; margin-bottom: 24px; }
    .highlight { color: #7c3aed; font-weight: bold; }
    .warning-box { background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 14px; padding: 20px; margin-top: 25px; }
    .warning-box p { color: #ef4444; font-size: 13px; margin: 0; }
    .footer { padding: 30px; text-align: center; background-color: #0d0f17; border-top: 1px solid rgba(124, 58, 237, 0.05); }
    .footer p { font-size: 11px; color: #4b5563; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">T<span>PHIM</span>X</div></div>
    <div class="content">
      <h1>Xác minh Email Đăng Ký</h1>
      <p>Xin chào <span class="highlight">{{username}}</span>,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <span class="highlight">TPHIMX</span>. Để hoàn tất quy trình kích hoạt và bắt đầu thưởng thức các bộ phim hấp dẫn, vui lòng sử dụng mã OTP dưới đây để xác minh địa chỉ email của bạn:</p>
      <div class="otp-container" style="background-color: rgba(124, 58, 237, 0.1); border: 2px solid rgba(124, 58, 237, 0.3); border-radius: 16px; padding: 25px; margin: 30px 0; text-align: center;">
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #7c3aed; text-shadow: 0 0 20px rgba(124, 58, 237, 0.5);">{{otp_code}}</div>
      </div>
      <div class="warning-box"><p><strong>Lưu ý quan trọng:</strong> Mã OTP này chỉ có hiệu lực trong vòng 10 phút. Hết thời gian này, bạn sẽ phải thực hiện lại quy trình gửi mã xác minh.</p></div>
    </div>
    <div class="footer"><p>&copy; 2026 TPHIMX - All Rights Reserved</p></div>
  </div>
</body>
</html>
```

#### B. Khôi phục mật khẩu (`forgot-password`)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Khôi phục mật khẩu của bạn tại TPHIMX</title>
  <style>
    /* Sử dụng chung CSS với Verify Email, có class btn cho button: */
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 35px; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px; box-shadow: 0 0 25px rgba(124, 58, 237, 0.4); transition: all 0.3s ease; }
    .button-container { text-align: center; margin: 35px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">T<span>PHIM</span>X</div></div>
    <div class="content">
      <h1>Yêu cầu khôi phục mật khẩu</h1>
      <p>Xin chào <span class="highlight">{{username}}</span>,</p>
      <p>Chúng tôi đã nhận được yêu cầu khôi phục lại mật khẩu cho tài khoản của bạn tại <span class="highlight">TPHIMX</span>. Vui lòng nhấp vào liên kết bên dưới để đặt lại mật khẩu mới cho tài khoản:</p>
      <div class="button-container">
        <a href="{{reset_url}}" class="btn" target="_blank">Đặt lại mật khẩu</a>
      </div>
      <p>Nếu nút phía trên không hoạt động, bạn cũng có thể sao chép liên kết này và dán vào thanh địa chỉ của trình duyệt:</p>
      <p style="word-break: break-all; font-size: 13px; color: #6b7280;">{{reset_url}}</p>
      <div class="warning-box"><p><strong>Lưu ý:</strong> Liên kết đặt lại mật khẩu này chỉ có giá trị trong vòng <span style="font-weight: 800;">{{expiry_time}}</span> phút. Nếu bạn không gửi yêu cầu khôi phục này, vui lòng bỏ qua email và mật khẩu của bạn sẽ được giữ an toàn.</p></div>
    </div>
    <div class="footer"><p>&copy; 2026 TPHIMX - All Rights Reserved</p></div>
  </div>
</body>
</html>
```

#### C. Chúc mừng trúng thưởng Vòng Quay (`lucky_draw_winner`)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chúc mừng bạn đã trúng thưởng tại {{site_name}}</title>
  <style>
    /* CSS tương tự nhưng sử dụng tone màu tím sáng #a78bfa */
    .prize-box { background: rgba(167, 139, 250, 0.08); border: 2px dashed #a78bfa; border-radius: 16px; padding: 24px; text-align: center; margin: 30px 0; box-shadow: inset 0 0 20px rgba(167, 139, 250, 0.05); }
    .prize-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.15em; margin-bottom: 8px; }
    .prize-name { font-size: 26px; font-weight: 950; color: #ffffff; text-shadow: 0 0 10px rgba(167, 139, 250, 0.4); margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">{{site_name}}</div></div>
    <div class="content">
      <h1>🎉 CHÚC MỪNG BẠN ĐÃ TRÚNG GIẢI!</h1>
      <div class="subtitle">Sự kiện: {{event_name}}</div>
      <p>Xin chào <span class="highlight">{{username}}</span>,</p>
      <p>Chúc mừng bạn đã là một trong những thành viên may mắn nhất tại <span class="highlight">{{site_name}}</span>! Trong chương trình quay số Vòng Xoay May Mắn kỷ niệm thành viên, tài khoản của bạn đã trúng thưởng:</p>
      <div class="prize-box">
        <div class="prize-title">Phần quà của bạn</div>
        <h2 class="prize-name">{{prize_name}}</h2>
      </div>
      <p>Nếu đây là phần thưởng dạng <strong>Thẻ nạp điện thoại (Card điện thoại)</strong>, vui lòng truy cập ngay vào liên kết sự kiện phía dưới để gửi số điện thoại nhận thẻ cào. Quản trị viên sẽ tiến hành duyệt và trao giải trực tiếp cho bạn.</p>
      <div class="button-container">
        <a href="{{site_url}}/lucky-draw" class="btn" target="_blank">Nhận Giải Thưởng</a>
      </div>
      <p>Cảm ơn bạn đã luôn đồng hành và ủng hộ cộng đồng xem phim của chúng tôi. Chúc bạn có những giây phút thư giãn tuyệt vời!</p>
    </div>
    <div class="footer"><p>&copy; {{copyright_year}} {{site_name}} - All Rights Reserved</p></div>
  </div>
</body>
</html>
```

### 3. Worker Implementation (Sử dụng Nodemailer & Cloudflare TCP)

> [!NOTE]
> Kể từ cuối năm 2023, Cloudflare Workers đã hỗ trợ outbound TCP sockets. Chúng ta có thể sử dụng thư viện gửi mail trực tiếp từ Worker thông qua TLS socket.

```typescript
// workers/lib/emailService.ts
// Giả định sử dụng package phù hợp môi trường edge như `email-cloudflare-workers` 
// hoặc gửi qua REST API của SendGrid/Mailgun (nếu SMTP bị block port 25/465).
// Khuyến nghị: Sử dụng API của nhà cung cấp Email để tối ưu trên serverless.

export async function sendEmail(to: string, subject: string, htmlHtml: string, config: SmtpConfig) {
  // Logic gửi email thông qua API của nhà cung cấp (e.g., Resend, SendGrid) 
  // hoặc kết nối SMTP raw qua TCP socket của Cloudflare.
  
  // Ví dụ dùng API (ưu tiên cho Serverless)
  /*
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.smtp_pass}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${config.smtp_from_name} <${config.smtp_from_email}>`,
      to,
      subject,
      html: htmlHtml
    })
  });
  */
}
```

## 📣 Social Media Integration — Liên kết Mạng Xã Hội & Decoy Gate

Hệ thống cho phép Admin bật/tắt và cấu hình URL cho từng nền tảng MXH ngay từ Admin Settings. Frontend sẽ tự động render các biểu tượng/link dựa trên trạng thái `enable` và `url` trong bảng `settings`.

### 1. Các nền tảng hỗ trợ hiển thị

| Platform | Icon (FontAwesome) | Setting Key (enable) | Setting Key (url) |
|----------|---------------------|----------------------|---------------------|
| Facebook Page | `fab fa-facebook` | `social_fb_enable` | `social_fb_url` |
| Facebook Group | `fas fa-users` | `social_fb_group_enable` | `social_fb_group_url` |
| Telegram Channel | `fab fa-telegram` | `social_telegram_enable` | `social_telegram_url` |
| TikTok | `fab fa-tiktok` | `social_tiktok_enable` | `social_tiktok_url` |
| Zalo Group | `fas fa-qrcode` | `social_zalo_group_enable` | `social_zalo_group_url` |

### 2. Vị trí hiển thị trên Website

#### A. Footer (`Footer.astro`)
- Hiển thị dãy biểu tượng MXH ngang hàng ở cuối trang.
- Chỉ render những platform có `*_enable = true`.
- Icon được bọc trong container bo tròn với hover animation (scale + glow).
- Mở tab mới (`target="_blank" rel="noopener noreferrer"`).

#### B. Sidebar (Tuỳ chọn — Mobile Drawer)
- Trong menu hamburger trên mobile, hiển thị phần "Theo dõi chúng tôi" với icon + label.

#### C. Trang Liên hệ / Giới thiệu (`/lien-he`, `/gioi-thieu`)
- Hiển thị card đầy đủ: icon + tên platform + URL + nút "Truy cập".

### 3. Decoy Gate (Cổng Ngụy Trang)

Khi `decoy_enable = true`, website sẽ hiển thị **giao diện ngụy trang** (trang công nghệ/blog giả) thay vì nội dung phim. Người dùng phải nhập đúng `decoy_passcode` để vượt qua.

```
[ Người dùng truy cập website ]
         |
         v
[ Kiểm tra Cookie: txa_gate_passed ]
         |
    +----+----+
    |         |
    v         v
 [Chưa]    [Rồi]
    |         |
    v         v
 [Decoy]  [Website phim bình thường]
 [Page]
    |
    v
 [Nhập mật mã]
    |
    +---> Đúng → Set cookie `txa_gate_passed` (HTTPOnly, 30 ngày) → Redirect vào trang chính
    +---> Sai → Hiển thị "Trang không khả dụng" (không hint gì)
```

#### Lớp bảo mật thứ 2: Zalo Lock (`zalo_lock_enable`)
- Sau khi vượt qua Decoy Gate, nếu `zalo_lock_enable = true`:
  - Người dùng buộc phải điền SĐT Zalo và chờ Admin duyệt qua Telegram Bot.
  - Admin nhận thông báo Telegram (template `telegram_notify_zalo` ở trên).
  - Sau khi duyệt, Admin approve từ trang `/admin/zalo` → User mới xem được phim.

### 4. Server-Side Rendering: Lấy Social Config

```typescript
// src/lib/socialConfig.ts — Gọi từ Astro layout/page (server-side)

interface SocialLink {
  platform: string;
  icon: string;
  url: string;
  label: string;
}

export function getSocialLinks(settings: Record<string, any>): SocialLink[] {
  const links: SocialLink[] = [];

  const platforms = [
    { key: 'fb', icon: 'fab fa-facebook', label: 'Facebook' },
    { key: 'fb_group', icon: 'fas fa-users', label: 'Nhóm Facebook' },
    { key: 'telegram', icon: 'fab fa-telegram', label: 'Telegram' },
    { key: 'tiktok', icon: 'fab fa-tiktok', label: 'TikTok' },
    { key: 'zalo_group', icon: 'fas fa-qrcode', label: 'Nhóm Zalo' },
  ];

  for (const p of platforms) {
    if (settings[`social_${p.key}_enable`] && settings[`social_${p.key}_url`]) {
      links.push({
        platform: p.key,
        icon: p.icon,
        url: settings[`social_${p.key}_url`],
        label: p.label,
      });
    }
  }

  return links;
}
```

---

## 🔐 TXA Payload Encryption — Mã hóa Request/Response API

Toàn bộ response trả về từ **Cloudflare Workers API** (dành cho cả Flutter App và Website) sẽ được mã hóa sâu ở tầng payload. Chỉ các client hợp lệ biết khóa mới giải mã được. Hacker bắt gói tin chỉ thấy chuỗi mã hóa vô nghĩa.

### 1. Tổng quan chiến lược

```
[ Cloudflare Worker ]
      |
      +---> Build JSON response chuẩn
      |
      +---> Encrypt bằng AES-256-GCM với passphrase từ settings (`api_encrypt_pass`)
      |
      +---> Trả về chuỗi mã hóa dạng: { "d": "<ciphertext_base64>", "v": 1 }
      |
[ Client hợp lệ ]
      |
      +---> Biết passphrase (nhúng sẵn trong app / web)
      |
      +---> Decrypt AES-256-GCM → parse JSON → sử dụng dữ liệu

[ Hacker / Sniff tool ]
      |
      +---> Chỉ thấy chuỗi `{ "d": "aGVhZGVyMTIzc2FsdA==...", "v": 1 }`
      +---> Không thể đọc nội dung thật sự
```

### 2. Thuật toán mã hóa: AES-256-GCM

Sử dụng **AES-256-GCM** (AEAD — Authenticated Encryption with Associated Data):
- **Khóa**: Được dẫn xuất từ passphrase bằng `PBKDF2-SHA256` với 100.000 iterations (chống brute-force).
- **Salt**: Random 16 bytes, gắn vào đầu ciphertext.
- **IV (Nonce)**: Random 12 bytes, gắn vào ciphertext.
- **Tag xác thực**: 16 bytes GCM authentication tag (tích hợp trong AES-GCM, đảm bảo ciphertext không bị giả mạo).
- **Output format**: `salt(16) + iv(12) + tag(16) + ciphertext` → encode thành Base64 URL-safe.

**Response envelope từ Worker:**
```json
{
  "d": "<base64url_encoded_payload>",
  "v": 1
}
```
> Trường `"v"` là version của scheme mã hóa, dùng để nâng cấp thuật toán trong tương lai mà không breaking client cũ.

### 3. Quản lý Passphrase (`api_encrypt_pass`)

- Passphrase do Admin tự cấu hình trong **Admin Settings** (tab `Cấu hình chung`), key trong bảng `settings`: **`api_encrypt_pass`**.
- **Không có giá trị mặc định cứng** — Server từ chối xử lý nếu key này chưa được cấu hình.
- Flutter app nhận passphrase qua **một endpoint bootstrap riêng được bảo vệ** (chỉ trả về sau khi client xác thực hợp lệ), không nhúng cứng (hardcode) passphrase trực tiếp vào APK/IPA.
- Website nhận passphrase từ Cloudflare Worker trong quá trình SSR (server-side), không expose ra JavaScript bundle phía client.

**Thêm vào bảng `settings` (DATABASE.md):**

| Key | Kiểu | Mô tả |
|-----|------|--------|
| `api_encrypt_pass` | `string` | Passphrase mã hóa API payload — Admin tự đặt, không có giá trị mặc định *(nhạy cảm cao)* |
| `api_encrypt_enable` | `boolean` | Bật/tắt mã hóa payload API (mặc định `true`) |

### 4. Implement phía Cloudflare Worker

```typescript
// workers/lib/txaCrypto.ts

const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

/**
 * Dẫn xuất khóa AES-256-GCM từ passphrase qua PBKDF2-SHA256
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Mã hóa plaintext thành chuỗi Base64URL
 */
export async function txaEncrypt(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key  = await deriveKey(passphrase, salt);
  const enc  = new TextEncoder();

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  // Ghép: salt + iv + ciphertext(+tag)
  const result = new Uint8Array(SALT_LEN + IV_LEN + cipherBuffer.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LEN);
  result.set(new Uint8Array(cipherBuffer), SALT_LEN + IV_LEN);

  // Base64URL encode
  return btoa(String.fromCharCode(...result))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Giải mã chuỗi Base64URL thành plaintext
 */
export async function txaDecrypt(encoded: string, passphrase: string): Promise<string> {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const salt       = raw.slice(0, SALT_LEN);
  const iv         = raw.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const cipherData = raw.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(passphrase, salt);
  const dec = new TextDecoder();

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherData
  );
  return dec.decode(plainBuffer);
}
```

**Sử dụng trong Worker handler:**
```typescript
// workers/index.ts — ví dụ endpoint /api/app/movies
import { txaEncrypt } from './lib/txaCrypto';

app.get('/api/app/movies', async (ctx) => {
  const pass = ctx.env.API_ENCRYPT_PASS; // Lấy từ Cloudflare Secret (không hardcode)
  const enabled = ctx.env.API_ENCRYPT_ENABLE !== 'false';

  const rawData = await buildMoviesResponse(ctx); // JSON object
  const payload = JSON.stringify(rawData);

  if (enabled && pass) {
    const encrypted = await txaEncrypt(payload, pass);
    return ctx.json({ d: encrypted, v: 1 });
  }

  return ctx.json(rawData); // Fallback khi tắt mã hóa (dev mode)
});
```

> [!IMPORTANT]
> Passphrase **KHÔNG** được lưu trong Cloudflare `wrangler.toml` hay source code. Phải dùng **Cloudflare Secrets** (`wrangler secret put API_ENCRYPT_PASS`) để inject vào Worker runtime.

### 5. Implement phía Client (Website — SSR)

```typescript
// src/lib/txaApiClient.ts (chạy server-side trong Astro endpoint)
import { txaDecrypt } from './txaCrypto'; // Cùng thuật toán

const API_PASS = import.meta.env.API_ENCRYPT_PASS; // Biến môi trường SSR-only

export async function fetchFromWorker<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();

  if (body?.v === 1 && body?.d) {
    const plaintext = await txaDecrypt(body.d, API_PASS);
    return JSON.parse(plaintext) as T;
  }
  return body as T; // fallback nếu không encrypted
}
```

### 6. Công cụ Debug cho Admin: `window.decodetxa()`

Để Admin có thể debug response API ngay từ DevTools Console mà không cần tool bên ngoài, một hàm toàn cục `decodetxa` được inject sẵn vào trang Admin (chỉ trang `/admin`, không inject ra user page).

```javascript
// Inject vào <head> chỉ khi route là /admin/* (server-side check)
// src/pages/admin/[...slug].astro

window.decodetxa = async function(ciphertext, pass) {
  // --- Không có hint, không có default, không log gì cả ---
  if (!ciphertext || !pass) return;

  try {
    const base64 = ciphertext.replace(/-/g, '+').replace(/_/g, '/');
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const salt = raw.slice(0, 16);
    const iv   = raw.slice(16, 28);
    const data = raw.slice(28);

    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    const text  = new TextDecoder().decode(plain);

    try {
      return JSON.parse(text); // Trả về Object nếu là JSON
    } catch {
      return text;             // Trả về string thuần nếu không phải JSON
    }
  } catch {
    return null; // Sai pass hoặc sai ciphertext → trả null, không báo lỗi chi tiết
  }
};
```

**Cách Admin sử dụng trong Console:**
```javascript
// Admin mở DevTools → Console, paste response string từ Network tab:
decodetxa("aGVhZGVyMTIzc2FsdA...", "matkhauadmin")
// → Trả về: { movies: [...], total: 120, ... }
```

> [!CAUTION]
> - Hàm `decodetxa` **chỉ tồn tại** trên các trang `/admin/*` — không inject vào trang công khai.
> - Console **không** có dòng chú thích, hint hay gợi ý passphrase mặc định.
> - Nếu sai passphrase → trả về `null` (không ném lỗi để tránh tiết lộ thông tin).

### 7. Implement phía Flutter App (TPhimX)

Flutter App nhận passphrase qua **endpoint bootstrap** sau khi xác thực:
```
GET /api/app/bootstrap
Authorization: Bearer <JWT>

Response (dạng mã hóa với public key của app):
{
  "encryptPass": "...",
  "featureFlags": { ... }
}
```

Flutter sử dụng package `pointycastle` hoặc `cryptography` để thực hiện AES-256-GCM tương tự, với cùng format `salt(16) + iv(12) + ciphertext`.

```dart
// lib/services/txa_crypto_service.dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';

class TxaCryptoService {
  static Future<String> decrypt(String encoded, String passphrase) async {
    final bytes = base64Url.decode(base64Url.normalize(encoded));
    final salt   = bytes.sublist(0, 16);
    final nonce  = bytes.sublist(16, 28);
    final cipher = bytes.sublist(28);

    final pbkdf2 = Pbkdf2(
      macAlgorithm: Hmac.sha256(),
      iterations: 100000,
      bits: 256,
    );
    final secretKey = await pbkdf2.deriveKey(
      secretKey: SecretKey(utf8.encode(passphrase)),
      nonce: salt,
    );

    final aesGcm   = AesGcm.with256bits();
    final box      = SecretBox(cipher.sublist(0, cipher.length - 16),
                               nonce: nonce,
                               mac: Mac(cipher.sublist(cipher.length - 16)));
    final result   = await aesGcm.decrypt(box, secretKey: secretKey);
    return utf8.decode(result);
  }
}
```

