import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';
import { SettingService } from '../../../services/SettingService';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { txid, actionType } = body; // actionType: 'upgrade' | 'renew'

    if (!txid) {
      return apiResponse(null, 'error', 'Thiếu mã giao dịch (txid)!', 400, request);
    }

    const settings = await SettingService.getSettings();
    const payments = settings.payments || {};

    if (!payments.sepay_enable) {
      return apiResponse(null, 'error', 'Cổng SePay hiện không hoạt động (chưa bật).', 400, request);
    }

    const sepayApiKey = payments.sepay_api_key;
    if (!sepayApiKey && !payments.sandbox_mode) {
      return apiResponse(null, 'error', 'Cấu hình SePay chưa hoàn tất API Key.', 400, request);
    }

    if (payments.sandbox_mode) {
      // 1. Tìm thông tin giao dịch trong DB
      const { data: log, error: logError } = await supabase
        .from('txa_payment_logs')
        .select('*')
        .eq('txid', txid)
        .maybeSingle();

      if (logError) throw logError;

      // Cập nhật hoặc tạo log
      const targetUser = log ? log.username : 'anonymous';
      const cycle = log ? log.cycle : (actionType === 'renew' ? 'annual' : 'monthly');
      const packageTitle = log ? log.package_title : (actionType === 'renew' ? 'VIP 1 Năm' : 'VIP 1 Tháng');
      const price = log ? log.price : (actionType === 'renew' ? 699000 : 69000);

      if (!log) {
        const { error: insertErr } = await supabase
          .from('txa_payment_logs')
          .insert({
            txid: txid,
            username: targetUser,
            package_title: packageTitle,
            price: price,
            cycle: cycle,
            method: 'sepay',
            status: 'approved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (insertErr) throw insertErr;
      } else if (log.status !== 'approved') {
        const { error: updateLogErr } = await supabase
          .from('txa_payment_logs')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('txid', txid);
        if (updateLogErr) throw updateLogErr;
      }

      // Cập nhật hạn dùng cho user tương ứng
      const cycleDays = cycle === 'annual' ? 365 : 30;
      const expiryDate = new Date(Date.now() + 3600 * 1000 * 24 * cycleDays).toISOString();

      const { error: updateUserErr } = await supabase
        .from('users')
        .update({
          package: packageTitle,
          join_date: new Date().toISOString(),
          expiry_date: expiryDate,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('username', targetUser);

      if (updateUserErr) throw updateUserErr;

      return apiResponse({ success: true, sandbox: true }, 'success', 'Khớp giao dịch thành công (Mô phỏng Sandbox)! Gói cước của bạn đã được kích hoạt.', 200, request);
    }

    // 1. Tìm thông tin giao dịch trong DB
    const { data: log, error: logError } = await supabase
      .from('txa_payment_logs')
      .select('*')
      .eq('txid', txid)
      .maybeSingle();

    if (logError) throw logError;
    if (!log) {
      return apiResponse(null, 'error', `Không tìm thấy thông tin giao dịch với mã: ${txid}`, 404, request);
    }

    // Nếu đã duyệt trước đó (qua Webhook hoặc click trước)
    if (log.status === 'approved') {
      return apiResponse({ success: true, alreadyApproved: true }, 'success', 'Giao dịch đã được kích hoạt thành công!', 200, request);
    }

    // 2. Gọi SePay API để đối soát chủ động (GET /transactions/list)
    const sepayRes = await fetch('https://my.sepay.vn/userapi/transactions/list?limit=100', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sepayApiKey}`
      }
    });

    if (!sepayRes.ok) {
      const errText = await sepayRes.text();
      console.error('SePay API Error:', errText);
      return apiResponse(null, 'error', 'Không thể kết nối đến cổng SePay để đối soát.', 500, request);
    }

    const sepayData = await sepayRes.json() as any;
    const transactions = sepayData.transactions || [];

    // Cú pháp tìm kiếm trong nội dung chuyển khoản
    const expectedPrefix = actionType === 'renew' ? `TXA_GH_${txid}` : `TXA_UP_${txid}`;
    
    // Tìm giao dịch khớp
    const matchedTx = transactions.find((t: any) => {
      const content = (t.transaction_content || '').toUpperCase();
      const amountIn = Number(t.amount_in || 0);
      
      // Kiểm tra xem nội dung chuyển khoản có chứa mã giao dịch không, và số tiền có đủ không
      const hasCode = content.includes(expectedPrefix.toUpperCase()) || content.includes(txid.toUpperCase());
      const hasAmount = amountIn >= log.price;
      
      return hasCode && hasAmount;
    });

    if (!matchedTx) {
      return apiResponse({ success: false }, 'success', 'Hệ thống chưa tìm thấy giao dịch chuyển khoản tương thích trên tài khoản ngân hàng. Vui lòng đợi 10-30 giây và kiểm tra lại!', 200, request);
    }

    // 3. Khớp giao dịch thành công -> Cập nhật trạng thái thanh toán
    const { error: updateLogErr } = await supabase
      .from('txa_payment_logs')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('txid', txid);

    if (updateLogErr) throw updateLogErr;

    // 4. Cập nhật hạn dùng cho user tương ứng
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

    return apiResponse({ success: true }, 'success', 'Khớp giao dịch thành công! Gói cước của bạn đã được kích hoạt.', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
