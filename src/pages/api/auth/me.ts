import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    if (!username) {
      return apiResponse(null, 'error', 'Thiếu tên tài khoản (username)!', 400, request);
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!user) {
      return apiResponse(null, 'error', 'Tài khoản không tồn tại!', 404, request);
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
      package: user.package || 'Free',
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
