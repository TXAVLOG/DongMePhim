import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifySession, SESSION_COOKIE_NAME } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return apiResponse(null, 'error', 'Không tìm thấy session token!', 400, request);
    }

    // 1. Verify the session
    const currentUser = await verifySession(request, cookies);
    let adminIdToRestore = currentUser?.adminId;

    // 2. If verifySession didn't find adminId, fallback to querying txa_user_sessions directly
    if (!adminIdToRestore) {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('txa_user_sessions')
        .select('admin_id')
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (sessionErr) {
        return apiResponse(null, 'error', `Lỗi truy vấn phiên: ${sessionErr.message}`, 500, request);
      }

      if (!sessionData || !sessionData.admin_id) {
        return apiResponse(null, 'error', 'Bạn không ở trong phiên giả lập hoặc cột admin_id không tồn tại trong DB!', 400, request);
      }

      adminIdToRestore = sessionData.admin_id;
    }

    // 3. Restore the session to the original admin user ID
    const { error: updateError } = await supabase
      .from('txa_user_sessions')
      .update({
        user_id: adminIdToRestore,
        admin_id: null
      })
      .eq('session_token', sessionToken);

    if (updateError) {
      return apiResponse(null, 'error', `Lỗi khi khôi phục DB: ${updateError.message}`, 500, request);
    }

    return apiResponse({ success: true }, 'success', 'Quay lại quyền Admin thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

