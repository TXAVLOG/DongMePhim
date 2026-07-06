import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { mapKKPhimToMovieDetail, mergeMovieEpisodes } from '@services/providers/LocalMovieProvider';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = (import.meta as any).env.CRON_SECRET || 'txa-cron-kkphim-2026-secure';

    if (secret !== expectedSecret && (import.meta as any).env.PROD) {
      return apiResponse(null, 'error', 'Unauthorized cron trigger', 401, request);
    }

    // 1. Fetch all ongoing movies from Supabase that have source = 'kkphim' or slug exists
    const { data: movies, error: fetchErr } = await supabase
      .from('movies')
      .select('id, title, slug, episodes, poster_url, episode_current, source')
      .eq('status', 'ongoing')
      .limit(20); // Limit to 20 per cron run to avoid timeouts

    if (fetchErr) {
      throw fetchErr;
    }

    if (!movies || movies.length === 0) {
      return apiResponse({ updated: 0, message: "No ongoing movies to sync" }, 'success', '', 200, request);
    }

    let updatedCount = 0;
    const notificationsToInsert: any[] = [];

    // 2. Scan each movie
    for (const movie of movies) {
      try {
        const slug = movie.slug;
        const isVsmov = movie.source === 'vsmov';
        const res = await fetch(isVsmov ? `https://vsmov.com/api/phim/${slug}` : `https://phimapi.com/phim/${slug}`);
        if (!res.ok) continue;

        const data = await res.json() as any;
        if (!data || !data.movie || !data.episodes) continue;

        // Parse new episodes list
        const detailedMovie = mapKKPhimToMovieDetail(data, movie.source || 'kkphim');
        if (!detailedMovie || !detailedMovie.episodes) continue;

        const newEpisodes = detailedMovie.episodes;
        const oldEpisodes = movie.episodes || [];

        // Count episodes comparison
        const getEpCount = (eps: any[]) => {
          let count = 0;
          eps.forEach(server => {
            const dataList = server.serverData || server.server_data || [];
            count += dataList.length;
          });
          return count;
        };

        const mergedEpisodes = mergeMovieEpisodes(oldEpisodes, newEpisodes);
        const mergedCount = getEpCount(mergedEpisodes);
        const oldCount = getEpCount(oldEpisodes);

        if (mergedCount > oldCount) {
          // Dynamic episode current text
          const latestServer = mergedEpisodes[0] || {};
          const latestServerData = latestServer.serverData || [];
          const latestEp = latestServerData[latestServerData.length - 1] || {};
          const latestEpName = latestEp.name ? `Tập ${latestEp.name}` : `Tập ${mergedCount}`;

          // Update database
          const { error: updateErr } = await supabase
            .from('movies')
            .update({
              episodes: mergedEpisodes,
              episode_current: latestEpName,
              updated_at: new Date().toISOString()
            })
            .eq('id', movie.id);

          if (updateErr) {
            console.error(`Error updating movie ${movie.title}:`, updateErr);
            continue;
          }

          updatedCount++;

          // 3. Find users who favorited this movie
          const { data: watchlists } = await supabase
            .from('watch_lists')
            .select('user_id')
            .eq('movie_id', movie.id);

          if (watchlists && watchlists.length > 0) {
            const mData = data.movie || {};
            const isSingle = mData.type === 'single' || 
                             mData.type === 'movie' || 
                             mData.episode_total === '1';

            const epCurrentStr = latestEpName.toLowerCase();
            const isLastEpisode = !isSingle && (
              mData.status === 'completed' || 
              epCurrentStr.includes('end') || 
              epCurrentStr.includes('cuối') || 
              epCurrentStr.includes('hoàn') || 
              epCurrentStr.includes('trọn bộ') ||
              (mData.episode_total && epCurrentStr.includes(mData.episode_total))
            );

            let notifTitle = `Tập mới: ${movie.title}`;
            let notifBody = `${latestEpName} (${mData.quality || 'FHD'} - ${mData.lang || 'Vietsub'}) đã được cập nhật thành công. Xem ngay thôi!`;

            if (isSingle) {
              notifTitle = `Bản chiếu mới: ${movie.title}`;
              notifBody = `Phim đã cập nhật bản chiếu ${mData.quality || 'FHD'} (${mData.lang || 'Vietsub'}). Xem ngay tại DongMePhim!`;
            } else if (isLastEpisode) {
              notifTitle = `Tập cuối trọn bộ: ${movie.title}`;
              notifBody = `${latestEpName} đã chính thức cập nhật! Phim đã trọn bộ, xem ngay kẻo lỡ!`;
            }

            const uniqueUserIds = [...new Set(watchlists.map(w => w.user_id))];
            uniqueUserIds.forEach(userId => {
              notificationsToInsert.push({
                user_id: userId,
                title: notifTitle,
                body: notifBody,
                image_url: movie.poster_url || "",
                is_read: false,
                created_at: new Date().toISOString(),
                movie_slug: movie.slug,
                episode_name: latestEpName
              });
            });
          }
        }
      } catch (movieErr) {
        console.error(`Error syncing movie ${movie.title || movie.slug}:`, movieErr);
      }
    }

    // 4. Batch insert notifications
    if (notificationsToInsert.length > 0) {
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      
      if (notifErr) {
        console.error('Error inserting cron notifications:', notifErr);
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from('txa_cron_logs').insert({
      job_name: 'sync-kkphim',
      status: 'success',
      message: `Successfully synchronized ongoing movies. Updated ${updatedCount} movies.`,
      details: {
        updated_count: updatedCount,
        notifications_sent: notificationsToInsert.length
      },
      duration_ms: duration
    });

    return apiResponse({
      updated: updatedCount,
      notifications_sent: notificationsToInsert.length,
      message: `Successfully synchronized ongoing movies. Updated ${updatedCount} movies.`
    }, 'success', '', 200, request);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    try {
      await supabase.from('txa_cron_logs').insert({
        job_name: 'sync-kkphim',
        status: 'error',
        message: err.message || 'Lỗi hệ thống',
        details: { error_stack: err.stack },
        duration_ms: duration
      });
    } catch (dbLogErr) {
      console.error('Failed to log cron error to db:', dbLogErr);
    }
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
