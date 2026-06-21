import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { SettingService } from '../../../services/SettingService';

// GET: Lấy cấu hình hệ thống
export const GET: APIRoute = async ({ request }) => {
  try {
    const settings = await SettingService.getSettings();
    return apiResponse(settings, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Cập nhật cấu hình hệ thống
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    if (!body || typeof body !== 'object') {
      return apiResponse(null, 'error', 'Cấu hình gửi lên không hợp lệ!', 400, request);
    }

    await SettingService.updateSettings(body);
    return apiResponse({ success: true }, 'success', 'Cập nhật cấu hình hệ thống thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
