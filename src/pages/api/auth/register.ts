import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { supabase } from '@lib/supabase';

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
        email_verified: true,
        join_date: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    return apiResponse({ success: true, message: "Đăng ký thành công" }, 'success', '', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
