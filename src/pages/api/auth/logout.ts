import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { destroySession } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await destroySession(cookies);
    return apiResponse(null, 'success', 'Đã đăng xuất', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
