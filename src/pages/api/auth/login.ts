import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { supabase } from '@lib/supabase';
import { createSession } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const identity = body.identity || body.login;
    const { password } = body;
    if (!identity || !password) {
      return apiResponse(null, 'error', 'Thiếu thông tin đăng nhập!', 400, request);
    }

    // Detect mobile client
    const appHeader = request.headers.get('x-txc-client') || request.headers.get('X-TXC-Client');
    const appKeyHeader = request.headers.get('x-txa-api-key') || request.headers.get('X-TXA-API-KEY');
    const userAgent = request.headers.get('user-agent') || '';
    const isMobileClient = appHeader === 'TPhimX-App' || appKeyHeader === 'tphimx-mobile-2026-secure' || userAgent.startsWith('TPhimX-App');

    const settings = await SettingService.getSettings();
    if (!isMobileClient && settings.login?.turnstile_enable) {
      const turnstileToken = body.turnstileToken;
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

    // Query Supabase to find user by username or email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${identity},email.eq.${identity}`)
      .maybeSingle();

    if (error) {
      return apiResponse(null, 'error', 'Lỗi truy vấn cơ sở dữ liệu!', 500, request);
    }

    if (!user) {
      return apiResponse({ errorType: 'identity', error_code: 'USER_NOT_FOUND' }, 'error', 'Tài khoản không tồn tại!', 400, request);
    }

    if (user.password !== password) {
      return apiResponse({ errorType: 'password', error_code: 'INVALID_PASSWORD' }, 'error', 'Mật khẩu không chính xác!', 400, request);
    }

    if (settings.user?.require_email_verification && !user.email_verified) {
      return apiResponse({ errorType: 'verification', error_code: 'EMAIL_NOT_VERIFIED', email: user.email, method: settings.user?.verification_method || 'link' }, 'error', 'Tài khoản chưa được xác minh email! Vui lòng kích hoạt tài khoản để đăng nhập.', 400, request);
    }

    // Create secure session cookie and get token
    const sessionToken = await createSession(user.id, request, cookies);

    return apiResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        gender: user.gender,
        province: user.province,
        ward: user.ward
      },
      token: sessionToken || "txa_session",
      access_token: sessionToken || "txa_session",
      token_type: "Bearer",
      expires_in: 31536000
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
