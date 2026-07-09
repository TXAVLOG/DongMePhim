import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { MovieService } from '@services/MovieService';
import { SettingService } from '@services/SettingService';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ params, cookies, request }) => {
  try {
    const { slug } = params;
    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400);
    }

    const movie = await MovieService.getMovieBySlug(slug);
    if (!movie) {
      return apiResponse(null, 'error', 'Movie not found', 404);
    }

    // Fetch related movies
    const relatedMovies = await MovieService.getRelatedMovies(movie.id);

    // Read online history from cookie if available
    const historyCookie = cookies.get('txa_online_history');
    let historyData: any = null;
    if (historyCookie) {
      try {
        const historyList = JSON.parse(historyCookie.value);
        if (Array.isArray(historyList)) {
          const item = historyList.find((x: any) => x.slug === slug);
          if (item) {
            historyData = {
              episode_id: item.episodeSlug,
              current_time: parseFloat(item.currentTime) || 0,
              server_index: parseInt(item.serverIndex) || 0
            };
          }
        }
      } catch (e) {
        console.error('Error parsing online history for API:', e);
      }
    }

    // Fetch real favorite status and user info
    let isFavorite = false;
    let userPkgId = 'free';
    let isAdmin = false;
    let allowedServers: string[] = [];

    const settings = await SettingService.getSettings();

    try {
      const user = await verifyUserFromRequest(request, cookies);
      if (user) {
        userPkgId = user.package || 'free';
        isAdmin = user.role === 'admin';

        const { data: fav } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('movie_id', movie.id)
          .maybeSingle();
        
        if (fav) {
          isFavorite = true;
        }

        // Fetch watch history from Supabase if logged in
        const { data: historyRecord } = await supabase
          .from('watch_history')
          .select('episode_slug, current_time, server_index')
          .eq('user_id', user.id)
          .eq('movie_id', movie.id)
          .maybeSingle();

        if (historyRecord) {
          historyData = {
            episode_id: historyRecord.episode_slug,
            current_time: parseFloat(historyRecord.current_time) || 0,
            server_index: parseInt(historyRecord.server_index) || 0
          };
        }

        const packagesList = settings.packages || [];
        const userPkg = packagesList.find((p: any) => 
          (p.id || '').toLowerCase() === userPkgId.toLowerCase() || 
          (p.title || '').toLowerCase() === userPkgId.toLowerCase()
        ) || packagesList.find((p: any) => (p.id || '').toLowerCase() === 'free');
        
        const userPrice = userPkg?.price || 0;
        allowedServers = userPkg?.permissions?.allowed_servers || [];
        packagesList.forEach((p: any) => {
          if (p.price <= userPrice && p.permissions?.allowed_servers) {
            p.permissions.allowed_servers.forEach((srv: string) => {
              if (!allowedServers.includes(srv)) {
                allowedServers.push(srv);
              }
            });
          }
        });
      }
    } catch (_) {}

    // Fetch related seasons/parts of the same series
    let relatedParts: any[] = [];
    try {
      const getBaseTitle = (t: string) => {
        return t
          .replace(/\s*(?:\(\s*)?(?:phần|ss|season|part|tập|phim|bộ)\s*\d+(?:\s*\))?/gi, '')
          .replace(/\s*-\s*$/, '')
          .trim();
      };
      const baseTitle = getBaseTitle(movie.title);
      
      const { data: dbCandidates } = await supabase
        .from('movies')
        .select('title, slug, release_year, seasons')
        .ilike('title', `%${baseTitle}%`);
        
      if (dbCandidates) {
        const normalize = (t: string) => {
          return t
            .toLowerCase()
            .replace(/\s*(?:\(\s*)?(?:phần|ss|season|part|tập|phim|bộ)\s*\d+(?:\s*\))?/gi, '')
            .replace(/\s*-\s*$/, '')
            .trim();
        };
        const targetBase = normalize(movie.title);

        const filtered = dbCandidates.filter((m: any) => {
          const mBaseTitle = normalize(m.title);
          return targetBase.length > 2 && mBaseTitle === targetBase;
        }).sort((a: any, b: any) => {
          return (a.release_year || 0) - (b.release_year || 0) || a.title.localeCompare(b.title);
        });

        relatedParts = filtered.map((part: any) => ({
          name: part.title,
          slug: part.slug,
          season_name: part.seasons || `Phần ${part.release_year || ''}`
        }));
      }
    } catch (e) {
      console.error("Error fetching related parts for API:", e);
    }

    if (allowedServers.length === 0) {
      const packagesList = settings.packages || [];
      const freePkg = packagesList.find((p: any) => p.id === 'free');
      allowedServers = freePkg?.permissions?.allowed_servers || ["Vietsub", "Thuyết Minh", "Lồng Tiếng"];
    }

  // Check and flag unreleased episodes
  const nowTime = Date.now();
  const rawServers = movie.episodes || [];
  const filteredServers = rawServers.map((server: any) => {
    const srvData = server.serverData || server.server_data || [];
    return {
      serverName: server.serverName,
      serverData: srvData.map((ep: any) => {
        let isUnreleased = false;
        if (movie.status === 'ongoing' && ep.airDate) {
          let airDateTimeStr = `${ep.airDate}T00:00:00+07:00`;
          if (ep.airTime) {
            const parts = ep.airTime.split(':');
            airDateTimeStr = parts.length === 2 ? `${ep.airDate}T${ep.airTime}:00+07:00` : `${ep.airDate}T${ep.airTime}+07:00`;
          }
          try {
            const airDateObj = new Date(airDateTimeStr);
            if (nowTime < airDateObj.getTime()) {
              isUnreleased = true;
            }
          } catch (e) {
            console.error('Error parsing air date:', e);
          }
        }
        return {
          ...ep,
          is_unreleased: isUnreleased
        };
      })
    };
  });

  const cleanId = (id: any) => {
    const parsed = parseInt(String(id), 10);
    return isNaN(parsed) ? id : parsed;
  };

  const ads = {
    pre_roll_enable: settings.ads?.pre_roll_enable ?? false,
    pre_roll_type: settings.ads?.pre_roll_type || 'video',
    pre_roll_url: settings.ads?.pre_roll_url || '',
    pre_roll_skip_seconds: settings.ads?.pre_roll_skip_seconds ?? 5,
  };

  const responsePayload = {
    movie: {
      id: cleanId(movie.movie_id_seq || movie.id),
      name: movie.title,
      origin_name: movie.originalTitle || "",
      slug: movie.slug,
      poster_url: movie.posterUrl,
      thumb_url: movie.bannerUrl,
      content: movie.description,
      year: String(movie.releaseYear),
      quality: movie.quality,
      time: movie.durationMinutes,
      imdb_score: movie.imdbScore ? String(movie.imdbScore) : "",
      tmdb_score: (movie as any).tmdbScore ? String((movie as any).tmdbScore) : "",
      status: movie.status,
      broadcast_at: movie.broadcastSchedule?.notice || "",
      is_favorite: isFavorite,
      require_login: movie.require_login || false,
      categories: movie.genres?.map((g: string) => ({ name: g })) || (movie.category ? [{ name: movie.category }] : []),
      actors: movie.actors?.map((a: string) => ({ name: a, role: "" })) || [],
      seasons: relatedParts
    },
    ads,
    history: historyData,
    servers: filteredServers.map((srv: any) => {
      const isServerLocked = !isAdmin && !allowedServers.some((s: string) => s.toLowerCase() === srv.serverName.toLowerCase());
      return {
        server_name: srv.serverName,
        is_locked: isServerLocked,
        server_data: srv.serverData.map((ep: any) => {
          // Build intro/outro skip markers
          const intro = (ep.timeIntroStart !== undefined || ep.timeIntroEnd !== undefined)
            ? [ep.timeIntroStart || 0, ep.timeIntroEnd || 0]
            : [];
          const outro = ep.timeOutroStart !== undefined
            ? [ep.timeOutroStart]
            : [];

          // Build subtitles list
          const rawSubtitles = Array.isArray(ep.subtitles)
            ? ep.subtitles
            : (ep.subtitles && typeof ep.subtitles === 'object')
              ? [ep.subtitles]
              : [];
          const subtitles = rawSubtitles.map((sub: any) => ({
            label: sub.label || "Phụ đề",
            lang: sub.label?.includes("Việt") ? "vi" : "en",
            file: sub.file || ""
          }));

          return {
            id: ep.slug,
            name: ep.name,
            stream_v6: isServerLocked ? "" : (ep.linkM3u8 || ""),
            stream_m3u8: isServerLocked ? "" : (ep.linkM3u8 || ""),
            link_m3u8: isServerLocked ? "" : (ep.linkM3u8 || ""),
            stream_embed: isServerLocked ? "" : (ep.linkEmbed || ""),
            link_embed: isServerLocked ? "" : (ep.linkEmbed || ""),
            subtitles,
            skip_markers: {
              intro,
              outro
            },
            is_unreleased: ep.is_unreleased || false,
            air_date: ep.airDate || "",
            air_time: ep.airTime || ""
          };
        })
      };
    }),
    related: relatedMovies.map((m: any) => ({
      id: cleanId(m.movie_id_seq || m.id),
      name: m.title,
      slug: m.slug,
      thumb_url: m.bannerUrl,
      poster_url: m.posterUrl
    }))
  };

  return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
