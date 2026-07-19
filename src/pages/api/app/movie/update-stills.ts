import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { slug?: string };
    const { slug } = body;
    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400);
    }

    // 1. Fetch movie from Supabase
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, episodes, poster_url, banner_url, type')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404);
    }

    const episodes = movie.episodes || [];
    if (episodes.length === 0) {
      return apiResponse({ episodes }, 'success', 'No episodes to update');
    }

    const firstServer = episodes[0];
    const serverData = firstServer?.serverData || firstServer?.server_data || [];
    const needsUpdate = serverData.some((ep: any) => !ep.thumbUrl || ep.thumbUrl.includes('/logo-decoy.png') || ep.thumbUrl === '');

    if (!needsUpdate) {
      return apiResponse({ episodes }, 'success', 'Stills already updated');
    }

    // 2. Fetch TMDB id from PhimAPI if it is a series
    let tmdbId = null;
    let seasonNumber = 1;
    const isSingleMovie = movie.type === 'movie' || movie.type === 'single';

    if (!isSingleMovie) {
      try {
        const phimApiRes = await fetch(`https://phimapi.com/phim/${slug}`);
        if (phimApiRes.ok) {
          const phimApiData = (await phimApiRes.json()) as any;
          if (phimApiData && phimApiData.movie && phimApiData.movie.tmdb) {
            tmdbId = phimApiData.movie.tmdb.id;
            seasonNumber = phimApiData.movie.tmdb.season || 1;
          }
        }
      } catch (e) {
        console.error('Error fetching from phimapi:', e);
      }
    }

    // 3. Fetch from TMDB if tmdbId is found (for series)
    let tmdbEps: any[] = [];
    if (tmdbId) {
      try {
        const TMDB_API_KEY = '211be8d45c0d31404f644ecdcf9caad5';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=vi-VN`);
        if (tmdbRes.ok) {
          const tmdbData = (await tmdbRes.json()) as any;
          if (tmdbData && Array.isArray(tmdbData.episodes)) {
            tmdbEps = tmdbData.episodes;
          }
        }
      } catch (e) {
        console.error('Error fetching from TMDB:', e);
      }
    }

    // 4. Update episodes list with stills or fallback images
    let updated = false;
    const updatedEpisodes = episodes.map((server: any) => {
      const srvData = server.serverData || server.server_data || [];
      const updatedSrvData = srvData.map((ep: any, epIdx: number) => {
        const tmdbEp = tmdbEps[epIdx];
        if (tmdbEp && tmdbEp.still_path) {
          const newThumb = `https://image.tmdb.org/t/p/original${tmdbEp.still_path}`;
          if (ep.thumbUrl !== newThumb) {
            updated = true;
            return { ...ep, thumbUrl: newThumb };
          }
        } else if (!ep.thumbUrl || ep.thumbUrl.includes('/logo-decoy.png') || ep.thumbUrl === '') {
          const defaultThumb = movie.banner_url || movie.poster_url || '';
          if (ep.thumbUrl !== defaultThumb) {
            updated = true;
            return { ...ep, thumbUrl: defaultThumb };
          }
        }
        return ep;
      });
      return {
        ...server,
        serverData: updatedSrvData,
        server_data: updatedSrvData
      };
    });

    if (updated) {
      const { error: updateError } = await supabase
        .from('movies')
        .update({ episodes: updatedEpisodes })
        .eq('slug', slug);

      if (updateError) {
        console.error('Error updating movies episodes table:', updateError);
        return apiResponse(null, 'error', 'Database update failed', 500);
      }

      return apiResponse({ episodes: updatedEpisodes }, 'success', 'Stills updated successfully');
    }

    return apiResponse({ episodes }, 'success', 'No changes made');
  } catch (error: any) {
    console.error('Error in update-stills API:', error);
    return apiResponse(null, 'error', error.message || 'Server error', 500);
  }
};
