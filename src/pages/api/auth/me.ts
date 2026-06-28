import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    let user = await verifyUserFromRequest(request, cookies);

    if (!user) {
      const username = url.searchParams.get('username');
      if (username) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.eq.${username},email.eq.${username}`)
          .maybeSingle();

        if (error) {
          throw error;
        }
        user = data;
      }
    }

    if (!user) {
      return apiResponse(null, 'error', 'Tài khoản không tồn tại hoặc phiên đăng nhập hết hạn!', 404, request);
    }

    return apiResponse({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      role: user.role || 'user',
      roles: user.role || 'users',
      avatar: user.avatar_url || '',
      gender: user.gender || '',
      province: user.province || '',
      ward: user.ward || '',
      package: user.package || 'free',
      status: user.status || 'active',
      emailVerified: user.email_verified !== false,
      expiryDate: user.expiry_date || '',
      joinDate: user.join_date || '',
      createdAt: user.created_at
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
