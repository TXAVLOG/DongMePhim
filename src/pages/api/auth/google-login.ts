import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { createSession } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as any;
    const credential = body?.credential;
    const accessToken = body?.accessToken;

    if (!credential && !accessToken) {
      return apiResponse(null, 'error', 'Thiếu credential hoặc accessToken từ Google', 400, request);
    }

    let email = '';
    let name = '';
    let picture = '';
    let sub = '';

    if (credential) {
      // Decode Google JWT
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
      // Fetch profile using accessToken
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

    // Check if user exists in database
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (dbError) {
      return apiResponse(null, 'error', 'Lỗi truy vấn cơ sở dữ liệu: ' + dbError.message, 500, request);
    }

    if (user) {
      if (user.status === 'suspended') {
        return apiResponse(null, 'error', 'Tài khoản của bạn đã bị khóa!', 400, request);
      }

      // Create session
      const sessionToken = await createSession(user.id, request, cookies);

      return apiResponse({
        success: true,
        exists: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
          avatar: user.avatar_url || '',
          gender: user.gender,
          province: user.province,
          ward: user.ward,
          phone: user.phone
        },
        token: sessionToken || "txa_session",
        access_token: sessionToken || "txa_session",
        token_type: "Bearer"
      }, 'success', '', 200, request);
    } else {
      return apiResponse({
        success: true,
        exists: false,
        googleProfile: {
          email: email,
          name: name,
          picture: picture,
          sub: sub
        }
      }, 'success', '', 200, request);
    }

  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
