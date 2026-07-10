import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { PromoCodeService } from '@services/PromoCodeService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const allCodes = await PromoCodeService.getAllPromoCodes();
    const now = Date.now();

    // Filter to active + not expired + not maxed out
    const activePromos = allCodes
      .filter((c) => {
        if (c.status !== 'active') return false;
        const expTime = new Date(c.expiry_date).getTime();
        if (now > expTime) return false;
        if ((c.used_count || 0) >= c.max_uses) return false;
        return true;
      })
      .map((c) => ({
        code: c.code,
        discount_type: c.discount_type,
        discount_value: c.discount_value,
        package_scope: c.package_scope,
        expiry_date: c.expiry_date,
      }));

    return apiResponse(activePromos, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
