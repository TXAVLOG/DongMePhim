import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const settings = await SettingService.getSettings();
    const packagesList = settings.packages || [];

    return apiResponse(packagesList, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
