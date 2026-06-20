import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';
import { MovieService } from '../../../services/MovieService';

// GET: Lấy chi tiết phim qua MovieService (tự động fallback DB/Seed/API)
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const action = url.searchParams.get('action');

    if (action === 'get') {
      if (!slug) {
        return apiResponse(null, 'error', 'Thiếu slug phim!', 400, request);
      }
      const movie = await MovieService.getMovieBySlug(slug);
      if (!movie) {
        return apiResponse(null, 'error', 'Không tìm thấy phim!', 404, request);
      }
      return apiResponse(movie, 'success', 'Lấy thông tin phim thành công!', 200, request);
    }

    if (action === 'list') {
      const movies = await MovieService.getMovies();
      return apiResponse(movies, 'success', 'Lấy danh sách phim thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu hoặc Xóa phim trên database Supabase
export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, slug, movieData, isStatic } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    // 1. Thao tác Lưu phim (Thêm mới / Cập nhật)
    if (action === 'save') {
      if (!movieData) {
        return apiResponse(null, 'error', 'Thiếu dữ liệu phim (movieData)!', 400, request);
      }

      const m = movieData.movie || movieData;
      const episodes = movieData.episodes || [];
      const movieSlug = m.slug || slug;

      if (!movieSlug) {
        return apiResponse(null, 'error', 'Thiếu slug của phim!', 400, request);
      }

      // Map trường chuẩn sang cột database
      const moviePayload = {
        title: m.title || m.name || '',
        original_title: m.originalTitle || m.original_name || m.original_title || '',
        slug: movieSlug,
        description: m.description || m.content || '',
        poster_url: m.posterUrl || m.poster_url || '',
        banner_url: m.bannerUrl || m.banner_url || m.thumb_url || '',
        release_year: Number(m.releaseYear || m.release_year || m.year) || 2024,
        duration_minutes: m.durationMinutes || m.duration_minutes || m.time || '',
        type: m.type || 'series',
        status: m.status || 'ongoing',
        episode_current: m.episodeCurrent || m.episode_current || '1',
        episode_total: m.episodeTotal || m.episode_total || '1',
        quality: m.quality || 'FHD',
        lang: m.lang || 'Vietsub',
        imdb_score: Number(m.imdbScore || m.imdb_score) || 8.0,
        broadcast_at: m.category || m.broadcast_at || 'Khác',
        genres: Array.isArray(m.genres) ? m.genres : [],
        actors: Array.isArray(m.actors) ? m.actors : (Array.isArray(m.actor) ? m.actor : []),
        directors: Array.isArray(m.directors) ? m.directors : (Array.isArray(m.director) ? m.director : []),
        episodes: episodes,
        seasons: m.seasons || (m.type === 'movie' || m.type === 'single' ? 'Bản Điện Ảnh' : 'Phần 1'),
        trailer_url: m.trailerUrl || m.trailer_url || '',
        broadcast_schedule: m.broadcastSchedule || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('movies')
        .upsert(moviePayload, { onConflict: 'slug' });

      if (error) {
        console.error('Lỗi khi lưu phim vào Supabase:', error);
        return apiResponse(null, 'error', `Lỗi database: ${error.message}`, 500, request);
      }

      // Nếu lưu đè phim hệ thống, đảm bảo xóa khỏi bảng txa_deleted_movies nếu lỡ đã bị xóa trước đó
      await supabase
        .from('txa_deleted_movies')
        .delete()
        .eq('slug', movieSlug);

      MovieService.clearCache();
      return apiResponse({ success: true }, 'success', 'Lưu dữ liệu phim thành công!', 200, request);
    }

    // 2. Thao tác Xóa phim (Hỗ trợ cả đơn lẻ và hàng loạt)
    if (action === 'delete') {
      const items = body.items || [];
      if (items.length === 0) {
        const targetSlug = slug || movieData?.slug;
        if (targetSlug) {
          items.push({ slug: targetSlug, isStatic: isStatic === true || isStatic === 'true' });
        }
      }

      if (items.length === 0) {
        return apiResponse(null, 'error', 'Thiếu thông tin phim cần xóa!', 400, request);
      }

      // Nhóm phim hệ thống và phim crawled
      const staticSlugs = items.filter((x: any) => x.isStatic).map((x: any) => x.slug);
      const crawledSlugs = items.filter((x: any) => !x.isStatic).map((x: any) => x.slug);

      if (staticSlugs.length > 0) {
        const deletePayloads = staticSlugs.map((s: string) => ({ slug: s }));
        const { error } = await supabase
          .from('txa_deleted_movies')
          .upsert(deletePayloads, { onConflict: 'slug' });
        
        if (error) {
          console.error('Lỗi khi lưu slugs phim hệ thống đã xóa:', error);
          return apiResponse(null, 'error', `Lỗi soft delete: ${error.message}`, 500, request);
        }
      }

      if (crawledSlugs.length > 0) {
        const { error } = await supabase
          .from('movies')
          .delete()
          .in('slug', crawledSlugs);

        if (error) {
          console.error('Lỗi khi xóa phim khỏi Supabase:', error);
          return apiResponse(null, 'error', `Lỗi hard delete: ${error.message}`, 500, request);
        }
      }

      MovieService.clearCache();
      return apiResponse({ success: true }, 'success', 'Xóa phim thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
