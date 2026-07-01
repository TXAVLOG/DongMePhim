import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

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

    const isSandbox = payments.sepay_sandbox_mode !== undefined
      ? !!payments.sepay_sandbox_mode
      : !!payments.sandbox_mode;

    // Pick the correct API key based on mode
    const sepayApiKey = isSandbox
      ? (payments.sepay_sandbox_api_key || payments.sepay_api_key)
      : payments.sepay_api_key;

    if (!sepayApiKey) {
      const missingKey = isSandbox ? 'sepay_sandbox_api_key (hoặc sepay_api_key)' : 'sepay_api_key';
      return apiResponse(null, 'error', `Cấu hình SePay chưa có ${missingKey}.`, 400, request);
    }

    // 1. Tìm thông tin giao dịch trong DB (hoặc tạo pending log)
    const { data: log, error: logError } = await supabase
      .from('txa_payment_logs')
      .select('*')
      .eq('txid', txid)
      .maybeSingle();

    if (logError) throw logError;

    if (!log) {
      return apiResponse(null, 'error', `Không tìm thấy thông tin giao dịch với mã: ${txid}. Vui lòng thử lại.`, 404, request);
    }

    // Nếu đã duyệt trước đó (qua Webhook hoặc check trước)
    if (log.status === 'approved') {
      return apiResponse({ success: true, alreadyApproved: true }, 'success', 'Giao dịch đã được kích hoạt thành công!', 200, request);
    }

    // 2. Gọi SePay API để đối soát
    // Sandbox và live dùng cùng endpoint, chỉ khác API key
    const sepayUrl = `https://my.sepay.vn/userapi/transactions/list?limit=50`;

    const sepayRes = await fetch(sepayUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sepayApiKey}`
      }
    });

    if (!sepayRes.ok) {
      const errText = await sepayRes.text();
      console.error(`SePay API Error [${isSandbox ? 'sandbox' : 'live'}]:`, errText);
      return apiResponse(null, 'error', `Không thể kết nối đến cổng SePay${isSandbox ? ' (sandbox)' : ''}. Vui lòng thử lại!`, 500, request);
    }

    const sepayData = await sepayRes.json() as any;
    const transactions: any[] = sepayData.transactions || [];

    // Tìm giao dịch khớp: nội dung CK có chứa mã txid và số tiền >= giá (cho phép chênh lệch nhỏ do làm tròn)
    const matchedTx = transactions.find((t: any) => {
      // Chuẩn hóa nội dung chuyển khoản từ SePay (loại bỏ khoảng trắng, dấu gạch dưới, gạch ngang)
      const content = (t.transaction_content || '').toUpperCase().replace(/[\s_-]+/g, '');
      const cleanTxid = txid.toUpperCase();
      const amountIn = Number(t.amount_in || 0);
      
      const hasCode = content.includes(cleanTxid);
      const hasAmount = amountIn >= Math.floor(log.price - 10);
      return hasCode && hasAmount;
    });

    if (!matchedTx) {
      return apiResponse(
        { success: false, sandbox: isSandbox },
        'success',
        isSandbox
          ? 'Chưa tìm thấy giao dịch trong SePay Sandbox. Hãy thực hiện chuyển khoản thử trong môi trường sandbox của SePay!'
          : 'Hệ thống chưa tìm thấy giao dịch chuyển khoản tương thích. Vui lòng đợi 10-30 giây và kiểm tra lại!',
        200,
        request
      );
    }

    // 3. Khớp giao dịch thành công -> Cập nhật trạng thái thanh toán
    const { error: updateLogErr } = await supabase
      .from('txa_payment_logs')
      .update({
        status: 'approved',
        sepay_transaction_id: matchedTx.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('txid', txid);

    if (updateLogErr) throw updateLogErr;

    // 4. Resolve package id and update user
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
    const resolvedPkg = allPkgs.find((p: any) => p.title === logTitle) ||
                        allPkgs.find((p: any) => p.id === logTitle) ||
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

    // Fetch user email to send notification
    const { data: userDb } = await supabase
      .from('users')
      .select('email, username')
      .eq('username', log.username)
      .maybeSingle();

    const userEmail = userDb?.email || log.email || '';
    if (userEmail) {
      let siteName = 'DongMePhim';
      let userHtml = '';
      try {
        const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
        siteName = settings.general?.site_name || 'DongMePhim';
        const year = new Date().getFullYear().toString();
        const formattedExpiry = new Date(expiryDate).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        // 1. Send success email to user
        const successTemplate = getEmailTemplate('content-purchase-success.html');
        const userEmailContent = successTemplate
          .replace(/{name}/g, log.username)
          .replace(/{username}/g, log.username)
          .replace(/{package_title}/g, resolvedPkg?.title || pkgId)
          .replace(/{expiry_date}/g, formattedExpiry)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
          
        userHtml = getEmailTemplate('verify-email.html')
          .replace(/{name}/g, log.username)
          .replace(/{verification_content}/g, userEmailContent)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
          .replace(/{year}/g, year);

        const userMailResult = await SmtpClient.sendMail({
          host: settings.smtp.smtp_host,
          port: settings.smtp.smtp_port,
          secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
          user: settings.smtp.smtp_user,
          pass: settings.smtp.smtp_pass,
          fromEmail: settings.smtp.smtp_user,
          fromName: siteName
        }, {
          to: userEmail,
          subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || pkgId}`,
          html: userHtml
        });

        // 2. Send email to admin
        let adminMailResult = null;
        const adminEmail = settings.smtp.smtp_user;
        let adminHtml = '';
        if (adminEmail) {
          const adminTemplate = getEmailTemplate('content-purchase-admin.html');
          const adminEmailContent = adminTemplate
            .replace(/{username}/g, log.username)
            .replace(/{email}/g, userEmail)
            .replace(/{package_title}/g, resolvedPkg?.title || pkgId)
            .replace(/{expiry_date}/g, formattedExpiry)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''));
            
          adminHtml = getEmailTemplate('verify-email.html')
            .replace(/{name}/g, 'Admin')
            .replace(/{verification_content}/g, adminEmailContent)
            .replace(/{site_name}/g, siteName)
            .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
            .replace(/{year}/g, year);

          adminMailResult = await SmtpClient.sendMail({
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
            user: settings.smtp.smtp_user,
            pass: settings.smtp.smtp_pass,
            fromEmail: settings.smtp.smtp_user,
            fromName: siteName
          }, {
            to: adminEmail,
            subject: `[${siteName}] Thông báo: Có thành viên mới mua gói cước`,
            html: adminHtml
          });
        }

        // Log emails in txa_email_logs
        const smtpConfig = {
          host: settings.smtp.smtp_host,
          port: settings.smtp.smtp_port,
          secure: settings.smtp.smtp_secure,
          user: settings.smtp.smtp_user
        };

        const logsToInsert = [
          {
            recipient: userEmail,
            sender: settings.smtp.smtp_user,
            subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || pkgId}`,
            category: 'purchase-success',
            status: 'success',
            response_code: userMailResult.responseCode || '250 OK',
            smtp_config: smtpConfig,
            html: userHtml
          }
        ];

        if (adminEmail) {
          logsToInsert.push({
            recipient: adminEmail,
            sender: settings.smtp.smtp_user,
            subject: `[${siteName}] Thông báo: Có thành viên mới mua gói cước`,
            category: 'purchase-admin-notification',
            status: 'success',
            response_code: adminMailResult?.responseCode || '250 OK',
            smtp_config: smtpConfig,
            html: adminHtml
          });
        }

        await supabase.from('txa_email_logs').insert(logsToInsert);
      } catch (emailErr: any) {
        console.error('Error sending purchase notification emails:', emailErr);
        try {
          const smtpConfig = {
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure,
            user: settings.smtp.smtp_user
          };
          await supabase.from('txa_email_logs').insert({
            recipient: userEmail,
            sender: settings.smtp.smtp_user,
            subject: `[${siteName}] Kích hoạt thành công gói cước ${resolvedPkg?.title || pkgId}`,
            category: 'purchase-success',
            status: 'failed',
            response_code: emailErr.message || 'SMTP Error',
            smtp_config: smtpConfig,
            html: userHtml
          });
        } catch (logErr) {}
      }
    }

    return apiResponse(
      { success: true, sandbox: isSandbox },
      'success',
      `Khớp giao dịch thành công${isSandbox ? ' (Sandbox)' : ''}! Gói cước của bạn đã được kích hoạt.`,
      200,
      request
    );

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
