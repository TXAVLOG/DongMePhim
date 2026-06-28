import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { PromoCodeService } from '@services/PromoCodeService';

// POST: Kiểm tra tính hợp lệ của mã giảm giá khi Checkout
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { code, packageTitle, username, currentPrice } = body;

    if (!code) {
      return apiResponse(null, 'error', 'Vui lòng nhập mã giảm giá!', 400, request);
    }

    const result = await PromoCodeService.verifyAndApplyPromoCode(
      code,
      packageTitle || '',
      username || 'guest',
      Number(currentPrice) || 0
    );

    if (!result.success) {
      return apiResponse(null, 'error', result.message, 400, request);
    }

    return apiResponse({
      discountAmount: result.discountAmount,
      discountType: result.discountType,
      discountValue: result.discountValue,
      codeObj: result.codeObj
    }, 'success', result.message, 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
