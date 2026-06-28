import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ params, request }) => {
  const { episodeId } = params;
  if (!episodeId) {
    return apiResponse(null, 'error', 'Missing episodeId parameter', 400, request);
  }

  try {
    // Search movies containing this episode slug in JSONB column 'episodes'
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, episodes')
      .filter('episodes', 'cs', `[{"serverData": [{"slug": "${episodeId}"}]}]`);

    if (error) {
      throw error;
    }

    if (!movies || movies.length === 0) {
      return apiResponse(null, 'error', 'Episode not found', 404, request);
    }

    // Find the episode details inside the matched movie episodes JSON
    let matchedEpisode: any = null;
    for (const movie of movies) {
      const episodesList = movie.episodes || [];
      for (const server of episodesList) {
        const srvData = server.serverData || server.server_data || [];
        const found = srvData.find((e: any) => e.slug === episodeId);
        if (found) {
          matchedEpisode = found;
          break;
        }
      }
      if (matchedEpisode) break;
    }

    if (!matchedEpisode) {
      return apiResponse(null, 'error', 'Episode data not found', 404, request);
    }

    const responsePayload = {
      link: matchedEpisode.linkM3u8 || matchedEpisode.linkEmbed || "",
      link_m3u8: matchedEpisode.linkM3u8 || "",
      link_embed: matchedEpisode.linkEmbed || ""
    };

    return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
