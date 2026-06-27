import type { ISettingProvider, SiteSettings } from '@apptypes/settings';

export const seedSettings: SiteSettings = {
  general: {
    site_name: "DongMePhim",
    site_url: "https://localhost:4321",
    site_description: "Nền tảng xem phim trực tuyến cao cấp và hoàn toàn miễn phí",
    site_keywords: "xem phim, phim bộ, phim lẻ, phim hay, phim mới, dongmephim, phim hd, xem phim online",
    maintenance_enable: false,
    maintenance_message: "Hệ thống đang được nâng cấp để mang lại trải nghiệm điện ảnh đỉnh cao hơn.",
    maintenance_end_time: new Date(Date.now() + 3600 * 1000 * 2).toISOString(),
    api_encrypt_enable: true,
    api_encrypt_pass: "tphimx",
  },
  smtp: {
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_secure: "SSL",
    smtp_user: "noreply@dongmephim.com",
    smtp_pass: "mock_app_password",
    smtp_from_email: "noreply@dongmephim.com",
    smtp_from_name: "DongMePhim System",
  },
  telegram: {
    telegram_bot_token: "mock_bot_token",
    telegram_chat_id: "123456789",
    telegram_channel_id: "@dongphimtxa",
    telegram_bot_username: "dongphimbot",
    telegram_verified: true,
    telegram_notify_report: true,
    telegram_notify_zalo: true,
    telegram_notify_user: true,
    telegram_notify_luckydraw: true,
  },
  app: {
    app_version: "4.6.0",
    app_release_notes: "- 🔄 [API] Bổ sung tự động map và decorate chi tiết thông tin phim, server, tập phim khi lấy danh sách lịch sử xem tại API /watch-history\n- 📊 [UI] Tích hợp tự động trả về lịch sử xem gần nhất của phim này (trường history) trong API chi tiết phim /movie/:slug\n- 📱 [FIX] Khắc phục lỗi phát tiếp: Đọc server_index từ lịch sử để khởi tạo trình phát chạy đúng Server đã xem thay vì luôn mặc định Server 0\n- 🎬 [APP] Nâng cấp thuật toán tự động quét và fallback server thông minh: Tự động chuyển đổi server và tập phim phù hợp trong trình phát nếu tập phim được yêu cầu không tồn tại ở server hiện tại\n- ⚡ [APP] Đồng bộ trường server_index lên API và hàng đợi ngoại tuyến khi cập nhật lịch sử xem từ trình phát\n- 🎨 [UI] Sửa lỗi hiển thị Card rỗng và mốc thời gian rỗng ở phần \"Đang xem\" tại trang cá nhân và màn hình lịch sử\n- ⬆️ [SYS] Nâng cấp phiên bản ứng dụng lên v4.6.0 (Build 460) tương thích hoàn hảo với cú pháp map null-aware của Dart 3.0",
    app_changelogs: [
      {
        version: "4.6.0",
        date: "2026-06-14",
        title: "UPDATE APP LÊN v4.6.0",
        content: "- 🔄 [API] Bổ sung tự động map và decorate chi tiết thông tin phim, server, tập phim khi lấy danh sách lịch sử xem tại API /watch-history\n- 📊 [UI] Tích hợp tự động trả về lịch sử xem gần nhất của phim này (trường history) trong API chi tiết phim /movie/:slug\n- 📱 [FIX] Khắc phục lỗi phát tiếp: Đọc server_index từ lịch sử để khởi tạo trình phát chạy đúng Server đã xem thay vì luôn mặc định Server 0\n- 🎬 [APP] Nâng cấp thuật toán tự động quét và fallback server thông minh: Tự động chuyển đổi server và tập phim phù hợp trong trình phát nếu tập phim được yêu cầu không tồn tại ở server hiện tại\n- ⚡ [APP] Đồng bộ trường server_index lên API và hàng đợi ngoại tuyến khi cập nhật lịch sử xem từ trình phát\n- 🎨 [UI] Sửa lỗi hiển thị Card rỗng và mốc thời gian rỗng ở phần \"Đang xem\" tại trang cá nhân và màn hình lịch sử\n- ⬆️ [SYS] Nâng cấp phiên bản ứng dụng lên v4.6.0 (Build 460) tương thích hoàn hảo với cú pháp map null-aware của Dart 3.0"
      },
      {
        version: "4.5.0",
        date: "2026-06-04",
        title: "🚀 v4.5.0 - API Structure Update & UI Improvements",
        content: "- 🔄 [API] Cập nhật API /home trả về các key mới: TXA_PB1, TXA_PL1, TXA_NEW1, TXA_HOT1, TXA_HH1, TXA_TV1, TXA_CR1, TXA_LIST1\n- 🌍 [I18N] API trả về key bản dịch thay vì chuỗi tiếng Việt để hỗ trợ đa ngôn ngữ tốt hơn\n- 📱 [APP] Cập nhật Flutter app dùng các key mới từ API /home\n- 🎨 [UI] Fix responsive layout cho section \"Đường Đua Điện Ảnh Quốc Tế\" (mobile/desktop)\n- 🎬 [WEB] Thêm 3 chủ đề curated vào trang chủ: Phim Mùa Hè Hấp Dẫn, Cổ Trang Đỉnh Cao, Hành Động Mạnh Mẽ\n- ⚡ [PERF] Fix Flutter app UI update ngay khi đổi ngôn ngữ (không cần reload app)\n- 🛠️ [FIX] Tối ưu hóa hiển thị section phim theo quốc gia trên mobile\n"
      },
      {
        version: "4.4.0",
        date: "2026-05-30",
        title: "Auto Error Logging & Device Tracking - v4.4.0",
        content: "🚀 [v4.4.0 - Auto Error Logging & Device Tracking]\n- 📊 [NEW] Tự động gửi error log lên server khi có lỗi xảy ra.\n- 📱 [NEW] Thu thập thông tin thiết bị (loại, tên, model, phiên bản OS, UDID).\n- 🌍 [NEW] Tự động phát hiện IP và vị trí địa lý của người dùng.\n- 🔐 [NEW] Thêm error logging vào màn hình đăng nhập/đăng ký.\n- 🛡️ [SYS] Tối ưu hóa hệ thống theo dõi lỗi để debug nhanh hơn."
      },
      {
        version: "4.3.0",
        date: "2026-05-27",
        title: "Cloudflare HLS Premium Streaming - v4.3.0",
        content: "🚀 [v4.3.0 - Cloudflare Premium CDN Streaming]\n- ⚡ [NEW] Tích hợp bộ giải quyết luồng cao tốc Stream V6 trực tiếp qua Cloudflare Worker.\n- 🚀 [PERF] Tải video và tải xuống mượt mà hơn gấp 5 lần thông qua hệ thống bộ nhớ đệm tự động R2 CDN.\n- 🛡️ [SYS] Khắc phục hoàn toàn lỗi phân giải phân đoạn HLS và lỗi không tìm thấy tập phim trên máy chủ Vercel.\n- 💎 [UI] Tối ưu hóa trình phát TxaPlayer thích ứng tốt hơn với kết nối mạng yếu."
      }
    ],
    app_android_download_enable: true,
    app_android_download_url: "https://app.nrotxa.online/TPHIMX.apk",
    app_apk_size: "66122454",
    app_apk_sha256: "4f7df1b9932e36159f6c4ee76fb305d627b45e972864f15695a8aaca7baaa0ef",
    app_ios_direct_install_enable: false,
    app_ios_download_url: "/ios-access",
    app_ios_ipa_download_enable: true,
    app_ios_ipa_url: "https://github.com/TXAVLOG/tphimx-setup/releases/download/v4.6.0_460/TPHIMX-Premium-v4.6.0+460.ipa",
    app_google_play_enable: false,
    app_google_play_url: "",
    app_app_store_enable: false,
    app_app_store_url: "",
  },
  user: {
    allow_registration: true,
    require_email_verification: true,
    verification_method: 'link',
    verification_token_expiry: 3600,
    reset_password_token_expiry: 1800,
  },
  login: {
    login_standard_enable: true,
    login_google_enable: true,
    login_google_client_id: "mock_google_id",
    login_google_client_secret: "mock_google_secret",
    login_google_onetap_enable: true,
    login_fb_enable: true,
    login_fb_app_id: "mock_fb_id",
    login_fb_app_secret: "mock_fb_secret",
    login_apple_enable: false,
    login_apple_client_id: "",
    login_apple_team_id: "",
    login_apple_key_id: "",
    login_zalo_enable: true,
    login_zalo_app_id: "mock_zalo_id",
    login_zalo_secret_key: "mock_zalo_secret",
    login_discord_enable: false,
    login_discord_client_id: "",
    login_discord_client_secret: "",
    login_github_enable: false,
    login_github_client_id: "",
    login_github_client_secret: "",
    login_x_enable: false,
    login_x_client_id: "",
    login_x_client_secret: "",
    turnstile_enable: false,
    turnstile_site_key: "",
    turnstile_secret_key: "",
  },
  social: {
    social_fb_enable: true,
    social_fb_url: "https://www.facebook.com/tphimx",
    social_fb_group_enable: true,
    social_fb_group_url: "https://www.facebook.com/groups/1819522938713878",
    social_telegram_enable: true,
    social_telegram_url: "https://t.me/dongphimtxa",
    social_tiktok_enable: false,
    social_tiktok_url: "",
    social_zalo_group_enable: true,
    social_zalo_group_url: "https://zalo.me/g/nc4aaozaxnr5fszvnxdb",
    social_discord_enable: false,
    social_discord_url: "",
    decoy_enable: false,
    decoy_passcode: "phimtxadinhvai",
    zalo_lock_enable: false,
  },
  luckyDraw: {
    lucky_draw_active_event_id: "summer_event_2024",
  },
  payments: {
    sandbox_mode: true,
    sepay_sandbox_mode: true,
    payos_enable: true,
    payos_client_id: "mock_payos_id",
    payos_api_key: "mock_api_key",
    payos_checksum_key: "mock_checksum_key",
    paypal_enable: true,
    paypal_client_id: "mock_paypal_id",
    sepay_enable: true,
    sepay_api_key: "mock_sepay_key",
    sepay_sandbox_api_key: "",
    sepay_integration_type: "vietqr",
    sepay_bank_account_id: "",
    sepay_bank_name: "",
    sepay_account_no: "",
    sepay_account_name: "",
    vnpay_enable: true,
    vnpay_tmn_code: "mock_tmn_code",
    vnpay_hash_secret: "mock_hash_secret",
    stripe_enable: true,
    stripe_publishable_key: "mock_stripe_pub_key",
    stripe_secret_key: "mock_stripe_sec_key",
    manual_enable: true,
    manual_bank_name: "Ngân hàng Quân đội MB Bank",
    manual_account_no: "1903568999999",
    manual_account_name: "LE HOANG ANH"
  },
  packages: [
    {
      id: "free",
      title: "Gói Free",
      price: 0,
      cycle: "free",
      style_type: "default",
      features: ["Có chứa quảng cáo ngẫu nhiên", "Xem chất lượng SD tiêu chuẩn", "Chỉ xem các server thường"],
      permissions: {
        max_resolution: "SD",
        allowed_servers: ["Vietsub", "Thuyết Minh", "Lồng Tiếng"],
        max_playlists: 10,
        watch_together: false,
        hide_watermark: false,
        vip_badge: false,
        bypass_ads: false
      }
    },
    {
      id: "standard",
      title: "Gói Tiêu Chuẩn (Standard)",
      price: 39000,
      annual_price: 399000,
      cycle: "monthly",
      style_type: "custom_color",
      custom_color: "#3b82f6",
      features: [
        "Không có quảng cáo pop-under / nhảy trang",
        "Chỉ có quảng cáo trong trình phát khi xem",
        "Xem chất lượng HD/FHD nét mượt",
        "Hỗ trợ các server Vietsub, Thuyết Minh & Lồng Tiếng"
      ],
      permissions: {
        max_resolution: "FHD",
        allowed_servers: [
          "#Hà Nội (Vietsub)",
          "#Hà Nội (Thuyết Minh)",
          "#Hà Nội (Lồng Tiếng)",
          "Vietsub",
          "Thuyết Minh",
          "Lồng Tiếng"
        ],
        max_playlists: 50,
        watch_together: false,
        hide_watermark: false,
        vip_badge: false,
        bypass_ads: false,
        ads_only_in_player: true
      }
    },
    {
      id: "vip",
      title: "Gói VIP",
      price: 69000,
      annual_price: 699000,
      style_type: "default",
      features: ["Hoàn toàn không có quảng cáo", "Xem chất lượng cực nét 4K UHD", "Mở khóa toàn bộ các server VIP tốc độ cao", "Hỗ trợ tính năng Xem Chung"],
      permissions: {
        max_resolution: "4K",
        allowed_servers: ["DongMePhim VIP", "FPT Fast", "Vietsub", "Thuyết Minh", "Lồng Tiếng"],
        max_playlists: 1000,
        watch_together: true,
        hide_watermark: true,
        vip_badge: true,
        bypass_ads: true
      }
    }
  ],
  ads: {
    pre_roll_enable: false,
    pre_roll_type: "video",
    pre_roll_url: "https://www.w3schools.com/html/mov_bbb.mp4",
    pre_roll_skip_seconds: 5,
    click_ad_enable: false,
    click_ad_code: "https://shope.ee",
    click_ad_threshold: 5,
    google_ads_enable: false,
    google_ads_client_id: "ca-pub-123456789"
  }
};

