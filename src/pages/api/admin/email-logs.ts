import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';

// GET: Lấy nhật ký email
export const GET: APIRoute = async ({ request }) => {
  try {
    const { data: logs, error } = await supabase
      .from('txa_email_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedLogs = (logs || []).map(log => ({
      id: log.id,
      time: log.created_at,
      recipient: log.recipient,
      sender: log.sender,
      subject: log.subject,
      category: log.category,
      status: log.status,
      responseCode: log.response_code,
      parameters: log.parameters,
      smtpConfig: log.smtp_config,
      html: log.html
    }));

    return apiResponse(formattedLogs, 'success', 'Lấy danh sách nhật ký email thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Xử lý xóa nhật ký email
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action } = body;
    if (action === 'clear') {
      const { error } = await supabase
        .from('txa_email_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

      if (error) throw error;
      return apiResponse({ success: true }, 'success', 'Đã xóa toàn bộ nhật ký email!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
