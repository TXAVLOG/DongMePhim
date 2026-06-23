import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { SettingService } from '../../../services/SettingService';
import { getEmailTemplate } from '../../../templates/emails/emailReader';
import { SmtpClient } from '../../../lib/api/smtpClient';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) { }

    const { email, name, turnstileToken } = body;
    if (!email) {
      return apiResponse(null, 'error', 'Vui lòng cung cấp địa chỉ email!', 400, request);
    }

    const settings = await SettingService.getSettings();
    const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);

    if (!isSmtpConfigured) {
      return apiResponse(null, 'error', 'Hệ thống chưa được cấu hình SMTP Mail để thực hiện gửi mã phục hồi!', 400, request);
    }

    // Turnstile Captcha verification
    if (settings.login?.turnstile_enable) {
      const secretKey = settings.login?.turnstile_secret_key;

      if (!turnstileToken || !secretKey) {
        return apiResponse(null, 'error', 'Vui lòng hoàn thành xác thực Captcha!', 400, request);
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
        return apiResponse(null, 'error', 'Mã Captcha không hợp lệ hoặc đã hết hạn!', 400, request);
      }
    }

    const year = new Date().getFullYear().toString();
    const siteUrl = settings.general.site_url || 'https://dongmephim.online';
    const siteName = settings.general.site_name || 'DongMePhim';
    const resetLink = `${siteUrl.replace(/\/$/, '')}/auth/reset-password?token=mock_token_${Math.floor(Math.random() * 1000000)}`;

    const htmlTemplate = getEmailTemplate('forgot-password.html');

    // Compile template
    const compiledHtml = htmlTemplate
      .replace(/{name}/g, name || `Thành viên ${siteName}`)
      .replace(/{email}/g, email)
      .replace(/{reset_link}/g, resetLink)
      .replace(/{site_name}/g, siteName)
      .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
      .replace(/{year}/g, year);

    let sendResult;
    try {
      sendResult = await SmtpClient.sendMail({
        host: settings.smtp.smtp_host,
        port: settings.smtp.smtp_port,
        secure: settings.smtp.smtp_secure as 'SSL' | 'TLS' | 'NONE',
        user: settings.smtp.smtp_user,
        pass: settings.smtp.smtp_pass,
        fromEmail: settings.smtp.smtp_from_email,
        fromName: settings.smtp.smtp_from_name,
      }, {
        to: email,
        subject: `Khôi phục mật khẩu tài khoản ${siteName}`,
        html: compiledHtml
      });

      const emailLog = {
        id: 'mail_' + Math.floor(Math.random() * 100000000),
        time: new Date().toISOString(),
        recipient: email,
        sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
        subject: `Khôi phục mật khẩu tài khoản ${siteName}`,
        category: 'Auth Reset',
        status: 'success',
        responseCode: sendResult.responseCode || '250 2.0.0 OK Message accepted',
        parameters: {
          name: name || `Thành viên ${siteName}`,
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

      const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';
      if (providerType === 'supabase') {
        try {
          await supabase.from('txa_email_logs').insert({
            recipient: emailLog.recipient,
            sender: emailLog.sender,
            subject: emailLog.subject,
            category: emailLog.category,
            status: emailLog.status,
            response_code: emailLog.responseCode,
            parameters: emailLog.parameters,
            smtp_config: emailLog.smtpConfig,
            html: emailLog.html
          });
        } catch (err) {
          console.error('Lỗi khi lưu log email vào DB:', err);
        }
      }

      return apiResponse({
        success: true,
        message: 'Liên kết đặt lại mật khẩu đã được gửi thành công!'
      }, 'success', '', 200, request);

    } catch (sendErr: any) {
      console.error("[SMTP ERROR] Failed to send forgot password email:", sendErr);

      const emailLog = {
        id: 'mail_' + Math.floor(Math.random() * 100000000),
        time: new Date().toISOString(),
        recipient: email,
        sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
        subject: `Khôi phục mật khẩu tài khoản ${siteName}`,
        category: 'Auth Reset',
        status: 'failed',
        responseCode: sendErr.message || 'Lỗi kết nối SMTP server',
        parameters: {
          name: name || `Thành viên ${siteName}`,
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

      const providerType = import.meta.env.PUBLIC_DATA_PROVIDER || 'local';
      if (providerType === 'supabase') {
        try {
          await supabase.from('txa_email_logs').insert({
            recipient: emailLog.recipient,
            sender: emailLog.sender,
            subject: emailLog.subject,
            category: emailLog.category,
            status: emailLog.status,
            response_code: emailLog.responseCode,
            parameters: emailLog.parameters,
            smtp_config: emailLog.smtpConfig,
            html: emailLog.html
          });
        } catch (err) {
          console.error('Lỗi khi lưu log email vào DB:', err);
        }
      }

      return apiResponse({
        success: false,
        message: `Gửi mail khôi phục thất bại: ${sendErr.message}`
      }, 'error', `Gửi mail khôi phục thất bại: ${sendErr.message}`, 400, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
