import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession, SESSION_COOKIE_NAME } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verify that the requester is currently an Admin
    const currentUser = await verifySession(request, cookies);
    
    // If they are already impersonating, check if the original user is admin
    const isAdmin = currentUser && (
      currentUser.role === 'admin' || 
      currentUser.roles === 'admin' ||
      (currentUser.adminId && true) // already impersonating
    );

    if (!isAdmin) {
      return apiResponse(null, 'error', 'Bạn không có quyền thực hiện hành động này!', 403, request);
    }

    // 2. Parse body parameters
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { targetUserId } = body;
    if (!targetUserId) {
      return apiResponse(null, 'error', 'Thiếu ID người dùng cần giả lập!', 400, request);
    }

    // 3. Find the target user in the database
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (findError || !targetUser) {
      return apiResponse(null, 'error', 'Người dùng mục tiêu không tồn tại!', 404, request);
    }

    // 4. Update the session record on database
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return apiResponse(null, 'error', 'Không tìm thấy session token!', 400, request);
    }

    // Determine the admin ID to save
    // If we're already impersonating, keep the original adminId. Otherwise, use currentUser.id
    const actualAdminId = currentUser.adminId || currentUser.id;

    const { error: updateError } = await supabase
      .from('txa_user_sessions')
      .update({
        user_id: targetUserId,
        admin_id: actualAdminId
      })
      .eq('session_token', sessionToken);

    if (updateError) {
      return apiResponse(null, 'error', `Lỗi DB khi cập nhật phiên giả lập: ${updateError.message}`, 500, request);
    }

    cookies.set('txa_gate_passed', 'true', { path: '/', maxAge: 604800, httpOnly: false });

    return apiResponse({ success: true }, 'success', 'Bắt đầu giả lập tài khoản thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
