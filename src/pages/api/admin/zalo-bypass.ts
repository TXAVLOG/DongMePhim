import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { ZaloService } from '../../../services/ZaloService';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, id, value, type, description } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    if (action === 'create') {
      if (!value || !type) {
        return apiResponse(null, 'error', 'Thiếu giá trị hoặc loại Whitelist!', 400, request);
      }
      const newItem = await ZaloService.createZaloBypass({
        type: type as 'user' | 'token' | 'ip' | 'nickname',
        value,
        description: description || null
      });
      return apiResponse({ success: true, bypass: newItem }, 'success', 'Đã thêm Whitelist thành công!', 200, request);
    }

    if (action === 'delete') {
      if (!id) {
        return apiResponse(null, 'error', 'Thiếu ID Whitelist cần xóa!', 400, request);
      }
      await ZaloService.deleteZaloBypass(id);
      return apiResponse({ success: true }, 'success', 'Đã xóa Whitelist thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
