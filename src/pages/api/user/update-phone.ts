import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

import { sanitizeVNPhone } from '@lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const authUser = await verifyUserFromRequest(request, cookies);
    if (!authUser) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để thực hiện thao tác!', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { phone } = body;
    if (!phone) {
      return apiResponse(null, 'error', 'Vui lòng nhập số điện thoại!', 400, request);
    }

    // Format & Validate Phone
    const formattedPhone = sanitizeVNPhone(phone);

    if (!formattedPhone) {
      return apiResponse(null, 'error', 'Số điện thoại không hợp lệ! Vui lòng nhập đúng 9 chữ số thuộc các đầu số nhà mạng (+84)', 400, request);
    }

    // Check if phone number is already registered by another user
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', formattedPhone)
      .neq('id', authUser.id)
      .maybeSingle();

    if (checkErr) {
      throw checkErr;
    }

    if (existingUser) {
      return apiResponse(null, 'error', 'Số điện thoại này đã được tài khoản khác sử dụng!', 400, request);
    }

    // Update phone in database
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        phone: formattedPhone,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.id);

    if (updateErr) {
      throw updateErr;
    }

    return apiResponse({ phone: formattedPhone }, 'success', 'Cập nhật số điện thoại thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống!', 500, request);
  }
};
