import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../lib/api/response';
import { MovieService } from '../../../../services/MovieService';

export const GET: APIRoute = async ({ params, cookies }) => {
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

  // Apply unreleased episode filtering logic
  let filteredServers = movie.episodes || [];
  if (movie.status === 'ongoing' && filteredServers.length > 0) {
    const firstServer = filteredServers[0];
    const allEps = firstServer.serverData || [];
    let firstUnreleasedIdx = -1;
    const nowTime = Date.now();

    for (let i = 0; i < allEps.length; i++) {
      const ep = allEps[i];
      if (ep.airDate) {
        let airDateTimeStr = `${ep.airDate}T00:00:00`;
        if (ep.airTime) {
          const parts = ep.airTime.split(':');
          if (parts.length === 2) {
            airDateTimeStr = `${ep.airDate}T${ep.airTime}:00`;
          } else {
            airDateTimeStr = `${ep.airDate}T${ep.airTime}`;
          }
        }
        try {
          const airDateObj = new Date(airDateTimeStr);
          if (nowTime < airDateObj.getTime()) {
            firstUnreleasedIdx = i;
            break;
          }
        } catch (e) {
          console.error('Error parsing air date in API:', e);
        }
      }
    }

    if (firstUnreleasedIdx !== -1) {
      filteredServers = filteredServers.map(server => ({
        serverName: server.serverName,
        serverData: (server.serverData || []).slice(0, firstUnreleasedIdx)
      }));
    }
  }

  const cleanId = (id: any) => {
    const parsed = parseInt(String(id), 10);
    return isNaN(parsed) ? id : parsed;
  };

  const responsePayload = {
    movie: {
      id: cleanId(movie.id),
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
      is_favorite: false,
      categories: movie.genres?.map(g => ({ name: g })) || (movie.category ? [{ name: movie.category }] : []),
      actors: movie.actors?.map(a => ({ name: a, role: "" })) || []
    },
    history: historyData,
    servers: filteredServers.map(srv => ({
      server_name: srv.serverName,
      server_data: srv.serverData.map(ep => {
        // Build intro/outro skip markers
        const intro = (ep.timeIntroStart !== undefined || ep.timeIntroEnd !== undefined)
          ? [ep.timeIntroStart || 0, ep.timeIntroEnd || 0]
          : [];
        const outro = ep.timeOutroStart !== undefined
          ? [ep.timeOutroStart]
          : [];

        // Build subtitles list
        const subtitles = (ep.subtitles || []).map(sub => ({
          label: sub.label,
          lang: sub.label?.includes("Việt") ? "vi" : "en",
          file: sub.file
        }));

        return {
          id: ep.slug,
          name: ep.name,
          stream_v6: ep.linkM3u8,
          stream_m3u8: ep.linkM3u8,
          link_m3u8: ep.linkM3u8,
          stream_embed: ep.linkEmbed || "",
          link_embed: ep.linkEmbed || "",
          subtitles,
          skip_markers: {
            intro,
            outro
          }
        };
      })
    })),
    related: relatedMovies.map(m => ({
      id: cleanId(m.id),
      name: m.title,
      slug: m.slug,
      thumb_url: m.bannerUrl,
      poster_url: m.posterUrl
    }))
  };

  return apiResponse(responsePayload);
};
