import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ request }) => {
  const settings = await SettingService.getSettings();

  const maintenanceMode = settings.app.app_maintenance_enable ?? settings.general.maintenance_enable ?? false;
  const maintenanceMessage = settings.app.app_maintenance_message || settings.general.maintenance_message || "Ứng dụng đang được bảo trì định kỳ để nâng cao hiệu năng. Vui lòng quay lại sau ít phút!";

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
    release_date: "2026-06-18T12:00:00Z",
    size: parseInt(settings.app.app_apk_size) || 52428800,
    sha256: (settings.app.app_apk_sha256 || "abcdef1234567890...").trim(),
    changelog: settings.app.app_release_notes || "- Cập nhật trình phát video mượt hơn\n- Sửa lỗi đồng bộ lịch sử xem"
  }, 'success', '', 200, request);
};
