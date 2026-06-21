import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { apiKey, bankAccountId, action } = body;

    if (!apiKey) {
      return apiResponse(null, 'error', 'Thiếu API Key của SePay.', 400, request);
    }

    if (action === 'list') {
      const res = await fetch('https://my.sepay.vn/userapi/bankaccounts/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        return apiResponse(null, 'error', 'Không thể kết nối đến SePay. Vui lòng kiểm tra lại API Key.', 400, request);
      }

      const data = await res.json() as any;
      if (data.error) {
        return apiResponse(null, 'error', data.error || 'Lỗi từ SePay API.', 400, request);
      }

      return apiResponse(data.bankaccounts || [], 'success', 'Tải danh sách tài khoản thành công', 200, request);
    }

    if (action === 'verify') {
      if (!bankAccountId) {
        return apiResponse(null, 'error', 'Thiếu ID tài khoản ngân hàng để xác minh.', 400, request);
      }

      const res = await fetch(`https://my.sepay.vn/userapi/bankaccounts/details/${bankAccountId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        return apiResponse(null, 'error', `Không tìm thấy tài khoản ngân hàng với ID ${bankAccountId} trên SePay.`, 400, request);
      }

      const data = await res.json() as any;
      if (data.error) {
        return apiResponse(null, 'error', data.error || 'Lỗi từ SePay API.', 400, request);
      }

      return apiResponse(data.bankaccount, 'success', 'Xác minh tài khoản thành công', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ.', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
