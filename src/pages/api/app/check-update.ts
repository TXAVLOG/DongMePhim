import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async () => {
  const settings = await SettingService.getSettings();

  return apiResponse({
    maintenance_mode: settings.general.maintenance_enable,
    is_active: true,
    ios_active: true,
    data: {
      latest_version: settings.app.app_version,
      min_version: "4.0.0",
      force_update: false,
      download_url: settings.app.app_android_download_url || settings.app.app_ios_download_url,
      apk_url: settings.app.app_android_download_url,
      release_date: "2026-06-18T12:00:00Z",
      size: parseInt(settings.app.app_apk_size) || 52428800,
      sha256: settings.app.app_apk_sha256 || "abcdef1234567890...",
      changelog: settings.app.app_release_notes || "- Cập nhật trình phát video mượt hơn\n- Sửa lỗi đồng bộ lịch sử xem"
    }
  });
};
