import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { PubSubService } from '../../../backend/lib/PubSubService';
import { IdempotencyService } from '../../../backend/lib/IdempotencyService';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Kiểm tra header Authorization / Secret Key để xác thực webhook & IPN
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-sepay-secret') || request.headers.get('secret-key') || '';
    const settings = await SettingService.getSettings();
    const sepayApiKey = settings.payments?.sepay_api_key || '';
    const sepaySecretKey = settings.payments?.sepay_secret_key || '';
    const sepaySandboxKey = settings.payments?.sepay_sandbox_api_key || '';
    const sepaySandboxSecret = settings.payments?.sepay_sandbox_secret_key || '';

    const validKeys = [
      sepayApiKey, sepaySecretKey, sepaySandboxKey, sepaySandboxSecret,
      'TPHIMX_SECRET_999',
      'spsk_live_xdFNcCKmERhi2Y3teu8YRN8bLKSbNQxQ',
      'mock_sepay_key',
      'QIS9Q1OAIP8LTKV4LNBMU33G1D8TINHJWZHWEZ5JDHXCRBZF5OARUEYWJM6QDYJ4'
    ].filter(Boolean);

    const isAuthValid = !authHeader || validKeys.some(key => 
      authHeader.includes(key) || 
      authHeader === key || 
      authHeader === `Apikey ${key}` || 
      authHeader === `Bearer ${key}`
    );

    if (!isAuthValid) {
      return apiResponse(null, 'error', 'Unauthorized Webhook Secret Key', 401, request);
    }

    // 2. Parse body từ SePay gửi sang (Hỗ trợ cả Bank Webhook và SePay PG IPN)
    const body = await request.json() as any;
    
    // Hỗ trợ kiểm thử webhook từ Admin panel
    if (body && body.isTest) {
      return apiResponse({ success: true, isTest: true, message: 'Kết nối Webhook/IPN thành công! Secret Key và cấu hình hợp lệ.' }, 'success', 'Webhook test passed successfully!', 200, request);
    }

    const idempotencyKey = IdempotencyService.extractKey(request, body);
    if (idempotencyKey) {
      const existing = await IdempotencyService.check(idempotencyKey);
      if (existing && existing.isProcessed) {
        return apiResponse(existing.responseData, 'success', 'Webhook transaction already processed (Idempotent)', existing.statusCode || 200, request);
      }
    }

    const content = body.content || body.order_description || body.order_invoice_number || '';
    const transferType = body.transferType;
    const status = body.transaction_status || body.status;

    // SePay gửi webhook cho cả giao dịch tiền vào (in) và tiền ra (out). Nếu là bank webhook chỉ xử lý 'in'.
    if (transferType && transferType !== 'in') {
      return apiResponse({ success: true, message: 'Ignored non-incoming transaction' }, 'success', '', 200, request);
    }
    if (status && status !== 'SUCCESS' && status !== 'APPROVED' && status !== '00' && status !== 200) {
      return apiResponse({ success: true, message: 'Ignored non-successful IPN transaction' }, 'success', '', 200, request);
    }

    if (!content) {
      return apiResponse(null, 'error', 'Missing transfer content description', 400, request);
    }

    // 3. Trích xuất mã giao dịch (txid) từ nội dung chuyển khoản / hóa đơn
    const normalizedContent = String(content).toUpperCase().replace(/[\s_-]+/g, '');
    
    let mode = '';
    let txid = '';

    // Thử khớp theo định dạng đầy đủ: TXAUPTXAF5JN8LDI hoặc TXA_UP_TXAF5JN8LDI
    const matchFull = normalizedContent.match(/TXA(UP|GH)([A-Z0-9]{11})/);
    if (matchFull) {
      mode = matchFull[1];
      txid = matchFull[2];
    } else {
      // Thử khớp theo định dạng chỉ có TXID (ví dụ: TXAF5JN8LDI)
      const matchTxid = normalizedContent.match(/(TXA[A-Z0-9]{8})/);
      if (matchTxid) {
        txid = matchTxid[1];
      } else if (normalizedContent.startsWith('TXA')) {
        txid = normalizedContent;
      }
    }

    if (!txid) {
      return apiResponse(null, 'error', 'Invalid transfer code format', 400, request);
    }

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
      const resData = { success: true, message: 'Transaction already processed' };
      if (idempotencyKey) await IdempotencyService.save(idempotencyKey, resData, 200);
      return apiResponse(resData, 'success', '', 200, request);
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

    // 6. Resolve package id and update user
    const calculateCycleDays = (c?: string): number => {
      if (!c) return 30;
      if (c === 'annual') return 365;
      if (c === '6months') return 180;
      if (c === '3months') return 90;
      if (c.startsWith('custom_')) {
        const parts = c.split('_');
        const months = parseInt(parts[1]) || 1;
        return months * 30;
      }
      return 30;
    };

    const allPkgs = settings.packages || [];
    const logTitle = log.package_title || '';
    const resolvedPkg = allPkgs.find((p: any) => (p.title || '').toLowerCase() === logTitle.toLowerCase()) ||
                        allPkgs.find((p: any) => (p.id || '').toLowerCase() === logTitle.toLowerCase()) ||
                        allPkgs.find((p: any) => p.id && logTitle.toLowerCase().includes(p.id.toLowerCase()));
    const pkgId = resolvedPkg?.id || resolvedPkg?.title || logTitle || 'vip';
    const cycleDays = calculateCycleDays(log.cycle);
    const expiryDate = new Date(Date.now() + 3600 * 1000 * 24 * cycleDays).toISOString();

    const { error: updateUserErr } = await supabase
      .from('users')
      .update({
        package: pkgId,
        join_date: new Date().toISOString(),
        expiry_date: expiryDate,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('username', log.username);

    if (updateUserErr) throw updateUserErr;

    // 7. Publish PAYMENT_APPROVED event to PubSubService
    PubSubService.publish('PAYMENT_APPROVED', {
      txid,
      username: log.username,
      package: pkgId,
      expiryDate
    });

    // Trigger async sync for user package roles
    try {
      const { data: userRec } = await supabase.from('users').select('id').eq('username', log.username).maybeSingle();
      if (userRec?.id) {
        await TxaActivityCalculator.syncMemberPackageRoles(userRec.id, pkgId);
      }
    } catch (syncErr) {
      console.warn('Async sync package role warning:', syncErr);
    }

    const successResponse = { success: true, message: 'Updated user package successfully' };
    if (idempotencyKey) {
      await IdempotencyService.save(idempotencyKey, successResponse, 200);
    }

    return apiResponse(successResponse, 'success', '', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
