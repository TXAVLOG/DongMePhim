import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

async function fetchSepayUserApi(endpoint: string, apiKey: string) {
  const headersToTry = [
    `Bearer ${apiKey}`,
    `Apikey ${apiKey}`,
    apiKey
  ];

  for (const authVal of headersToTry) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authVal
        }
      });
      if (res.ok) {
        const data = await res.json() as any;
        if (data && !data.error) return { ok: true, data };
      }
    } catch (e) {}
  }
  return { ok: false };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { apiKey, bankAccountId, action } = body;

    if (!apiKey) {
      return apiResponse(null, 'error', 'Thiếu API Key của SePay.', 400, request);
    }

    if (action === 'list') {
      const result = await fetchSepayUserApi('https://my.sepay.vn/userapi/bankaccounts/list', apiKey);
      if (result.ok && result.data) {
        return apiResponse(result.data.bankaccounts || [], 'success', 'Tải danh sách tài khoản thành công', 200, request);
      }
      return apiResponse(null, 'error', 'Không thể kết nối đến SePay. Vui lòng kiểm tra lại API Key (Lấy ở mục Kết nối API trên SePay).', 400, request);
    }

    if (action === 'verify') {
      if (!bankAccountId) {
        return apiResponse(null, 'error', 'Thiếu ID tài khoản ngân hàng để xác minh.', 400, request);
      }

      const result = await fetchSepayUserApi(`https://my.sepay.vn/userapi/bankaccounts/details/${bankAccountId}`, apiKey);
      if (result.ok && result.data) {
        return apiResponse(result.data.bankaccount, 'success', 'Xác minh tài khoản thành công', 200, request);
      }
      return apiResponse(null, 'error', `Không tìm thấy tài khoản ngân hàng với ID ${bankAccountId} trên SePay hoặc API Key không hợp lệ.`, 400, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ.', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
