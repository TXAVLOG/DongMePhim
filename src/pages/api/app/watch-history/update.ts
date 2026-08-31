import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để lưu lịch sử xem!', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { movie_id, episode_id, current_time, duration, server_index } = body;
    if (!movie_id || !episode_id) {
      return apiResponse(null, 'error', 'Thiếu thông tin movie_id hoặc episode_id!', 400, request);
    }

    // 1. Find movie UUID from movie_id_seq or id
    const movieSeqId = parseInt(movie_id, 10);
    let movieQuery = supabase.from('movies').select('id, title, episodes');
    if (!isNaN(movieSeqId)) {
      movieQuery = movieQuery.eq('movie_id_seq', movieSeqId);
    } else {
      movieQuery = movieQuery.eq('id', movie_id);
    }

    const { data: movie, error: movieError } = await movieQuery.maybeSingle();
    if (movieError) {
      throw movieError;
    }

    if (!movie) {
      return apiResponse(null, 'error', 'Không tìm thấy phim tương ứng!', 404, request);
    }

    // 2. Resolve episode name from movie episodes list
    let episodeName = episode_id;
    const episodesList = movie.episodes || [];
    for (const server of episodesList) {
      const srvData = server.serverData || server.server_data || [];
      const found = srvData.find((e: any) => e.slug === episode_id);
      if (found) {
        episodeName = found.name || episode_id;
        break;
      }
    }

    // 3. Check if watch history record already exists
    const { data: existing, error: checkError } = await supabase
      .from('watch_history')
      .select('id, current_time')
      .eq('user_id', user.id)
      .eq('movie_id', movie.id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    const oldTime = existing?.current_time || 0;
    const newTime = parseFloat(current_time) || 0;
    const timeWatched = newTime - oldTime;

    let watchTimeAdded = 0;
    if (timeWatched > 0 && timeWatched <= 300) {
      const { TxaActivityCalculator } = await import('@services/TxaActivityCalculator');
      watchTimeAdded = Math.round(timeWatched);
      await TxaActivityCalculator.incrementWatchTime(user.id, watchTimeAdded);
    }

    const nowStr = new Date().toISOString();
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('watch_history')
        .update({
          episode_name: episodeName,
          episode_slug: episode_id,
          current_time: newTime,
          duration: parseFloat(duration) || 0,
          server_index: parseInt(server_index, 10) || 0,
          updated_at: nowStr
        })
        .eq('id', existing.id);
      
      if (updateError) throw updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('watch_history')
        .insert({
          user_id: user.id,
          movie_id: movie.id,
          episode_name: episodeName,
          episode_slug: episode_id,
          current_time: newTime,
          duration: parseFloat(duration) || 0,
          server_index: parseInt(server_index, 10) || 0,
          updated_at: nowStr
        });
      
      if (insertError) throw insertError;
    }

    return apiResponse({
      success: true,
      watch_time_added: watchTimeAdded,
      old_time: oldTime,
      new_time: newTime,
      current_time: newTime,
      duration: parseFloat(duration) || 0,
      movie_title: movie.title,
      episode_name: episodeName
    }, 'success', `Đã lưu tiến độ xem (Cộng dồn +${watchTimeAdded}s từ ${Math.round(oldTime)}s lên ${Math.round(newTime)}s)`, 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
