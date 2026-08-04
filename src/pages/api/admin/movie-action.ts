import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { MovieService } from '@services/MovieService';
import { SettingService } from '@services/SettingService';
import { mergeMovieEpisodes } from '@services/providers/LocalMovieProvider';
import { enrichVsmovEpisodesWithSubtitles, crawlSubtitlesListFromVsmov } from '@lib/vsmov-subtitles';
import { sendEpisodeUpdateEmails } from '@lib/api/notificationHelper';

function normalizeNFC<T>(obj: T): T {
  if (typeof obj === 'string') {
    return obj.normalize('NFC') as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeNFC) as any;
  }
  if (obj !== null && typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = normalizeNFC((obj as any)[key]);
    }
    return res;
  }
  return obj;
}

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
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { action, slug, movieData, isStatic } = body;
    if (!action) {
      return apiResponse(null, 'error', 'Thiếu hành động (action)!', 400, request);
    }

    // 0. Cào phụ đề từ VSMOV (Trả về danh sách để copy-paste thủ công)
    if (action === 'enrich_subtitles') {
      const { vsmovUrl, movieSlug, movieTitle } = body;

      let vsmovSlug = (vsmovUrl || '').trim();
      if (vsmovSlug.includes('/phim/')) {
        vsmovSlug = vsmovSlug.split('/phim/')[1]?.split('?')[0]?.split('#')[0] || '';
      } else if (vsmovSlug.includes('/api/phim/')) {
        vsmovSlug = vsmovSlug.split('/api/phim/')[1]?.split('?')[0]?.split('#')[0] || '';
      }

      // Nếu không nhập link VSMOV, ưu tiên dùng movieSlug truyền lên
      if (!vsmovSlug && movieSlug) {
        vsmovSlug = movieSlug.trim();
      }

      const { success, subtitles, log } = await crawlSubtitlesListFromVsmov(vsmovSlug, movieTitle);

      if (!success) {
        return apiResponse({ log }, 'error', log.join('\n') || 'Không thể cào phụ đề VSMOV', 400, request);
      }

      return apiResponse({ subtitles, log }, 'success', 'Cào phụ đề thành công!', 200, request);
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

      // Preserve existing views and get previous episode current to detect updates
      let existingMovie: any = null;
      let existingViews = 0;
      let existingEpisodes: any[] = [];
      let existingSource = 'manual';
      try {
        const { data: existing } = await supabase
          .from('movies')
          .select('id, views, episode_current, title, episodes, source')
          .eq('slug', movieSlug)
          .maybeSingle();
        if (existing) {
          existingMovie = existing;
          if (typeof existing.views === 'number') {
            existingViews = existing.views;
          }
          if (Array.isArray(existing.episodes)) {
            existingEpisodes = existing.episodes;
          }
          if (existing.source) {
            existingSource = existing.source;
          }
        }
      } catch (_) {}

      // Check if source matches or is allowed to overwrite based on episode count
      const incomingSource = m.source || 'manual';
      if (existingMovie && existingSource !== incomingSource) {
        const apiSources = ['kkphim', 'vsmov', 'tmdb'];
        if (apiSources.includes(existingSource) && apiSources.includes(incomingSource)) {
          // Compare episode counts
          const getEpCount = (eps: any[]) => {
            let count = 0;
            if (Array.isArray(eps)) {
              eps.forEach((srv: any) => {
                const dataList = srv.serverData || srv.server_data || [];
                count += dataList.length;
              });
            }
            return count;
          };
          const existingEpCount = getEpCount(existingEpisodes);
          const incomingEpCount = getEpCount(episodes);

          if (incomingEpCount > existingEpCount) {
            console.log(`[Movie-Action] Ghi đè phim "${movieSlug}" từ nguồn "${existingSource}" (${existingEpCount} tập) sang nguồn "${incomingSource}" (${incomingEpCount} tập) do nguồn mới có nhiều tập hơn.`);
          } else {
            const msg = `Bỏ qua cào phim "${movieSlug}": Nguồn hiện tại "${existingSource}" (${existingEpCount} tập) có số tập nhiều hơn hoặc bằng nguồn mới "${incomingSource}" (${incomingEpCount} tập).`;
            console.log(`[Movie-Action] ${msg}`);
            return apiResponse(null, 'error', msg, 400, request);
          }
        }
      }

      const mergedEpisodes = (movieData.overwriteEpisodes === true || m.overwriteEpisodes === true)
        ? episodes
        : mergeMovieEpisodes(existingEpisodes, episodes);

      // Auto-fetch VSMOV subtitles if source is vsmov or episodes contain vsmov embed URLs
      let enrichedEpisodes = mergedEpisodes;
      const movieSource = m.source || '';
      const hasVsmovEmbeds = mergedEpisodes.some((srv: any) =>
        (srv.serverData || srv.server_data || []).some((ep: any) => {
          const embed = ep.linkEmbed || ep.link_embed || '';
          return embed.includes('streamvsmov.com') || embed.includes('vsmov.com');
        })
      );

      if (movieSource === 'vsmov' || hasVsmovEmbeds) {
        try {
          const { episodes: enrichedEps, subtitleLog } = await enrichVsmovEpisodesWithSubtitles(
            mergedEpisodes,
            movieSlug
          );
          enrichedEpisodes = enrichedEps;
          if (subtitleLog.length > 0) {
            console.log(`[Movie-Action] VSMOV subtitle enrichment for "${movieSlug}": ${subtitleLog.length} episodes processed`);
          }
        } catch (subErr: any) {
          console.error(`[Movie-Action] Error enriching VSMOV subtitles for "${movieSlug}":`, subErr.message);
        }
      }

      const hasVipServer = enrichedEpisodes.some((srv: any) => {
        const name = srv.serverName || srv.server_name || '';
        return name.toLowerCase().includes('vip');
      });
      const requireLoginVal = m.require_login === true || m.require_login === 'true' || hasVipServer;

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
        episodes: enrichedEpisodes,
        seasons: m.seasons || (m.type === 'movie' || m.type === 'single' ? 'Bản Điện Ảnh' : 'Phần 1'),
        trailer_url: m.trailerUrl || m.trailer_url || '',
        broadcast_schedule: m.broadcastSchedule || null,
        source: m.source || 'manual',
        source_url: m.sourceUrl || m.source_url || null,
        require_login: requireLoginVal,
        updated_at: new Date().toISOString()
      };

      let savedMovie = null;
      let error = null;

      const normalizedPayload = normalizeNFC(moviePayload);

      if (existingMovie && existingMovie.id) {
        const { data, error: updateErr } = await supabase
          .from('movies')
          .update(normalizedPayload)
          .eq('id', existingMovie.id)
          .select('id')
          .single();
        savedMovie = data;
        error = updateErr;
      } else {
        const { data, error: insertErr } = await supabase
          .from('movies')
          .insert(normalizedPayload)
          .select('id')
          .single();
        savedMovie = data;
        error = insertErr;
      }

      if (error) {
        console.error('Lỗi khi lưu phim vào Supabase:', error);
        return apiResponse(null, 'error', `Lỗi database: ${error.message}`, 500, request);
      }

      // Gửi thông báo email nếu phim có tập mới và SMTP được cấu hình
      const hasNewEpisode = existingMovie && 
        existingMovie.episode_current && 
        existingMovie.episode_current !== moviePayload.episode_current;

      if (hasNewEpisode && savedMovie) {
        const settings = await SettingService.getSettings();
        const localsAny = locals as any;
        const cfContext = localsAny?.cfContext || localsAny?.runtime?.ctx;
        if (cfContext?.waitUntil) {
          cfContext.waitUntil(
            sendEpisodeUpdateEmails(savedMovie.id, movieSlug, moviePayload, settings)
          );
        } else {
          sendEpisodeUpdateEmails(savedMovie.id, movieSlug, moviePayload, settings).catch(e => {
            console.error('Error sending episode updates in background:', e);
          });
        }
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

      MovieService.clearCache();
      return apiResponse({ success: true }, 'success', 'Lưu dữ liệu phim thành công!', 200, request);
    }

    // 2. Thao tác Xóa phim (Hỗ trợ cả đơn lẻ và hàng loạt) - Hard delete hoàn toàn
    if (action === 'delete') {
      const items = body.items || [];
      if (items.length === 0) {
        const targetSlug = slug || movieData?.slug;
        if (targetSlug) {
          items.push({ slug: targetSlug });
        }
      }

      if (items.length === 0) {
        return apiResponse(null, 'error', 'Thiếu thông tin phim cần xóa!', 400, request);
      }

      const allSlugs = items.map((x: any) => x.slug).filter(Boolean);

      if (allSlugs.length > 0) {
        // Lấy movie IDs để xóa các bản ghi liên quan
        const { data: moviesData } = await supabase
          .from('movies')
          .select('id')
          .in('slug', allSlugs);

        const movieIds = (moviesData || []).map((m: any) => m.id).filter(Boolean);

        if (movieIds.length > 0) {
          // Xóa các bản ghi liên quan (favorites, comments, watch_history)
          // movie_actors, movie_genres, movie_countries, schedules đã có CASCADE nên tự xóa
          await supabase.from('favorites').delete().in('movie_id', movieIds);
          await supabase.from('txa_comments').delete().in('movie_id', movieIds);
        }

        // Hard delete phim - watch_history, movie_actors, movie_genres, movie_countries, schedules sẽ CASCADE
        const { error } = await supabase
          .from('movies')
          .delete()
          .in('slug', allSlugs);

        if (error) {
          console.error('Lỗi khi xóa phim khỏi Supabase:', error);
          return apiResponse(null, 'error', `Lỗi xóa phim: ${error.message}`, 500, request);
        }
      }

      MovieService.clearCache();
      return apiResponse({ success: true }, 'success', 'Xóa phim thành công!', 200, request);
    }

    // 3. Thao tác đặt giới hạn Đăng nhập cho phim hàng loạt
    if (action === 'require_login') {
      const items = body.items || [];
      const requireLogin = body.requireLogin === true || body.requireLogin === 'true';

      if (items.length === 0) {
        return apiResponse(null, 'error', 'Thiếu thông tin phim cần cập nhật!', 400, request);
      }

      const slugs = items.map((x: any) => typeof x === 'string' ? x : x.slug).filter(Boolean);

      if (slugs.length > 0) {
        const { error } = await supabase
          .from('movies')
          .update({ require_login: requireLogin, updated_at: new Date().toISOString() })
          .in('slug', slugs);

        if (error) {
          console.error('Lỗi khi cập nhật trạng thái yêu cầu đăng nhập:', error);
          return apiResponse(null, 'error', `Lỗi database: ${error.message}`, 500, request);
        }
      }

      MovieService.clearCache();
      return apiResponse({ success: true }, 'success', 'Cập nhật giới hạn đăng nhập thành công!', 200, request);
    }

    return apiResponse(null, 'error', 'Hành động không hợp lệ!', 400, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
