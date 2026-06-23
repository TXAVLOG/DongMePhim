import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

// GET: Lấy lịch sử xem của người dùng từ Supabase
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    if (!username) {
      return apiResponse([], 'success', '', 200, request);
    }

    // 1. Lấy user_id từ username/email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (userError || !user) {
      return apiResponse([], 'success', '', 200, request);
    }

    // 2. Query lịch sử và join bảng movies
    const { data, error } = await supabase
      .from('watch_history')
      .select(`
        episode_name,
        episode_slug,
        current_time,
        duration,
        server_index,
        updated_at,
        movies (
          title,
          slug,
          poster_url
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const history = (data || [])
      .filter((item: any) => item.movies)
      .map((item: any) => ({
        slug: item.movies.slug,
        episodeSlug: item.episode_slug,
        episodeName: item.episode_name,
        currentTime: item.current_time,
        duration: item.duration,
        serverIndex: item.server_index,
        updatedAt: item.updated_at,
        title: item.movies.title,
        posterUrl: item.movies.poster_url,
        synced: true
      }));

    return apiResponse(history, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu hoặc cập nhật lịch sử xem vào Supabase
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { username, slug, episodeSlug, episodeName, currentTime, duration, serverIndex, serverName, updatedAt } = body;

    if (!username || !slug || !episodeSlug) {
      return apiResponse(null, 'error', 'Missing username, slug or episodeSlug', 400, request);
    }

    // 1. Lấy user_id từ username/email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (userError || !user) {
      return apiResponse(null, 'error', 'User not found', 404, request);
    }

    // 2. Lấy movie_id từ slug
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    // 3. Upsert vào bảng watch_history
    const { error: upsertError } = await supabase
      .from('watch_history')
      .upsert({
        user_id: user.id,
        movie_id: movie.id,
        episode_name: episodeName || '',
        episode_slug: episodeSlug,
        current_time: parseFloat(currentTime) || 0,
        duration: parseFloat(duration) || 0,
        server_index: parseInt(serverIndex) || 0,
        updated_at: updatedAt || new Date().toISOString()
      }, { onConflict: 'user_id,movie_id' });

    if (upsertError) throw upsertError;

    return apiResponse({ success: true }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// DELETE: Xóa lịch sử xem
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username');
    const slug = url.searchParams.get('slug');

    if (!username) {
      return apiResponse(null, 'error', 'Missing username', 400, request);
    }

    // Lấy user_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (!user) {
      return apiResponse(null, 'error', 'User not found', 404, request);
    }

    if (slug) {
      // Lấy movie_id
      const { data: movie } = await supabase
        .from('movies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (movie) {
        const { error } = await supabase
          .from('watch_history')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', movie.id);
        if (error) throw error;
      }
      return apiResponse({ success: true, message: `Deleted history for slug ${slug}` }, 'success', '', 200, request);
    } else {
      // Xóa toàn bộ
      const { error } = await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      return apiResponse({ success: true, message: 'Cleared all history' }, 'success', '', 200, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
