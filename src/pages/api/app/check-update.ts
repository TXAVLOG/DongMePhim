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
    ? (changelogs[0]?.content || changelogs[0]?.notes || '')
    : '';
  const changelog = latestChangelog || settings.app.app_release_notes || "- Cập nhật trình phát video mượt hơn\n- Sửa lỗi đồng bộ lịch sử xem";

  return apiResponse({
    maintenance_mode: maintenanceMode,
    maintenance_message: maintenanceMessage,
    is_active: true,
    ios_active: true,
    latest_version: (settings.app.app_version || '').trim(),
    min_version: "4.0.0",
    force_update: false,
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
    discord_server_enable: settings.social?.social_discord_enable ?? false
  }, 'success', '', 200, request);
};
