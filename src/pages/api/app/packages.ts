import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const settings = await SettingService.getSettings();
    const now = new Date();
    const packagesList = (settings.packages || []).map((pkg: any) => {
      const isActiveSale = (pkg.sale_price || pkg.sale_annual_price) && (!pkg.sale_end_date || new Date(pkg.sale_end_date) >= now);
      const effectiveMonthlyPrice = (isActiveSale && pkg.sale_price) ? Number(pkg.sale_price) : Number(pkg.price || 0);
      const effectiveAnnualPrice = (isActiveSale && pkg.sale_annual_price) ? Number(pkg.sale_annual_price) : (pkg.annual_price ? Number(pkg.annual_price) : null);
      
      return {
        ...pkg,
        effective_price: effectiveMonthlyPrice,
        effective_annual_price: effectiveAnnualPrice,
        is_active_sale: !!isActiveSale
      };
    });
    const payments = settings.payments || {} as any;

    const paymentInfo = {
      sepay_enable: !!payments.sepay_enable,
      manual_enable: payments.manual_enable ?? true,
      bank_name: payments.manual_bank_name || payments.sepay_bank_name || 'MBBank',
      account_no: payments.manual_account_no || payments.sepay_account_no || '0000000000',
      account_name: payments.manual_account_name || payments.sepay_account_name || 'HE THONG RAP PHIM',
    };

    return apiResponse({ packages: packagesList, payment: paymentInfo }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
