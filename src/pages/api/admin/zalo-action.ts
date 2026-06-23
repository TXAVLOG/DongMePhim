import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { ZaloService } from '@services/ZaloService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const requests = await ZaloService.getAllZaloAccessRequests();
    const pendingCount = requests.filter((r: any) => r.status === 'pending').length;
    return apiResponse({ requests, count: pendingCount }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse({ requests: [], count: 0 }, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { id, ids, action } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    if (action === 'approved' || action === 'rejected') {
      if (!id) return apiResponse(null, 'error', 'Thiếu ID yêu cầu!', 400, request);
      await ZaloService.updateZaloAccessStatus(id, action);
      return apiResponse({ success: true }, 'success', `Đã cập nhật trạng thái thành công!`, 200, request);
    }

    if (action === 'delete') {
      if (!id) return apiResponse(null, 'error', 'Thiếu ID yêu cầu!', 400, request);
      await ZaloService.deleteZaloAccessRequest(id);
      return apiResponse({ success: true }, 'success', `Đã xóa yêu cầu thành công!`, 200, request);
    }

    if (action === 'approve_bulk' || action === 'reject_bulk') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return apiResponse(null, 'error', 'Thiếu danh sách ID!', 400, request);
      }
      const statusValue = action === 'approve_bulk' ? 'approved' : 'rejected';
      for (const targetId of ids) {
        await ZaloService.updateZaloAccessStatus(targetId, statusValue);
      }
      return apiResponse({ success: true }, 'success', `Đã cập nhật trạng thái đồng loạt thành công!`, 200, request);
    }

    if (action === 'delete_bulk') {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return apiResponse(null, 'error', 'Thiếu danh sách ID!', 400, request);
      }
      for (const targetId of ids) {
        await ZaloService.deleteZaloAccessRequest(targetId);
      }
      return apiResponse({ success: true }, 'success', `Đã xóa đồng loạt thành công!`, 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
