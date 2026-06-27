import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { ZaloService } from '@services/ZaloService';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action');
    const keyId = url.searchParams.get('keyId');

    if (action === 'logs' && keyId) {
      const details = await ZaloService.getKeyDetailsWithLogs(keyId);
      return apiResponse(details, 'success', '', 200, request);
    }

    const keys = await ZaloService.getAllBypassKeys();
    return apiResponse(keys, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { action, keyId, packageTitle, durationMonths, email, note } = body;

    if (action === 'create') {
      const newKey = await ZaloService.createBypassKey({
        packageTitle: packageTitle || 'Key Bypass Zalo (Admin cấp)',
        durationMonths: durationMonths ? Number(durationMonths) : 1,
        email: email || null,
        note: note || null,
        maxDevices: 15
      });
      return apiResponse(newKey, 'success', 'Tạo mã Key Bypass mới thành công!', 200, request);
    }

    if (action === 'revoke' && keyId) {
      await ZaloService.revokeBypassKey(keyId);
      return apiResponse({ success: true }, 'success', 'Thu hồi mã Key thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Action không hợp lệ', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
