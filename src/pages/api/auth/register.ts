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

    const { username, email, password, gender, turnstileToken } = body;
    if (!username || !email || !password) {
      return apiResponse(null, 'error', 'Vui lòng điền đầy đủ thông tin bắt buộc!', 400, request);
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

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username, email')
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingUser) {
      if (existingUser.username?.toLowerCase() === username.toLowerCase()) {
        return apiResponse(null, 'error', 'Tên tài khoản đã tồn tại!', 400, request);
      }
      return apiResponse(null, 'error', 'Địa chỉ email đã được đăng ký!', 400, request);
    }

    // MD5 implementation or simple random hash for Gravatar avatar
    const emailClean = email.trim().toLowerCase();
    let emailHash = '';
    // A simple hash function to generate MD5-like string
    let h = 0;
    for (let i = 0; i < emailClean.length; i++) {
      h = 31 * h + emailClean.charCodeAt(i);
      h = h & h; // Convert to 32bit integer
    }
    emailHash = Math.abs(h).toString(16).padStart(8, '0');

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
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password, // stored plain text to match original system
        role: 'user',
        name: username,
        avatar_url: `https://www.gravatar.com/avatar/${emailHash}?d=identicon`,
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
        try {
          await SmtpClient.sendMail({
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
              response_code: '250 2.0.0 OK Message accepted',
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
        } catch (sendErr) {
          console.error("[SMTP ERROR] Failed to send verification email:", sendErr);
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
