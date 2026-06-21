import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';
import { SettingService } from '../../../services/SettingService';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Kiểm tra header Authorization để xác thực webhook
    const authHeader = request.headers.get('Authorization');
    const settings = await SettingService.getSettings();
    const sepayApiKey = settings.payments?.sepay_api_key || 'mock_sepay_key';

    if (!authHeader || authHeader !== `Apikey ${sepayApiKey}`) {
      return apiResponse(null, 'error', 'Unauthorized Webhook Secret Key', 401, request);
    }

    // 2. Parse body từ SePay gửi sang
    const body = await request.json() as any;
    
    // Hỗ trợ kiểm thử webhook từ Admin panel
    if (body && body.isTest) {
      return apiResponse({ success: true, isTest: true, message: 'Kết nối Webhook thành công! API Key và cấu hình hợp lệ.' }, 'success', 'Webhook test passed successfully!', 200, request);
    }

    const { transferType, transferAmount, content } = body;

    // SePay gửi webhook cho cả giao dịch tiền vào (in) và tiền ra (out). Chỉ xử lý tiền vào.
    if (transferType !== 'in') {
      return apiResponse({ success: true, message: 'Ignored non-incoming transaction' }, 'success', '', 200, request);
    }

    if (!content) {
      return apiResponse(null, 'error', 'Missing transfer content description', 400, request);
    }

    // 3. Trích xuất mã giao dịch (txid) từ nội dung chuyển khoản
    // Chấp nhận cả TXA_UP_ và TXA_GH_
    const match = content.match(/TXA_(UP|GH)_([A-Z0-9]+)/i);
    if (!match) {
      return apiResponse(null, 'error', 'Invalid transfer code format', 400, request);
    }

    const mode = match[1].toUpperCase(); // UP hoặc GH
    const txid = match[2].toUpperCase(); // ví dụ: TXA1A2B3C

    // 4. Tìm log giao dịch tương ứng trong DB
    const { data: log, error: logError } = await supabase
      .from('txa_payment_logs')
      .select('*')
      .eq('txid', txid)
      .maybeSingle();

    if (logError) throw logError;
    if (!log) {
      return apiResponse(null, 'error', `Transaction log not found for txid: ${txid}`, 404, request);
    }

    // Nếu giao dịch đã được phê duyệt từ trước, trả về 200 luôn để tránh xử lý trùng lặp (Idempotent)
    if (log.status === 'approved') {
      return apiResponse({ success: true, message: 'Transaction already processed' }, 'success', '', 200, request);
    }

    // 5. Cập nhật trạng thái giao dịch sang approved
    const { error: updateLogErr } = await supabase
      .from('txa_payment_logs')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('txid', txid);

    if (updateLogErr) throw updateLogErr;

    // 6. Cập nhật hạn dùng cho user tương ứng
    const cycleDays = log.cycle === 'annual' ? 365 : 30;
    const expiryDate = new Date(Date.now() + 3600 * 1000 * 24 * cycleDays).toISOString();

    const { error: updateUserErr } = await supabase
      .from('users')
      .update({
        package: log.package_title,
        join_date: new Date().toISOString(),
        expiry_date: expiryDate,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('username', log.username);

    if (updateUserErr) throw updateUserErr;

    return apiResponse({ success: true, message: 'Updated user package successfully' }, 'success', '', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
