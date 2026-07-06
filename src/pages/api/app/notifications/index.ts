import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để xem thông báo!', 401, request);
    }

    const { data: list, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const mapped = (list || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      image_url: n.image_url || "",
      is_read: n.is_read || false,
      created_at: n.created_at,
      movie_slug: n.movie_slug || "",
      episode_name: n.episode_name || ""
    }));

    return apiResponse(mapped, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
