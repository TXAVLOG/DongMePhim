import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để thực hiện chức năng này!', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { slug, movie_id, id } = body;
    if (!slug && !movie_id && !id) {
      return apiResponse(null, 'error', 'Thiếu thông tin xác định phim (slug hoặc id)!', 400, request);
    }

    // 1. Find the movie
    let query = supabase.from('movies').select('id, slug, title');
    if (slug) {
      query = query.eq('slug', slug);
    } else if (movie_id) {
      const seqId = parseInt(movie_id, 10);
      if (!isNaN(seqId)) {
        query = query.eq('movie_id_seq', seqId);
      } else {
        query = query.eq('id', movie_id);
      }
    } else if (id) {
      const seqId = parseInt(id, 10);
      if (!isNaN(seqId)) {
        query = query.eq('movie_id_seq', seqId);
      } else {
        query = query.eq('id', id);
      }
    }

    const { data: movie, error: movieError } = await query.maybeSingle();
    if (movieError) {
      throw movieError;
    }

    if (!movie) {
      return apiResponse(null, 'error', 'Phim không tồn tại!', 404, request);
    }

    // 2. Check check favorites
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movie.id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let isFavorite = false;
    if (existing) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw deleteError;
      isFavorite = false;
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          movie_id: movie.id
        });
      if (insertError) throw insertError;
      isFavorite = true;
    }

    return apiResponse({
      success: true,
      is_favorite: isFavorite,
      message: isFavorite ? 'Đã thêm vào danh sách yêu thích' : 'Đã xóa khỏi danh sách yêu thích'
    }, 'success', '', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
