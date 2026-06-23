import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { getHomepageCategories, saveHomepageCategories } from '../../../data/categories';

// GET: Lấy ánh xạ danh mục trang chủ
export const GET: APIRoute = async ({ request }) => {
  try {
    const mappings = await getHomepageCategories();
    return apiResponse(mappings, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Cập nhật ánh xạ danh mục trang chủ
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    if (!body || typeof body !== 'object') {
      return apiResponse(null, 'error', 'Dữ liệu gửi lên không hợp lệ!', 400, request);
    }

    await saveHomepageCategories(body);
    return apiResponse({ success: true }, 'success', 'Cập nhật danh mục trang chủ thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
