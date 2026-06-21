import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { apiResponse } from '../../../lib/api/response';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return apiResponse(null, 'error', 'Missing user ID', 400, request);
  }

  try {
    const { data, error } = await supabase
      .from('watch_lists')
      .select('movie_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return apiResponse({ favorites: data }, 'success', 'Lấy danh sách yêu thích thành công', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Server error', 500, request);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: any = await request.json();
    const { userId, movieId, action } = body; // action: 'add' | 'remove'

    if (!userId || !movieId || !action) {
      return apiResponse(null, 'error', 'Missing parameters', 400, request);
    }

    if (action === 'add') {
      const { error } = await supabase
        .from('watch_lists')
        .upsert({ user_id: userId, movie_id: movieId, type: 'favorite' });
        
      if (error) throw error;
      return apiResponse(null, 'success', 'Đã thêm vào danh sách yêu thích', 200, request);
    } else if (action === 'remove') {
      const { error } = await supabase
        .from('watch_lists')
        .delete()
        .eq('user_id', userId)
        .eq('movie_id', movieId);
        
      if (error) throw error;
      return apiResponse(null, 'success', 'Đã xóa khỏi danh sách yêu thích', 200, request);
    } else {
      return apiResponse(null, 'error', 'Invalid action', 400, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Server error', 500, request);
  }
};
