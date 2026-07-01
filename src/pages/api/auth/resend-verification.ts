import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { supabase } from '@lib/supabase';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { email } = body;
    if (!email) {
      return apiResponse(null, 'error', 'Thiếu địa chỉ email!', 400, request);
    }

    const settings = await SettingService.getSettings();
    const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
    if (!isSmtpConfigured) {
      return apiResponse(null, 'error', 'Hệ thống chưa được cấu hình SMTP để gửi mail!', 400, request);
    }

    // Tìm user chưa được xác minh email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) {
      return apiResponse(null, 'error', 'Không tìm thấy tài khoản liên kết với email này!', 400, request);
    }

    if (user.email_verified) {
      return apiResponse(null, 'error', 'Tài khoản này đã được xác minh trước đó!', 400, request);
    }

    const verificationMethod = settings.user?.verification_method || 'link';
    const tokenExpiry = settings.user?.verification_token_expiry || 1800;

    let verificationCode = '';
    if (verificationMethod === 'otp') {
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    } else {
      verificationCode = 'verify_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    const verificationExpiresAt = new Date(Date.now() + tokenExpiry * 1000).toISOString();

    // Cập nhật mã xác minh mới vào database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verification_code: verificationCode,
        verification_expires_at: verificationExpiresAt
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    const year = new Date().getFullYear().toString();
    const siteUrl = settings.general.site_url || 'https://dongmephim.online';
    const siteName = settings.general.site_name || 'DongMePhim';
    
    let verificationContent = '';
    if (verificationMethod === 'otp') {
      const contentTemplate = getEmailTemplate('content-resend-otp.html');
      verificationContent = contentTemplate
        .replace(/{otp_code}/g, verificationCode)
        .replace(/{token_expiry}/g, Math.round(tokenExpiry / 60).toString())
        .replace(/{site_name}/g, siteName);
    } else {
      const verifyLink = `${siteUrl.replace(/\/$/, '')}/api/auth/verify-email?token=${verificationCode}`;
      const contentTemplate = getEmailTemplate('content-resend-link.html');
      verificationContent = contentTemplate
        .replace(/{verify_link}/g, verifyLink)
        .replace(/{token_expiry}/g, Math.round(tokenExpiry / 60).toString())
        .replace(/{site_name}/g, siteName);
    }

    const htmlTemplate = getEmailTemplate('verify-email.html');
    const compiledHtml = htmlTemplate
      .replace(/{name}/g, user.username)
      .replace(/{verification_content}/g, verificationContent)
      .replace(/{site_name}/g, siteName)
      .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
      .replace(/{year}/g, year);

    // Gửi email
    try {
      const sendResult = await SmtpClient.sendMail({
        host: settings.smtp.smtp_host,
        port: settings.smtp.smtp_port,
        secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
        user: settings.smtp.smtp_user,
        pass: settings.smtp.smtp_pass,
        fromEmail: settings.smtp.smtp_from_email,
        fromName: settings.smtp.smtp_from_name,
      }, {
        to: email,
        subject: `[Gửi lại] Xác minh email kích hoạt tài khoản ${siteName}`,
        html: compiledHtml
      });
      
      // Ghi log
      try {
        await supabase.from('txa_email_logs').insert({
          recipient: email,
          sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
          subject: `[Gửi lại] Xác minh email kích hoạt tài khoản ${siteName}`,
          category: 'Email Verification Resend',
          status: 'success',
          response_code: sendResult.responseCode || '250 2.0.0 OK Message accepted',
          parameters: { username: user.username, email, method: verificationMethod },
          smtp_config: {
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure,
            user: settings.smtp.smtp_user
          },
          html: compiledHtml
        });
      } catch (logErr) {}
    } catch (sendErr: any) {
      console.error("[SMTP ERROR] Failed to resend verification email:", sendErr);
      try {
        await supabase.from('txa_email_logs').insert({
          recipient: email,
          sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
          subject: `[Gửi lại] Xác minh email kích hoạt tài khoản ${siteName}`,
          category: 'Email Verification Resend',
          status: 'failed',
          response_code: sendErr.message || 'Lỗi kết nối SMTP server',
          parameters: { username: user.username, email, method: verificationMethod },
          smtp_config: {
            host: settings.smtp.smtp_host,
            port: settings.smtp.smtp_port,
            secure: settings.smtp.smtp_secure,
            user: settings.smtp.smtp_user
          },
          html: compiledHtml
        });
      } catch (logErr) {}
      return apiResponse(null, 'error', `Gửi lại mã xác minh thất bại: ${sendErr.message}`, 400, request);
    }

    return apiResponse({ success: true, message: 'Gửi lại mã xác minh thành công! Vui lòng kiểm tra email.' }, 'success', '', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
