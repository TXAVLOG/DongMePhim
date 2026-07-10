import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const settings = await SettingService.getSettings();
    const packagesList = settings.packages || [];
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
