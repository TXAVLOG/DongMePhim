import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { SmtpClient } from '../../../lib/api/smtpClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from_email, smtp_from_name, testTo } = body;

    if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from_email || !testTo) {
      return apiResponse(null, 'error', 'Thiếu thông số cấu hình hoặc email người nhận!', 400, request);
    }

    const config = {
      host: smtp_host,
      port: parseInt(smtp_port) || 465,
      secure: smtp_secure as 'SSL' | 'TLS' | 'NONE',
      user: smtp_user,
      pass: smtp_pass,
      fromEmail: smtp_from_email,
      fromName: smtp_from_name || 'DongMePhim Admin',
    };

    const mail = {
      to: testTo,
      subject: 'Kiểm tra cấu hình SMTP Mail thành công',
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px;background-color:#121214;border:1px solid #1f1f23;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 40px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.03);">
              <h2 style="margin:0;font-size:24px;font-weight:800;color:#8b5cf6;letter-spacing:-0.5px;text-transform:uppercase;">DongMePhim SMTP Test</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 30px;">
              <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#ffffff;">Xin chào Admin,</h3>
              <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">Đây là email kiểm tra kết nối từ hệ thống cấu hình SMTP của DongMePhim.</p>
              <div style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:20px;margin:24px 0;">
                <p style="margin:0 0 12px;font-size:13px;color:#8b5cf6;font-weight:bold;text-transform:uppercase;">Thông số kiểm thử:</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#a1a1aa;line-height:1.8;">
                  <tr><td width="35%">SMTP Host:</td><td style="color:#ffffff;">${config.host}</td></tr>
                  <tr><td>SMTP Port:</td><td style="color:#ffffff;">${config.port}</td></tr>
                  <tr><td>SMTP Secure:</td><td style="color:#ffffff;">${config.secure}</td></tr>
                  <tr><td>SMTP User:</td><td style="color:#ffffff;">${config.user}</td></tr>
                  <tr><td>Thời gian gửi:</td><td style="color:#ffffff;">${new Date().toLocaleString('vi-VN')}</td></tr>
                </table>
              </div>
              <p style="margin:0;font-size:13px;color:#71717a;">Nếu email này gửi thành công, các tính năng gửi mã và link xác minh sẽ hoạt động bình thường trên hệ thống DongMePhim.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    };

    const result = await SmtpClient.sendMail(config, mail);
    return apiResponse({
      success: true,
      responseCode: result.responseCode,
      html: mail.html
    }, 'success', 'Gửi email kiểm thử thành công!', 200, request);

  } catch (err: any) {
    return apiResponse({
      success: false,
      error: err.message || 'Lỗi kết nối SMTP server'
    }, 'success', err.message || 'Lỗi kết nối SMTP server', 200, request);
  }
};
