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
    tmdb_api_key: "",
    site_title_template: "%title% | %site_name%",
    meta_robots: "index, follow",
    og_image_default: "/favicon.png",
    google_verification: "",
    bing_verification: "",
    schema_logo_url: "/favicon.png",
    schema_business_name: "DongMePhim",
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
    app_version: "5.1.2",
    app_release_notes: "- 🖼️ [AVATAR] Hỗ trợ chọn ảnh đại diện từ thiết bị và tự động cắt (crop) ảnh trực quan trước khi tải lên\n- 🔄 [SYNC] Đồng bộ hiển thị ảnh đại diện dạng chuỗi Base64 tức thì trên màn hình Home Drawer và trang Xác nhận TV",
    app_changelogs: [
      {
        version: "5.1.2",
        date: "2026-07-19",
        title: "🚀 v5.1.2 - Đổi ảnh đại diện & Đồng bộ Base64",
        content: "- 🖼️ [AVATAR] Hỗ trợ chọn ảnh đại diện từ thiết bị và tự động cắt (crop) ảnh trực quan trước khi tải lên\n- 🔄 [SYNC] Đồng bộ hiển thị ảnh đại diện dạng chuỗi Base64 tức thì trên màn hình Home Drawer và trang Xác nhận TV"
      },
      {
        version: "5.1.1",
        date: "2026-07-19",
        title: "🚀 v5.1.1 - Sửa lỗi crash Notification & Tối ưu",
        content: "- 🛠️ [FIX] Khắc phục hoàn toàn lỗi crash do không nạp được icon thông báo (Invalid small icon) khi tải bản cập nhật trên thiết bị Android\n- 📡 [STATS] Tích hợp bộ đếm phim yêu thích và các thông số hoạt động chi tiết lên trang cá nhân & Bot Discord"
      },
      {
        version: "5.1.0",
        date: "2026-07-18",
        title: "🚀 v5.1.0 - 3D Surround Sound & Package Bypass",
        content: "- 🎧 [AUDIO] Tích hợp âm thanh không gian vòm 3D giả lập (Haas Effect) & EQ tối ưu giọng nói/âm bass\n- 🔊 [BOOST] Tăng công suất khuếch đại âm lượng (Volume Boost) lên tới 300% trên Web và Mobile/TV\n- 🛡️ [BYPASS] Quản trị viên có thể bật/tắt cơ chế kiểm tra gói đăng ký (Bypass Mode) linh hoạt\n- 🔐 [AUTH] Tự động hiển thị widget Yêu cầu đăng nhập thân thiện cho khách khi truy cập nguồn phát VIP ở chế độ bypass\n- ⚡ [PERF] Khắc phục triệt để lỗi lag, khựng hình (stuttering) bằng cách tối ưu hóa ghi log API và giảm chu kỳ lưu lịch sử xem phim xuống 10s"
      },
      {
        version: "5.0.3",
        date: "2026-07-15",
        title: "🚀 v5.0.3 - Storyboard Scrubbing & Subtitle Styling",
        content: "- 📺 [STORYBOARD] Tích hợp tính năng xem trước ảnh thu nhỏ storyboard khi tua (kéo thả hoặc nhấn phím remote)\n- 🎛️ [REMOTE] Hỗ trợ hoàn toàn D-Pad remote Smart TV cho Panel Cài đặt cải tiến\n- 🌍 [I18N] Việt hóa/Đa ngôn ngữ toàn bộ giao diện điều chỉnh tùy chọn kiểu dáng phụ đề\n- 💎 [SUBTITLE] Cho phép tùy biến cỡ chữ, màu sắc, kiểu viền, độ mờ nền và vị trí của phụ đề song ngữ trực tiếp trong ngăn kéo Cài đặt\n- ⚙️ [SYS] Đồng bộ và lưu cấu hình người dùng vào SharedPreferences tự động áp dụng khi đổi tập"
      },
      {
        version: "5.0.2",
        date: "2026-07-12",
        title: "🚀 v5.0.2 - Smart TV Settings Panel & Subtitle Sync",
        content: "- ⚙️ [SYS] Thiết kế Sidebar Cài đặt trên Mobile & TV (Bỏ qua Intro, Tự chuyển tập, Ngôn ngữ phụ đề ưu tiên)\n- 📺 [TV] Hỗ trợ hoàn hảo điều hướng D-Pad phím remote TV trên Panel Cài đặt\n- 🔄 [SEAMLESS] Trải nghiệm chuyển tập liền mạch không gián đoạn trình phát\n- 🛠️ [FIX] Giải quyết hoàn toàn lỗi khựng hình/feedback loop khi kéo thanh tua\n- 🌍 [SUBTITLE] Bổ sung panel cào & ghép phụ đề từ VSMOV cho các tập phim KKPhim\n- 🖼️ [TMDB] Tự động đồng bộ và lấy ảnh thu nhỏ (still_path) tập phim từ TMDB trong các tác vụ cron"
      },
      {
        version: "5.0.1",
        date: "2026-07-11",
        title: "🚀 v5.0.1 - R2 Fix, Font Decode & TV Pairing Stability",
        content: "- 📺 [R2] Bổ sung HTTP headers chuẩn khi tải luồng stream từ Cloudflare R2, sửa lỗi không phát được video\n- 🔤 [FONT] Khắc phục triệt để lỗi hiển thị font tiếng Việt (diacritics) từ API bằng giải mã UTF-8\n- 📱 [CONTROLS] Tối ưu hóa phản hồi chạm để ẩn/hiện thanh điều khiển trình phát video ngay lập tức\n- 🔄 [HISTORY] Khắc phục lỗi lưu lịch sử xem phim và đồng bộ tiến độ thời gian thực giữa TV và điện thoại di động\n- 📡 [TV-PAIR] Sửa lỗi polling khiến mất trạng thái kết nối TV khi QR code hết hạn, cải thiện độ ổn định ghép nối mã TV"
      },
      {
        version: "5.0.0",
        date: "2026-07-09",
        title: "🚀 v5.0.0 - Rebranding, Sync Progress & TV Pairing",
        content: "- 🎨 [BRAND] Đồng bộ thương hiệu mới DongMePhim trên ứng dụng di động\n- 🔄 [SYNC] Tự động đồng bộ lịch sử và tiến trình xem phim thời gian thực giữa Web và Mobile App\n- 💎 [VIP] Nâng cấp cơ chế mua gói và chuyển hướng SePay qua Data URI bảo mật\n- 📺 [TV] Đồng bộ hiển thị và tối ưu hóa hàng đợi kết nối TV Pairing đồng thời qua QR/Code\n- 🛠️ [FIX] Thiết lập cấu hình ProGuard và khắc phục hoàn toàn lỗi crash khi quét mã QR trên Android"
      },
      {
        version: "4.7.5",
        date: "2026-07-04",
        title: "🚀 v4.7.5 - Player Fixes, Ad Buffering & Upgrades Stability",
        content: "- 📺 [PLAYER] Khắc phục lỗi ẩn thanh controls trình phát ArtPlayer trên trình duyệt Safari/Chrome mobile\n- 🔄 [AUTO-NEXT] Sửa lỗi tự động chuyển tập nhảy nhanh và rò rỉ trạng thái giữa các tập\n- 🎬 [AD] Nâng cấp cơ chế buffering quảng cáo pre-roll, tự động bỏ qua nếu link quảng cáo lỗi giúp người dùng vào thẳng phim\n- 💎 [VIP] Chuẩn hóa đồng bộ logic gói cước chữ thường để khắc phục lỗi không nhận diện gói Premium nâng cấp trên App\n- ⚙️ [SYS] Nâng cấp phiên bản hệ thống lên v4.7.5 tương thích hoàn toàn"
      },
      {
        version: "4.7.0",
        date: "2026-06-28",
        title: "🚀 v4.7.0 - Mobile API Adapter & Subscriptions",
        content: "- 🚀 [v4.7.0] Chuẩn hóa toàn bộ các Mobile API Adapter cho di động\n- 💎 [VIP] Phát triển tính năng chọn và đăng ký nâng cấp gói cước trực tiếp trên Flutter app tích hợp cổng SePay / VietQR\n- 📺 [CAST] Tích hợp trang chiếu lên TV (/cast) độc lập tối ưu cho màn hình TV\n- ⭐️ [RATING] Hệ thống đánh giá phim 1-10 sao đồng bộ giữa Web và Mobile App\n- 🔄 [CRON] Cron Job tự động quét và cập nhật tập phim mới từ nguồn KKPhim, tự động thông báo tới người dùng có phim trong danh sách Yêu thích"
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
    app_android_download_url: "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim-Mobile.apk",
    app_apk_size: "74176577",
    app_apk_sha256: "a8f64c4c2a98f87c5f7de7d4d2212c24af6bbdbb50e02cd5675822b4bf81cd98",
    app_ios_direct_install_enable: false,
    app_ios_download_url: "/ios-access",
    app_ios_ipa_download_enable: true,
    app_ios_ipa_url: "https://github.com/TXAVLOG/dongmephim-mobile/releases/download/v5.1.2_512/DongMePhim-Premium-v5.1.2+512.ipa",
    app_google_play_enable: false,
    app_google_play_url: "",
    app_app_store_enable: false,
    app_app_store_url: "",
    app_smart_tv_enable: true,
    app_smart_tv_url: "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim-TV.apk",
    app_smart_tv_size: "74176577",
    app_smart_tv_sha256: "a8f64c4c2a98f87c5f7de7d4d2212c24af6bbdbb50e02cd5675822b4bf81cd98",
    app_smart_tv_code: "3779765",
    app_windows_download_enable: true,
    app_windows_download_url: "https://pub-ffb3837c19c940af8cc1bc7f2682fd70.r2.dev/DongMePhim_v5.1.2_Setup.exe",
    app_windows_size: "26152871",
    app_windows_sha256: "809f37a7b22c01d03334b1f9b3b3fdecc585dbf8eed95494a899b66afe140e74",
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
    sandbox_mode: false,
    sepay_sandbox_mode: false,
    payos_enable: true,
    payos_client_id: "mock_payos_id",
    payos_api_key: "mock_api_key",
    payos_checksum_key: "mock_checksum_key",
    paypal_enable: true,
    paypal_client_id: "mock_paypal_id",
    sepay_enable: true,
    sepay_api_key: "mock_sepay_key",
    sepay_merchant_id: "SP-LIVE-TX5B9345",
    sepay_secret_key: "spsk_live_xdFNcCKmERhi2Y3teu8YRN8bLKSbNQxQ",
    sepay_ipn_secret_key: "TPHIMX_SECRET_999",
    sepay_sandbox_api_key: "",
    sepay_integration_type: "gateway",
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
    vat_rate: 8,
    manual_enable: true,
    manual_bank_name: "Ngân hàng Quân đội MB Bank",
    manual_account_no: "1903568999999",
    manual_account_name: "LE HOANG ANH"
  },
  packages: [],
  ads: {
    pre_roll_enable: false,
    pre_roll_type: "video",
    pre_roll_url: "https://www.w3schools.com/html/mov_bbb.mp4",
    pre_roll_skip_seconds: 5,
    click_ad_enable: false,
    click_ad_code: "https://shope.ee",
    click_ad_threshold: 5,
    google_ads_enable: false,
    google_ads_client_id: "ca-pub-123456789",
    offerwall_enable: false,
    offerwall_script: "",
    ad_provider: "none"
  },
  discord: {
    bot_token: "",
    client_id: "",
    client_secret: "",
    guild_id: "",
    admin_ids: "",
    api_key: "txa-discord-secure-key-2026",
    is_setup_completed: false
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
          if (parsed.general) {
            let generalChanged = false;
            const generalKeys = [
              'site_title_template',
              'meta_robots',
              'og_image_default',
              'google_verification',
              'bing_verification',
              'schema_logo_url',
              'schema_business_name'
            ];
            generalKeys.forEach(k => {
              if (parsed.general[k] === undefined) {
                parsed.general[k] = (seedSettings.general as any)[k];
                generalChanged = true;
              }
            });
            if (generalChanged) {
              changed = true;
            }
          }
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
          } else {
            let adsChanged = false;
            if (parsed.ads.offerwall_enable === undefined) {
              parsed.ads.offerwall_enable = false;
              adsChanged = true;
            }
            if (parsed.ads.offerwall_script === undefined) {
              parsed.ads.offerwall_script = "";
              adsChanged = true;
            }
            if (parsed.ads.ad_provider === undefined) {
              if (parsed.ads.google_ads_enable && parsed.ads.offerwall_enable) {
                parsed.ads.ad_provider = "both";
              } else if (parsed.ads.google_ads_enable) {
                parsed.ads.ad_provider = "google_ads";
              } else if (parsed.ads.offerwall_enable) {
                parsed.ads.ad_provider = "offerwall";
              } else {
                parsed.ads.ad_provider = "none";
              }
              adsChanged = true;
            }
            if (adsChanged) {
              changed = true;
            }
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
          if (parsed.discord === undefined) {
            parsed.discord = { ...seedSettings.discord };
            changed = true;
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

