import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { ZaloService } from '../../../services/ZaloService';
import { verifySession } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { token, ip, username, email } = body;
    if (!token) {
      return apiResponse(null, 'error', 'Thiếu token thiết bị!', 400, request);
    }

    // 0. Kiểm tra xem người dùng hiện tại có phải Admin không để tự động bypass
    const user = await verifySession(request, cookies) as any;
    const isAdmin = user && (user.role === 'admin' || user.is_admin === true || user.is_admin === 'true');
    if (isAdmin) {
      return apiResponse({ status: 'approved', bypassed: true }, 'success', '', 200, request);
    }

    // 1. Kiểm tra Whitelist Bypass trước
    const isBypassed = await ZaloService.checkZaloBypass(token, ip || null, username || null, email || null);
    if (isBypassed) {
      return apiResponse({ status: 'approved', bypassed: true }, 'success', '', 200, request);
    }

    // 2. Kiểm tra yêu cầu trong database
    const record = await ZaloService.getZaloAccessByToken(token);
    if (record) {
      return apiResponse({ status: record.status, bypassed: false }, 'success', '', 200, request);
    }

    return apiResponse({ status: 'none', bypassed: false }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

