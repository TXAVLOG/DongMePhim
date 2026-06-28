import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { PromoCodeService } from '@services/PromoCodeService';

// GET: Lấy danh sách mã giảm giá hoặc chi tiết người dùng đã dùng mã
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const code = url.searchParams.get('code');
    if (code) {
      const users = await PromoCodeService.getPromoCodeUsers(code);
      return apiResponse(users, 'success', '', 200, request);
    }

    const promoCodes = await PromoCodeService.getAllPromoCodes();
    return apiResponse(promoCodes, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Tạo mới mã hoặc xóa / đổi trạng thái
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { action, promoData, id, status } = body;

    if (action === 'create') {
      if (!promoData || !promoData.code || !promoData.expiry_date) {
        return apiResponse(null, 'error', 'Thiếu thông tin mã giảm giá hoặc thời hạn!', 400, request);
      }
      const created = await PromoCodeService.createPromoCode(promoData);
      return apiResponse(created, 'success', 'Tạo mã giảm giá thành công!', 200, request);
    }

    if (action === 'delete') {
      if (!id) return apiResponse(null, 'error', 'Thiếu ID mã cần xóa!', 400, request);
      await PromoCodeService.deletePromoCode(id);
      return apiResponse({ success: true }, 'success', 'Đã xóa mã giảm giá!', 200, request);
    }

    if (action === 'toggle') {
      if (!id || !status) return apiResponse(null, 'error', 'Thiếu ID hoặc trạng thái mới!', 400, request);
      await PromoCodeService.togglePromoCode(id, status);
      return apiResponse({ success: true }, 'success', 'Đã cập nhật trạng thái mã!', 200, request);
    }

    return apiResponse(null, 'error', 'Action không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
