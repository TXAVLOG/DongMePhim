import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { ErrorReportService } from '../../../services/ErrorReportService';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { id, action, status } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    if (action === 'update_status') {
      if (!id) return apiResponse(null, 'error', 'Thiếu ID báo cáo!', 400, request);
      if (!status || !['pending', 'fixing', 'resolved'].includes(status)) {
        return apiResponse(null, 'error', 'Trạng thái không hợp lệ!', 400, request);
      }
      await ErrorReportService.updateReportStatus(id, status);
      return apiResponse({ success: true }, 'success', `Đã cập nhật trạng thái thành công!`, 200, request);
    }

    if (action === 'delete') {
      if (!id) return apiResponse(null, 'error', 'Thiếu ID báo cáo!', 400, request);
      await ErrorReportService.deleteReport(id);
      return apiResponse({ success: true }, 'success', `Đã xóa báo cáo thành công!`, 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
