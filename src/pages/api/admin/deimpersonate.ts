import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession, SESSION_COOKIE_NAME } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Verify the session
    const currentUser = await verifySession(request, cookies);
    
    if (!currentUser || !currentUser.adminId) {
      return apiResponse(null, 'error', 'Bạn không ở trong phiên giả lập!', 400, request);
    }

    // 2. Fetch the session token
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return apiResponse(null, 'error', 'Không tìm thấy session token!', 400, request);
    }

    // 3. Restore the session to the original admin user ID
    const originalAdminId = currentUser.adminId;

    const { error: updateError } = await supabase
      .from('txa_user_sessions')
      .update({
        user_id: originalAdminId,
        admin_id: null
      })
      .eq('session_token', sessionToken);

    if (updateError) {
      throw updateError;
    }

    return apiResponse({ success: true }, 'success', 'Quay lại quyền Admin thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
