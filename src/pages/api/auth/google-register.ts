import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { createSession } from '@lib/auth';
import { SettingService } from '@services/SettingService';
import { encryptPassword } from '@lib/passwordCrypto';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { credential, accessToken, gender, province, ward } = body;

    if (!credential && !accessToken) {
      return apiResponse(null, 'error', 'Thiếu credential hoặc accessToken từ Google', 400, request);
    }
    if (!gender || !province || !ward) {
      return apiResponse(null, 'error', 'Vui lòng điền đầy đủ thông tin giới tính và địa chỉ!', 400, request);
    }

    let email = '';
    let name = '';
    let picture = '';
    let sub = '';

    if (credential) {
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return apiResponse(null, 'error', 'Định dạng token không đúng', 400, request);
      }

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      let payloadDecoded = '';
      try {
        payloadDecoded = decodeURIComponent(
          atob(payloadBase64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } catch (e) {
        try {
          payloadDecoded = atob(payloadBase64);
        } catch (err) {
          return apiResponse(null, 'error', 'Không thể giải mã dữ liệu token', 400, request);
        }
      }
      
      let decodedUser;
      try {
        decodedUser = JSON.parse(payloadDecoded);
      } catch (e) {
        return apiResponse(null, 'error', 'Không thể giải mã dữ liệu token', 400, request);
      }

      email = decodedUser.email || '';
      name = decodedUser.name || '';
      picture = decodedUser.picture || '';
      sub = decodedUser.sub || '';
    } else if (accessToken) {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        return apiResponse(null, 'error', 'Không thể xác thực accessToken với Google', 400, request);
      }
      const profile = await res.json() as any;
      email = profile.email || '';
      name = profile.name || '';
      picture = profile.picture || '';
      sub = profile.sub || '';
    }

    if (!email) {
      return apiResponse(null, 'error', 'Không tìm thấy địa chỉ email trong tài khoản Google', 400, request);
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingUser) {
      return apiResponse(null, 'error', 'Tài khoản với địa chỉ email này đã tồn tại!', 400, request);
    }

    // Insert user into Supabase
    const settings = await SettingService.getSettings();
    const secretKey = settings.encryption?.secret_key || '';
    const randomPassword = Math.random().toString(36).substring(2, 10);
    const securePassword = secretKey ? await encryptPassword(randomPassword, secretKey) : randomPassword;

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username: email,
        email: email,
        password: securePassword,
        role: 'user',
        name: name,
        avatar_url: picture,
        gender: gender,
        province: province,
        ward: ward,
        package: 'free',
        status: 'active',
        email_verified: true,
        join_date: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Create session
    await createSession(newUser.id, request, cookies);

    return apiResponse({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar_url: newUser.avatar_url,
        gender: newUser.gender,
        province: newUser.province,
        ward: newUser.ward
      }
    }, 'success', 'Đăng ký tài khoản Google thành công', 200, request);

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
