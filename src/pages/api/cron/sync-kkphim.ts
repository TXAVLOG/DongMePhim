import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { mapKKPhimToMovieDetail, mergeMovieEpisodes } from '@services/providers/LocalMovieProvider';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  let updatedCount = 0;
  let processedCount = 0;
  let totalMovies = 0;
  const notificationsToInsert: any[] = [];
  const detailsLog: string[] = [];
  let cronLogId: string | null = null;
  let lastProcessedSeq: number | null = null;

  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = (import.meta as any).env.CRON_SECRET || 'txa-cron-kkphim-2026-secure';

    if (secret !== expectedSecret && (import.meta as any).env.PROD) {
      return apiResponse(null, 'error', 'Unauthorized cron trigger', 401, request);
    }

    let limit = 20;
    const limitParam = url.searchParams.get('limit');
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = parsedLimit;
      }
    }

    let resume = true;
    const resumeParam = url.searchParams.get('resume');
    if (resumeParam === 'false') {
      resume = false;
    }

    // ★ GHI LOG NGAY LẬP TỨC khi bắt đầu chạy (status = 'running')
    // Nếu Worker bị timeout/kill, log này vẫn tồn tại trong DB để admin biết
    try {
      const { data: logEntry } = await supabase.from('txa_cron_logs').insert({
        job_name: 'sync-kkphim',
        status: 'running',
        message: `Đang đồng bộ phim ongoing (limit: ${limit}, resume: ${resume})... Nếu trạng thái này không chuyển sang "success" sau vài phút, Worker đã bị timeout.`,
        details: { limit, resume, started_at: new Date().toISOString() },
        duration_ms: 0
      }).select('id').single();
      
      if (logEntry) {
        cronLogId = logEntry.id;
      }
    } catch (logErr) {
      console.error('[sync-kkphim] Failed to write initial running log:', logErr);
    }

    // 1. Fetch ongoing movies from Supabase (resumable round-robin queue)
    let lastSeq: number | null = null;
    if (resume) {
      try {
        const { data: lastLog } = await supabase
          .from('txa_cron_logs')
          .select('details')
          .eq('job_name', 'sync-kkphim')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog && lastLog.details && typeof lastLog.details === 'object') {
          const detailsObj = lastLog.details as Record<string, any>;
          if (detailsObj.last_processed_seq) {
            lastSeq = parseInt(detailsObj.last_processed_seq, 10) || null;
          }
        }
      } catch (err) {
        console.error('[sync-kkphim] Failed to fetch last log sequence:', err);
      }
    }

    let query = supabase
      .from('movies')
      .select('id, movie_id_seq, title, slug, episodes, poster_url, episode_current, source')
      .eq('status', 'ongoing')
      .order('movie_id_seq', { ascending: true });

    if (lastSeq !== null) {
      query = query.gt('movie_id_seq', lastSeq);
      detailsLog.push(`[System]: Tiếp tục quét từ sau sequence ${lastSeq}`);
    } else {
      detailsLog.push(`[System]: Bắt đầu quét từ đầu danh sách`);
    }

    let { data: movies, error: fetchErr } = await query.limit(limit);

    if (fetchErr) {
      throw fetchErr;
    }

    // Wrap around: if resume is true, and we hit the end of the list (got fewer movies than limit),
    // fetch the remaining movies starting from the beginning.
    if (resume && lastSeq !== null && (!movies || movies.length < limit)) {
      const currentFetchedCount = movies ? movies.length : 0;
      const remainingLimit = limit - currentFetchedCount;

      if (remainingLimit > 0) {
        detailsLog.push(`[System]: Đạt đến cuối danh sách ongoing. Quay vòng quét tiếp ${remainingLimit} phim từ đầu.`);
        const { data: wrapMovies, error: wrapErr } = await supabase
          .from('movies')
          .select('id, movie_id_seq, title, slug, episodes, poster_url, episode_current, source')
          .eq('status', 'ongoing')
          .order('movie_id_seq', { ascending: true })
          .limit(remainingLimit);

        if (wrapErr) {
          throw wrapErr;
        }

        if (wrapMovies && wrapMovies.length > 0) {
          const existingIds = new Set(movies ? movies.map(m => m.id) : []);
          const uniqueWrapMovies = wrapMovies.filter(m => !existingIds.has(m.id));
          movies = [...(movies || []), ...uniqueWrapMovies];
        }
      }
    }

    if (!movies || movies.length === 0) {
      const duration = Date.now() - startTime;
      // Update the running log to success
      if (cronLogId) {
        await supabase.from('txa_cron_logs').update({
          status: 'success',
          message: `Không có phim ongoing nào để đồng bộ (limit: ${limit}).`,
          details: { updated_count: 0, total_movies: 0, limit, last_processed_seq: lastSeq },
          duration_ms: duration
        }).eq('id', cronLogId);
      }
      return apiResponse({ updated: 0, message: "No ongoing movies to sync" }, 'success', '', 200, request);
    }

    totalMovies = movies.length;

    let subrequestsCount = cronLogId ? 2 : 1; // 1 for initial insert, 1 for select movies
    const isDev = !import.meta.env.PROD;
    const maxDurationMs = isDev ? 55000 : 8500; // 55s for local, 8.5s for serverless to prevent timeout
    const maxSubrequests = 45; // Cloudflare worker subrequest limit is 50, leave some margin for final updates
    let limitReached = false;

    // 2. Scan movies in parallel chunks of 5
    const chunkSize = 5;
    for (let i = 0; i < movies.length; i += chunkSize) {
      const elapsed = Date.now() - startTime;

      // Check resource limits before processing the next chunk
      if (subrequestsCount >= maxSubrequests) {
        detailsLog.push(`[System]: Dừng đồng bộ sớm do đạt giới hạn subrequests của Cloudflare (Đã chạy ${processedCount}/${totalMovies} phim, subrequests: ${subrequestsCount})`);
        limitReached = true;
        break;
      }

      if (elapsed > maxDurationMs) {
        detailsLog.push(`[System]: Dừng đồng bộ sớm để tránh timeout hệ thống (Đã chạy ${processedCount}/${totalMovies} phim, elapsed: ${(elapsed / 1000).toFixed(1)}s)`);
        limitReached = true;
        break;
      }

      const chunk = movies.slice(i, i + chunkSize);

      // Process chunk concurrently
      await Promise.all(chunk.map(async (movie) => {
        processedCount++;
        try {
          const slug = movie.slug;
          const isVsmov = movie.source === 'vsmov';
          
          subrequestsCount++;
          const res = await fetch(isVsmov ? `https://vsmov.com/api/phim/${slug}` : `https://phimapi.com/phim/${slug}`);
          if (!res.ok) {
            detailsLog.push(`${slug}: HTTP ${res.status} (skip)`);
            return;
          }

          const data = await res.json() as any;
          if (!data || !data.movie || !data.episodes) {
            detailsLog.push(`${slug}: Empty payload (skip)`);
            return;
          }

          const detailedMovie = mapKKPhimToMovieDetail(data, movie.source || 'kkphim');
          if (!detailedMovie || !detailedMovie.episodes) {
            detailsLog.push(`${slug}: No episodes parsed (skip)`);
            return;
          }

          const newEpisodes = detailedMovie.episodes;
          const oldEpisodes = movie.episodes || [];

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
            const latestServer = mergedEpisodes[0] || {};
            const latestServerData = latestServer.serverData || [];
            const latestEp = latestServerData[latestServerData.length - 1] || {};
            const latestEpName = latestEp.name ? `Tập ${latestEp.name}` : `Tập ${mergedCount}`;

            subrequestsCount++;
            const { error: updateErr } = await supabase
              .from('movies')
              .update({
                episodes: mergedEpisodes,
                episode_current: latestEpName,
                updated_at: new Date().toISOString()
              })
              .eq('id', movie.id);

            if (updateErr) {
              detailsLog.push(`${slug}: DB update error: ${updateErr.message}`);
              return;
            }

            updatedCount++;
            detailsLog.push(`${slug}: ✅ ${oldCount}→${mergedCount} tập (${latestEpName})`);

            // Find users who favorited this movie for notifications
            subrequestsCount++;
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
          } else {
            detailsLog.push(`${slug}: Không có tập mới (${oldCount} tập)`);
          }
        } catch (movieErr: any) {
          detailsLog.push(`${movie.slug}: ❌ ${movieErr.message}`);
        }
      }));

      // Find the maximum movie_id_seq in this chunk
      const seqs = chunk.map(m => Number(m.movie_id_seq) || 0).filter(s => s > 0);
      if (seqs.length > 0) {
        lastProcessedSeq = Math.max(...seqs);
      }

      // ★ CẬP NHẬT LOG TIẾN ĐỘ mỗi 10 phim để tránh mất data khi timeout
      if (cronLogId && processedCount % 10 === 0) {
        const elapsed = Date.now() - startTime;
        subrequestsCount++;
        try {
          await supabase.from('txa_cron_logs').update({
            message: `Đang đồng bộ... ${processedCount}/${totalMovies} phim (${updatedCount} cập nhật, ${(elapsed / 1000).toFixed(1)}s)`,
            details: {
              updated_count: updatedCount,
              processed_count: processedCount,
              total_movies: totalMovies,
              limit,
              last_processed_seq: lastProcessedSeq,
              log: detailsLog.slice(-20) // Last 20 entries to keep payload small
            },
            duration_ms: elapsed
          }).eq('id', cronLogId);
        } catch (_) {}
      }
    }

    // 3. Batch insert notifications
    if (notificationsToInsert.length > 0) {
      subrequestsCount++;
      const { error: notifErr } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);
      
      if (notifErr) {
        console.error('Error inserting cron notifications:', notifErr);
      }
    }

    // 4. ★ CẬP NHẬT LOG CUỐI CÙNG → success hoặc partial
    const duration = Date.now() - startTime;
    const finalStatus = limitReached ? 'partial' : 'success';
    const finalMessage = limitReached
      ? `Đồng bộ bị giới hạn: đã xử lý ${processedCount}/${totalMovies} phim (${updatedCount} cập nhật, ${(duration / 1000).toFixed(1)}s).`
      : `Đồng bộ hoàn tất: ${updatedCount}/${totalMovies} phim cập nhật (limit: ${limit}, ${(duration / 1000).toFixed(1)}s).`;

    if (cronLogId) {
      await supabase.from('txa_cron_logs').update({
        status: finalStatus,
        message: finalMessage,
        details: {
          updated_count: updatedCount,
          processed_count: processedCount,
          total_movies: totalMovies,
          notifications_sent: notificationsToInsert.length,
          limit,
          last_processed_seq: lastProcessedSeq,
          log: detailsLog
        },
        duration_ms: duration
      }).eq('id', cronLogId);
    } else {
      // Fallback: insert new log if initial insert failed
      await supabase.from('txa_cron_logs').insert({
        job_name: 'sync-kkphim',
        status: finalStatus,
        message: finalMessage,
        details: {
          updated_count: updatedCount,
          processed_count: processedCount,
          total_movies: totalMovies,
          notifications_sent: notificationsToInsert.length,
          limit,
          last_processed_seq: lastProcessedSeq,
          log: detailsLog
        },
        duration_ms: duration
      });
    }

    return apiResponse({
      updated: updatedCount,
      processed: processedCount,
      total: totalMovies,
      notifications_sent: notificationsToInsert.length,
      message: `Đồng bộ hoàn tất: ${updatedCount}/${totalMovies} phim cập nhật.`
    }, 'success', '', 200, request);

  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isPartial = processedCount > 0 && processedCount < totalMovies;
    
    // Update existing log OR insert new error log
    try {
      if (cronLogId) {
        await supabase.from('txa_cron_logs').update({
          status: isPartial ? 'partial' : 'error',
          message: isPartial 
            ? `Đồng bộ gián đoạn: ${processedCount}/${totalMovies} phim (${updatedCount} cập nhật). Lỗi: ${err.message}`
            : (err.message || 'Lỗi hệ thống'),
          details: { 
            error_stack: err.stack,
            updated_count: updatedCount,
            processed_count: processedCount,
            total_movies: totalMovies,
            last_processed_seq: lastProcessedSeq,
            log: detailsLog
          },
          duration_ms: duration
        }).eq('id', cronLogId);
      } else {
        await supabase.from('txa_cron_logs').insert({
          job_name: 'sync-kkphim',
          status: isPartial ? 'partial' : 'error',
          message: isPartial 
            ? `Đồng bộ gián đoạn: ${processedCount}/${totalMovies} phim (${updatedCount} cập nhật). Lỗi: ${err.message}`
            : (err.message || 'Lỗi hệ thống'),
          details: { 
            error_stack: err.stack,
            updated_count: updatedCount,
            processed_count: processedCount,
            total_movies: totalMovies,
            last_processed_seq: lastProcessedSeq,
            log: detailsLog
          },
          duration_ms: duration
        });
      }
    } catch (dbLogErr) {
      console.error('Failed to log cron error to db:', dbLogErr);
    }
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