export class LocalSettingProvider implements ISettingProvider {
  async getSettings(): Promise<SiteSettings> {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('txa_site_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          let changed = false;
          if (!parsed.payments) {
            parsed.payments = { ...seedSettings.payments };
            changed = true;
          } else {
            let paymentsChanged = false;
            const keysToEnsure = [
              'sepay_bank_account_id',
              'sepay_bank_name',
              'sepay_account_no',
              'sepay_account_name',
              'sepay_integration_type'
            ];
            keysToEnsure.forEach(k => {
              if (parsed.payments[k] === undefined) {
                if (k === 'sepay_integration_type') parsed.payments[k] = 'vietqr';
                else parsed.payments[k] = '';
                paymentsChanged = true;
              }
            });
            if (parsed.payments.sandbox_mode === undefined) {
              parsed.payments.sandbox_mode = true;
              paymentsChanged = true;
            }
            if (parsed.payments.sepay_sandbox_mode === undefined) {
              parsed.payments.sepay_sandbox_mode = true;
              paymentsChanged = true;
            }
            if (paymentsChanged) {
              changed = true;
            }
          }
          if (!parsed.packages) {
            parsed.packages = JSON.parse(JSON.stringify(seedSettings.packages));
            changed = true;
          }
          if (!parsed.ads) {
            parsed.ads = { ...seedSettings.ads };
            changed = true;
          }
          if (parsed.social) {
            if (parsed.social.social_fb_url === "https://facebook.com/dongmephim") {
              parsed.social.social_fb_url = seedSettings.social.social_fb_url;
              changed = true;
            }
            if (parsed.social.social_fb_group_url === "https://facebook.com/groups/dongmephim") {
              parsed.social.social_fb_group_url = seedSettings.social.social_fb_group_url;
              changed = true;
            }
            if (parsed.social.social_zalo_group_url === "https://zalo.me/g/mockgroup") {
              parsed.social.social_zalo_group_url = seedSettings.social.social_zalo_group_url;
              changed = true;
            }
            if (parsed.social.social_tiktok_url === "https://tiktok.com/@dongmephim") {
              parsed.social.social_tiktok_url = seedSettings.social.social_tiktok_url;
              parsed.social.social_tiktok_enable = seedSettings.social.social_tiktok_enable;
              changed = true;
            }
            if (parsed.social.social_discord_enable === undefined) {
              parsed.social.social_discord_enable = seedSettings.social.social_discord_enable;
              parsed.social.social_discord_url = seedSettings.social.social_discord_url;
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem('txa_site_settings', JSON.stringify(parsed));
          }
          return parsed;
        } else {
          localStorage.setItem('txa_site_settings', JSON.stringify(seedSettings));
          return seedSettings;
        }
      } catch (e) {
        console.error('Error loading local settings:', e);
      }
    }
    return seedSettings;
  }

  async updateSettings(settings: SiteSettings): Promise<void> {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('txa_site_settings', JSON.stringify(settings));
      } catch (e) {
        console.error('Error updating local settings:', e);
        throw e;
      }
    }
  }
}

