import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { MovieService } from '@services/MovieService';
import { SettingService } from '@services/SettingService';

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
      // Clear cache để luôn lấy data mới nhất cho admin
      MovieService.clearCache();
      const movie = await MovieService.getMovieBySlug(slug);
      if (!movie) {
        return apiResponse(null, 'error', 'Không tìm thấy phim!', 404, request);
      }
      return apiResponse(movie, 'success', 'Lấy thông tin phim thành công!', 200, request);
    }

    if (action === 'list') {
      MovieService.clearCache();
      const movies = await MovieService.getMovies();
      return apiResponse(movies, 'success', 'Lấy danh sách phim thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
};

async function fetchActorFromTMDB(actorName: string) {
  try {
    const settings = await SettingService.getSettings();
    const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';
    // 1. Search for person on TMDB
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(actorName)}&language=vi-VN`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const searchData = await res.json() as any;
    const bestMatch = searchData.results?.[0];
    if (!bestMatch) return null;

    // 2. Fetch detailed person info for bio
    const detailUrl = `https://api.themoviedb.org/3/person/${bestMatch.id}?api_key=${apiKey}&language=vi-VN`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) return null;
    let detailData = await detailRes.json() as any;

    // Fallback to English bio if Vietnamese bio is empty
    if (!detailData.biography) {
      const enDetailUrl = `https://api.themoviedb.org/3/person/${bestMatch.id}?api_key=${apiKey}&language=en-US`;
      const enRes = await fetch(enDetailUrl);
      if (enRes.ok) {
        const enData = await enRes.json() as any;
        if (enData.biography) {
          detailData = enData;
        }
      }
    }

    const avatarUrl = bestMatch.profile_path ? `https://image.tmdb.org/t/p/h632${bestMatch.profile_path}` : '';
    const bio = detailData.biography || '';

    return {
      avatarUrl,
      bio,
      tmdbId: bestMatch.id
    };
  } catch (e) {
    console.error(`Lỗi khi lấy thông tin diễn viên ${actorName} từ TMDB:`, e);
    return null;
  }
}

async function fetchActorFromWikipedia(actorName: string) {
  try {
    const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(actorName)}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json() as any;
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return null;

    const title = firstResult.title;
    const detailUrl = `https://vi.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=original&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json() as any;
    const pages = detailData.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    if (!page) return null;

    return {
      avatarUrl: page.original?.source || '',
      bio: page.extract || ''
    };
  } catch (e) {
    console.error(`Lỗi khi lấy thông tin diễn viên ${actorName} từ Wikipedia:`, e);
    return null;
  }
}

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

      // Preserve existing views if not explicitly provided (avoid reset to 0 on every save)
      let existingViews = 0;
      try {
        const { data: existing } = await supabase
          .from('movies')
          .select('views')
          .eq('slug', movieSlug)
          .maybeSingle();
        if (existing && typeof existing.views === 'number') {
          existingViews = existing.views;
        }
      } catch (_) {}

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
        views: Number(m.views) || Number(m.view) || existingViews || 0,
        country: m.country || m.country_name || m.category || m.broadcast_at || 'Khác',
        genres: Array.isArray(m.genres) ? m.genres : [],
        actors: Array.isArray(m.actors) ? m.actors : (Array.isArray(m.actor) ? m.actor : []),
        directors: Array.isArray(m.directors) ? m.directors : (Array.isArray(m.director) ? m.director : []),
        episodes: episodes,
        seasons: m.seasons || (m.type === 'movie' || m.type === 'single' ? 'Bản Điện Ảnh' : 'Phần 1'),
        trailer_url: m.trailerUrl || m.trailer_url || '',
        broadcast_schedule: m.broadcastSchedule || null,
        source: m.source || 'manual',
        updated_at: new Date().toISOString()
      };

      const { data: savedMovie, error } = await supabase
        .from('movies')
        .upsert(moviePayload, { onConflict: 'slug' })
        .select('id')
        .single();

      if (error) {
        console.error('Lỗi khi lưu phim vào Supabase:', error);
        return apiResponse(null, 'error', `Lỗi database: ${error.message}`, 500, request);
      }

      // Xử lý và lưu diễn viên để tránh trùng lặp
      const rawActors = Array.isArray(m.actors) ? m.actors : (Array.isArray(m.actor) ? m.actor : []);
      const validActors = rawActors
        .map((a: any) => typeof a === 'string' ? a.trim() : (a && a.name ? a.name.trim() : ''))
        .filter((name: string) => name && name.toLowerCase() !== 'đang cập nhật');

      if (savedMovie && validActors.length > 0) {
        const movieId = savedMovie.id;
        // Take top 6 actors to keep worker CPU execution ultra light & fast
        const topActors = validActors.slice(0, 6);
        const actorSlugs = topActors.map((a: string) => slugify(a));

        // 1. Quét các diễn viên đã tồn tại trong DB để tránh gọi trùng lặp TMDB API
        const { data: existingActors } = await supabase
          .from('actors')
          .select('slug, tmdb_id, avatar_url, bio')
          .in('slug', actorSlugs);

        const existingMap = new Map(
          (existingActors || []).map((a: any) => [a.slug, a])
        );

        // 2. Chuẩn bị payloads diễn viên (chỉ cào TMDB cho những ai chưa có metadata hoàn chỉnh)
        const actorPayloads = [];
        const settings = await SettingService.getSettings();
        const hasKey = !!(settings.general as any).tmdb_api_key;

        for (const actorName of topActors) {
          const slug = slugify(actorName);
          const existing = existingMap.get(slug);

          if (existing && existing.tmdb_id && existing.bio && existing.bio !== 'Thông tin về nghệ sĩ này đang được cập nhật.') {
            actorPayloads.push({
              name: actorName,
              slug: slug,
              avatar_url: existing.avatar_url,
              bio: existing.bio,
              tmdb_id: existing.tmdb_id
            });
            continue;
          }

          let tmdbInfo = null;
          if (hasKey) {
            tmdbInfo = await fetchActorFromTMDB(actorName);
          }

          // Fallback: tìm trên Wikipedia nếu TMDB không có
          let wikiInfo = null;
          if (!tmdbInfo) {
            wikiInfo = await fetchActorFromWikipedia(actorName);
          }

          actorPayloads.push({
            name: actorName,
            slug: slug,
            avatar_url: tmdbInfo?.avatarUrl || wikiInfo?.avatarUrl || existing?.avatar_url || '',
            bio: tmdbInfo?.bio || wikiInfo?.bio || existing?.bio || 'Thông tin về nghệ sĩ này đang được cập nhật.',
            tmdb_id: tmdbInfo?.tmdbId || existing?.tmdb_id || null
          });
        }

        // Batch upsert actors in 1 fast DB operation (no ignoreDuplicates so we update placeholder actors with TMDB data)
        await supabase
          .from('actors')
          .upsert(actorPayloads, { onConflict: 'slug' });

        // Retrieve actor IDs for mapping
        const { data: dbActors } = await supabase
          .from('actors')
          .select('id, slug')
          .in('slug', actorSlugs);

        if (dbActors && dbActors.length > 0) {
          const actorIds = dbActors.map((a: any) => a.id);
          await supabase
            .from('movie_actors')
            .delete()
            .eq('movie_id', movieId);

          const mappings = actorIds.map((aId: string) => ({
            movie_id: movieId,
            actor_id: aId,
            role_name: 'Diễn viên'
          }));
          
          await supabase
            .from('movie_actors')
            .insert(mappings);
        }
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
