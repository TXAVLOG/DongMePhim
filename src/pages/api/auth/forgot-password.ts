import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { SettingService } from '../../../services/SettingService';
import { getEmailTemplate } from '../../../templates/emails/emailReader';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { email, name, turnstileToken } = body;
    if (!email) {
      return apiResponse(null, 'error', 'Vui lòng cung cấp địa chỉ email!', 400);
    }

    const settings = await SettingService.getSettings();
    const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);

    if (!isSmtpConfigured) {
      return apiResponse(null, 'error', 'Hệ thống chưa được cấu hình SMTP Mail để thực hiện gửi mã phục hồi!', 400);
    }

    // Turnstile Captcha verification
    if (settings.login?.turnstile_enable) {
      const secretKey = settings.login?.turnstile_secret_key;

      if (!turnstileToken || !secretKey) {
        return apiResponse(null, 'error', 'Vui lòng hoàn thành xác thực Captcha!', 400);
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(turnstileToken)}`
      });

      const verifyData = await verifyRes.json() as any;
      if (!verifyData.success) {
        return apiResponse(null, 'error', 'Mã Captcha không hợp lệ hoặc đã hết hạn!', 400);
      }
    }

    const year = new Date().getFullYear().toString();
    const siteUrl = settings.general.site_url || 'https://webfilm.dongmephim.online';
    const resetLink = `${siteUrl.replace(/\/$/, '')}/auth/reset-password?token=mock_token_${Math.floor(Math.random()*1000000)}`;

    const htmlTemplate = getEmailTemplate('forgot-password.html');

    // Compile template
    const compiledHtml = htmlTemplate
      .replace(/{name}/g, name || 'Thành viên WebFilm')
      .replace(/{email}/g, email)
      .replace(/{reset_link}/g, resetLink)
      .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
      .replace(/{year}/g, year);

    // Simulate sending email (print details in server console)
    console.log(`[SMTP SIMULATOR] Sending reset password email via host ${settings.smtp.smtp_host}:${settings.smtp.smtp_port}`);
    console.log(`[SMTP SIMULATOR] From: ${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`);
    console.log(`[SMTP SIMULATOR] To: ${email}`);

    // Create an email log object to send to client
    const emailLog = {
      id: 'mail_' + Math.floor(Math.random() * 100000000),
      time: new Date().toISOString(),
      recipient: email,
      sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
      subject: 'Khôi phục mật khẩu tài khoản WebFilm',
      category: 'Auth Reset',
      status: 'success',
      responseCode: '250 2.0.0 OK Message accepted',
      parameters: {
        name: name || 'Thành viên WebFilm',
        email: email,
        reset_link: resetLink
      },
      smtpConfig: {
        host: settings.smtp.smtp_host,
        port: settings.smtp.smtp_port,
        secure: settings.smtp.smtp_secure,
        user: settings.smtp.smtp_user
      },
      html: compiledHtml
    };

    return apiResponse({
      success: true,
      message: 'Liên kết đặt lại mật khẩu đã được gửi thành công!',
      emailLog: emailLog
    });
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500);
  }
};
