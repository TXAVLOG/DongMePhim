import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để xem danh sách yêu thích!', 401, request);
    }

    const page = parseInt(url.searchParams.get('page') || '1', 10) || 1;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10) || 20;

    // Fetch user watch list IDs
    const { data: favs, error } = await supabase
      .from('watch_lists')
      .select('movie_id')
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    let mapped: any[] = [];
    let total = 0;
    let lastPage = 1;

    if (favs && favs.length > 0) {
      const movieIds = favs.map((f: any) => f.movie_id);
      
      const { data: movies, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .in('id', movieIds);

      if (movieError) {
        throw movieError;
      }

      if (movies) {
        total = movies.length;
        lastPage = Math.ceil(total / limit) || 1;
        const offset = (page - 1) * limit;
        const paginated = movies.slice(offset, offset + limit);

        mapped = paginated.map((m: any) => {
          const seqId = parseInt(m.movie_id_seq || m.id, 10) || m.id;
          return {
            id: seqId,
            name: m.title,
            origin_name: m.original_title || "",
            slug: m.slug,
            thumb_url: m.banner_url || m.poster_url || "",
            poster_url: m.poster_url || "",
            type: m.type || "movie",
            episode_current: m.episode_current || "",
            quality: m.quality || "FHD",
            lang: m.lang || "Vietsub",
            year: parseInt(m.release_year, 10) || 2026,
            time: m.duration_minutes || "",
            is_favorite: true
          };
        });
      }
    }

    const responsePayload = {
      data: mapped,
      pagination: {
        total,
        per_page: limit,
        current_page: page,
        last_page: lastPage
      }
    };

    return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
