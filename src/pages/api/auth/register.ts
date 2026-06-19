import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const POST: APIRoute = async () => {
  return apiResponse({ success: true, message: "Đăng ký thành công" });
};
