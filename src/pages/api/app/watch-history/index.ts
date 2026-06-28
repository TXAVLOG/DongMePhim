import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để xem lịch sử xem!', 401, request);
    }

    const { data: historyItems, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    let mapped: any[] = [];
    if (historyItems && historyItems.length > 0) {
      const movieIds = historyItems.map((h: any) => h.movie_id);

      const { data: movies, error: movieError } = await supabase
        .from('movies')
        .select('id, title, slug, poster_url, banner_url, movie_id_seq')
        .in('id', movieIds);

      if (movieError) {
        throw movieError;
      }

      if (movies) {
        mapped = historyItems.map((h: any) => {
          const movie = movies.find((m: any) => m.id === h.movie_id);
          if (!movie) return null;
          return {
            movie_id: parseInt(movie.movie_id_seq, 10) || movie.id,
            movie_name: movie.title,
            movie_slug: movie.slug,
            movie_thumb: movie.banner_url || movie.poster_url || "",
            episode_id: h.episode_slug,
            episode_name: h.episode_name,
            current_time: h.current_time,
            duration: h.duration,
            server_index: h.server_index,
            updated_at: h.updated_at
          };
        }).filter(Boolean);
      }
    }

    return apiResponse(mapped, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
