import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { SettingService } from '../../../services/SettingService';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const settings = await SettingService.getSettings();
    if (settings.login?.turnstile_enable) {
      const turnstileToken = body.turnstileToken;
      const secretKey = settings.login?.turnstile_secret_key;

      if (!turnstileToken || !secretKey) {
        return apiResponse(null, 'error', 'Vui lòng hoàn thành xác thực Captcha!', 400);
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
        return apiResponse(null, 'error', 'Mã Captcha không hợp lệ hoặc đã hết hạn!', 400);
      }
    }

    return apiResponse({ success: true, message: "Đăng ký thành công" });
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500);
  }
};
