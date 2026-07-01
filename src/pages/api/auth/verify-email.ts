import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { SettingService } from '@services/SettingService';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response('<h1>Yêu cầu không hợp lệ!</h1><p>Thiếu token xác minh.</p>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 400
      });
    }

    const now = new Date().toISOString();

    // Tìm user khớp với token và còn hạn
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('verification_code', token)
      .gt('verification_expires_at', now)
      .maybeSingle();

    if (error || !user) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Xác minh thất bại</title>
          <style>
            body { background: #09090b; color: #f4f4f5; font-family: sans-serif; text-align: center; padding: 50px 20px; }
            .card { max-width: 500px; margin: 0 auto; background: #121214; border: 1px solid #1f1f23; border-radius: 20px; padding: 40px; }
            h1 { color: #f87171; }
            a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Xác minh thất bại</h1>
            <p>Liên kết xác minh không hợp lệ hoặc đã hết hạn sử dụng. Vui lòng đăng ký lại hoặc yêu cầu gửi lại mã mới.</p>
            <a href="/">Quay về Trang chủ</a>
          </div>
        </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 400
        }
      );
    }

    // Kích hoạt tài khoản
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_code: null,
        verification_expires_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Xác minh thành công</title>
        <style>
          body { background: #09090b; color: #f4f4f5; font-family: sans-serif; text-align: center; padding: 50px 20px; }
          .card { max-width: 500px; margin: 0 auto; background: #121214; border: 1px solid #1f1f23; border-radius: 20px; padding: 40px; }
          h1 { color: #4ade80; }
          a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; }
        </style>
        <script>
          setTimeout(function() {
            window.location.href = '/?verified=true';
          }, 3000);
        </script>
      </head>
      <body>
        <div class="card">
          <h1>✅ Xác minh thành công</h1>
          <p>Tài khoản của bạn đã được kích hoạt thành công! Bạn đang được tự động chuyển hướng về trang chủ...</p>
          <a href="/?verified=true">Đi tới Đăng nhập ngay</a>
        </div>
      </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 200
      }
    );

  } catch (err: any) {
    return new Response(`<h1>Lỗi máy chủ</h1><p>${err.message}</p>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { email, code } = body;
    if (!email || !code) {
      return apiResponse(null, 'error', 'Thiếu thông tin email hoặc mã xác minh!', 400, request);
    }

    const now = new Date().toISOString();

    // Tìm user khớp với email và verification_code và còn hạn
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('verification_code', code)
      .gt('verification_expires_at', now)
      .maybeSingle();

    if (error || !user) {
      return apiResponse(null, 'error', 'Mã xác minh (OTP) không hợp lệ hoặc đã hết hạn!', 400, request);
    }

    // Kích hoạt tài khoản
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        verification_code: null,
        verification_expires_at: null
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return apiResponse({ success: true, message: 'Xác minh email thành công! Bây giờ bạn đã có thể đăng nhập.' }, 'success', '', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
