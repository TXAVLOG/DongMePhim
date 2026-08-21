import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ request }) => {
  const settings = await SettingService.getSettings();

  const maintenanceMode = settings.app.app_maintenance_enable ?? settings.general.maintenance_enable ?? false;
  const maintenanceMessage = settings.app.app_maintenance_message || settings.general.maintenance_message || "Ứng dụng đang được bảo trì định kỳ để nâng cao hiệu năng. Vui lòng quay lại sau ít phút!";

  // Lấy changelog của phiên bản mới nhất từ app_changelogs[0].content
  // Fallback về app_release_notes nếu không có
  const changelogs = settings.app.app_changelogs;
  const latestChangelog = Array.isArray(changelogs) && changelogs.length > 0
    ? (changelogs[0]?.content || '')
    : '';
  const changelog = latestChangelog || settings.app.app_release_notes || "- Cập nhật trình phát video mượt hơn\n- Sửa lỗi đồng bộ lịch sử xem";

  return apiResponse({
    maintenance_mode: maintenanceMode,
    maintenance_message: maintenanceMessage,
    is_active: true,
    ios_active: true,
    latest_version: (settings.app.app_version || '').trim(),
    min_version: (settings.app.app_min_version || settings.app.min_version || "5.0.0").trim(),
    force_update: settings.app.app_force_update ?? settings.app.force_update ?? false,
    download_url: (settings.app.app_android_download_url || settings.app.app_ios_download_url || '').trim(),
    apk_url: (settings.app.app_android_download_url || '').trim(),
    ios_download_url: (settings.app.app_ios_download_url || '').trim(),
    ios_ipa_url: (settings.app.app_ios_ipa_url || '').trim(),
    app_store_url: (settings.app.app_app_store_url || '').trim(),
    google_play_url: (settings.app.app_google_play_url || '').trim(),
    smart_tv_url: (settings.app.app_smart_tv_url || '').trim(),
    smart_tv_size: parseInt(settings.app.app_smart_tv_size || '0') || 0,
    smart_tv_sha256: (settings.app.app_smart_tv_sha256 || '').trim(),
    smart_tv_code: (settings.app.app_smart_tv_code || '').trim(),
    windows_download_url: (settings.app.app_windows_download_url || '').trim(),
    windows_size: parseInt(settings.app.app_windows_size || '0') || 0,
    windows_sha256: (settings.app.app_windows_sha256 || '').trim(),
    release_date: "2026-06-18T12:00:00Z",
    size: parseInt(settings.app.app_apk_size) || 52428800,
    sha256: (settings.app.app_apk_sha256 || "abcdef1234567890...").trim(),
    changelog,
    discord_server_url: (settings.social?.social_discord_url || '').trim(),
    discord_server_enable: settings.social?.social_discord_enable ?? false,
    // Social links for contact (used in banned/block screens)
    social_telegram_url: (settings.social?.social_telegram_url || '').trim(),
    social_telegram_enable: settings.social?.social_telegram_enable ?? false,
    social_fb_url: (settings.social?.social_fb_url || '').trim(),
    social_fb_enable: settings.social?.social_fb_enable ?? false,
    social_fb_group_url: (settings.social?.social_fb_group_url || '').trim(),
    social_fb_group_enable: settings.social?.social_fb_group_enable ?? false,
    social_zalo_url: (settings.social?.social_zalo_group_url || '').trim(),
    social_zalo_enable: settings.social?.social_zalo_group_enable ?? false,
    ads: {
      admob_enable: settings.ads?.admob_enable ?? true,
      admob_app_start_ad_id_android: settings.ads?.admob_app_start_ad_id_android || "",
      admob_app_start_ad_id_ios: settings.ads?.admob_app_start_ad_id_ios || "",
      admob_preroll_ad_id_android: settings.ads?.admob_preroll_ad_id_android || "",
      admob_preroll_ad_id_ios: settings.ads?.admob_preroll_ad_id_ios || "",
      admob_rewarded_ad_id_android: settings.ads?.admob_rewarded_ad_id_android || "",
      admob_rewarded_ad_id_ios: settings.ads?.admob_rewarded_ad_id_ios || "",
      admob_banner_ad_id_android: settings.ads?.admob_banner_ad_id_android || "",
      admob_banner_ad_id_ios: settings.ads?.admob_banner_ad_id_ios || "",
      pre_roll_enable: settings.ads?.pre_roll_enable ?? false,
      pre_roll_type: settings.ads?.pre_roll_type || "video",
      pre_roll_url: settings.ads?.pre_roll_url || "",
      pre_roll_skip_seconds: settings.ads?.pre_roll_skip_seconds ?? 5,
      click_ad_enable: settings.ads?.click_ad_enable ?? false,
      click_ad_threshold: settings.ads?.click_ad_threshold ?? 5,
      click_ad_code: settings.ads?.click_ad_code || "",
      ad_provider: settings.ads?.ad_provider || "google_ads",
      google_ads_enable: settings.ads?.google_ads_enable ?? true,
      offerwall_enable: false
    }
  }, 'success', '', 200, request);
};
