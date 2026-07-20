import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { supabase } from '@lib/supabase';
import { getEmailTemplate } from '@templates/emails/emailReader';
import { SmtpClient } from '@lib/api/smtpClient';
import { encryptPassword } from '@lib/passwordCrypto';
import { getGravatarUrl } from '@lib/gravatar';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { username, email, password, gender, phone, turnstileToken } = body;
    if (!username || !email || !password || !phone) {
      return apiResponse(null, 'error', 'Vui lòng điền đầy đủ thông tin bắt buộc (bao gồm Số điện thoại)!', 400, request);
    }

    // Format & Validate Phone Number (+84 prefix, strip leading 0, 9 digits starting with 3,5,7,8,9)
    let rawDigits = String(phone).replace(/[^0-9]/g, '');
    if (rawDigits.startsWith('84')) {
      rawDigits = rawDigits.slice(2);
    }
    if (rawDigits.startsWith('0')) {
      rawDigits = rawDigits.replace(/^0+/, '');
    }
    const formattedPhone = `+84${rawDigits}`;
    const phoneRegex = /^\+84[35789]\d{8}$/;

    if (!phoneRegex.test(formattedPhone)) {
      return apiResponse(null, 'error', 'Số điện thoại không hợp lệ! Vui lòng nhập đúng 9 chữ số thuộc các đầu số nhà mạng (+84)', 400, request);
    }

    // Detect mobile client
    const appHeader = request.headers.get('x-txc-client') || request.headers.get('X-TXC-Client');
    const appKeyHeader = request.headers.get('x-txa-api-key') || request.headers.get('X-TXA-API-KEY');
    const userAgent = request.headers.get('user-agent') || '';
    const isMobileClient = appHeader === 'TPhimX-App' || appKeyHeader === 'tphimx-mobile-2026-secure' || userAgent.startsWith('TPhimX-App');

    const settings = await SettingService.getSettings();
    if (!isMobileClient && settings.login?.turnstile_enable) {
      const secretKey = settings.login?.turnstile_secret_key;

      if (!turnstileToken || !secretKey) {
        return apiResponse(null, 'error', 'Vui lòng hoàn thành xác thực Captcha!', 400, request);
      }

      // Verify Cloudflare Turnstile token
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

    // Check if user already exists (username, email, or phone)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username, email, phone')
      .or(`username.eq.${username},email.eq.${email},phone.eq.${formattedPhone}`)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingUser) {
      if (existingUser.username?.toLowerCase() === username.toLowerCase()) {
        return apiResponse(null, 'error', 'Tên tài khoản đã tồn tại!', 400, request);
      }
      if (existingUser.email?.toLowerCase() === email.toLowerCase()) {
        return apiResponse(null, 'error', 'Địa chỉ email đã được đăng ký!', 400, request);
      }
      if (existingUser.phone === formattedPhone) {
        return apiResponse(null, 'error', 'Số điện thoại này đã được sử dụng cho tài khoản khác!', 400, request);
      }
    }

    // Generate real Gravatar URL using SHA-256 (Web Crypto API, Gravatar supports this since 2024)
    const avatarUrl = await getGravatarUrl(email, 'identicon', 256);

    // Email verification config
    const requireVerification = settings.user?.require_email_verification ?? false;
    const verificationMethod = settings.user?.verification_method || 'link';
    const tokenExpiry = settings.user?.verification_token_expiry || 1800; // in seconds

    let verificationCode: string | null = null;
    let verificationExpiresAt: string | null = null;

    if (requireVerification) {
      if (verificationMethod === 'otp') {
        verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      } else {
        verificationCode = 'verify_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      verificationExpiresAt = new Date(Date.now() + tokenExpiry * 1000).toISOString();
    }

    // Insert user
    const secretKey = settings.encryption?.secret_key || '';
    const securePassword = secretKey ? await encryptPassword(password, secretKey) : password;

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        phone: formattedPhone,
        password: securePassword,
        role: 'user',
        name: username,
        avatar_url: avatarUrl,
        gender: gender || 'other',
        package: 'free',
        status: 'active',
        email_verified: !requireVerification,
        verification_code: verificationCode,
        verification_expires_at: verificationExpiresAt,
        join_date: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    if (requireVerification && verificationCode) {
      const isSmtpConfigured = !!(settings.smtp?.smtp_host && settings.smtp?.smtp_user && settings.smtp?.smtp_pass);
      if (isSmtpConfigured) {
        const year = new Date().getFullYear().toString();
        const siteUrl = settings.general.site_url || 'https://dongmephim.online';
        const siteName = settings.general.site_name || 'DongMePhim';
        
        let verificationContent = '';
        if (verificationMethod === 'otp') {
          const contentTemplate = getEmailTemplate('content-verify-otp.html');
          verificationContent = contentTemplate
            .replace(/{otp_code}/g, verificationCode)
            .replace(/{token_expiry}/g, Math.round(tokenExpiry / 60).toString())
            .replace(/{site_name}/g, siteName);
        } else {
          const verifyLink = `${siteUrl.replace(/\/$/, '')}/api/auth/verify-email?token=${verificationCode}`;
          const contentTemplate = getEmailTemplate('content-verify-link.html');
          verificationContent = contentTemplate
            .replace(/{verify_link}/g, verifyLink)
            .replace(/{token_expiry}/g, Math.round(tokenExpiry / 60).toString())
            .replace(/{site_name}/g, siteName);
        }

        const htmlTemplate = getEmailTemplate('verify-email.html');
        const compiledHtml = htmlTemplate
          .replace(/{name}/g, username)
          .replace(/{verification_content}/g, verificationContent)
          .replace(/{site_name}/g, siteName)
          .replace(/{site_url}/g, siteUrl.replace(/\/$/, ''))
          .replace(/{year}/g, year);

        // Gửi email
        let smtpErrorMsg = '';
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
            subject: `[Xác minh email] Kích hoạt tài khoản ${siteName}`,
            html: compiledHtml
          });
          
          // Ghi log
          try {
            await supabase.from('txa_email_logs').insert({
              recipient: email,
              sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
              subject: `[Xác minh email] Kích hoạt tài khoản ${siteName}`,
              category: 'Email Verification',
              status: 'success',
              response_code: sendResult.responseCode || '250 2.0.0 OK Message accepted',
              parameters: { username, email, method: verificationMethod },
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
          console.error("[SMTP ERROR] Failed to send verification email:", sendErr);
          smtpErrorMsg = sendErr.message || 'Lỗi kết nối SMTP server';
          try {
            await supabase.from('txa_email_logs').insert({
              recipient: email,
              sender: `${settings.smtp.smtp_from_name} <${settings.smtp.smtp_from_email}>`,
              subject: `[Xác minh email] Kích hoạt tài khoản ${siteName}`,
              category: 'Email Verification',
              status: 'failed',
              response_code: sendErr.message || 'Lỗi kết nối SMTP server',
              parameters: { username, email, method: verificationMethod },
              smtp_config: {
                host: settings.smtp.smtp_host,
                port: settings.smtp.smtp_port,
                secure: settings.smtp.smtp_secure,
                user: settings.smtp.smtp_user
              },
              html: compiledHtml
            });
          } catch (logErr) {}
        }

        if (smtpErrorMsg) {
          const friendlyMsg = getFriendlySmtpError(smtpErrorMsg);
          return apiResponse({
            success: false,
            smtpError: true,
            smtpMessage: smtpErrorMsg,
            email: email,
            method: verificationMethod,
            message: `Đăng ký thành công nhưng gửi email thất bại: ${friendlyMsg}`
          }, 'error', `Đăng ký thành công nhưng gửi email thất bại: ${friendlyMsg}`, 400, request);
        }
      }

      return apiResponse({
        success: true,
        requireVerification: true,
        method: verificationMethod,
        email: email,
        message: verificationMethod === 'otp'
          ? 'Đăng ký tài khoản thành công! Vui lòng nhập mã OTP đã được gửi tới email của bạn để xác minh.'
          : 'Đăng ký tài khoản thành công! Vui lòng nhấp vào liên kết xác minh đã được gửi tới email của bạn để kích hoạt.'
      }, 'success', '', 200, request, true);
    }

    return apiResponse({ success: true, requireVerification: false, message: "Đăng ký thành công" }, 'success', '', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

function getFriendlySmtpError(rawError: string): string {
  const err = rawError.toLowerCase();
  if (err.includes('badcredentials') || err.includes('535') || err.includes('authentication failed')) {
    return 'Sai thông tin đăng nhập SMTP (Mật khẩu ứng dụng)!';
  }
  if (err.includes('connection refused') || err.includes('connect check') || err.includes('etimedout') || err.includes('timeout')) {
    return 'Không kết nối được SMTP Server (Timeout/Refused)!';
  }
  if (err.includes('expected one of') || err.includes('smtp error')) {
    return 'Máy chủ SMTP từ chối gửi thư (Lỗi cấu hình/giao thức)!';
  }
  return rawError;
}
