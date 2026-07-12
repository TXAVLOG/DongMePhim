import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { mapKKPhimToMovieDetail, mergeMovieEpisodes } from '@services/providers/LocalMovieProvider';
import { SettingService } from '@services/SettingService';
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

export const GET: APIRoute = async ({ request, locals }) => {
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
          .neq('status', 'running')
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

    const isCron = url.searchParams.get('cron') === 'true';
    let totalOngoingCount = 0;
    if (isCron) {
      try {
        const { count } = await supabase
          .from('movies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ongoing');
        totalOngoingCount = count || 0;
      } catch (countErr) {
        console.error('[sync-kkphim] Failed to count ongoing movies:', countErr);
      }
    }

    let currentLimit = limit;
    let loopCount = 0;
    let totalProcessedInSession = 0;
    let currentLastSeq = lastSeq;
    let subrequestsCount = cronLogId ? 2 : 1;
    if (isCron) subrequestsCount++; // 1 for count query

    const isCfPaid = (import.meta as any).env.CF_PAID_PLAN === 'true';
    const isDev = !import.meta.env.PROD;
    const maxDurationMs = isDev ? 55000 : (isCron ? 26000 : 8500); 
    const maxSubrequests = isCron ? (isCfPaid ? 950 : 40) : 45;
    let limitReached = false;

    while (true) {
      let query = supabase
        .from('movies')
        .select('id, movie_id_seq, title, slug, episodes, poster_url, episode_current, source, source_url')
        .eq('status', 'ongoing')
        .order('movie_id_seq', { ascending: true });

      if (currentLastSeq !== null) {
        query = query.gt('movie_id_seq', currentLastSeq);
        detailsLog.push(`[System][Loop ${loopCount + 1}]: Tiếp tục quét từ sau sequence ${currentLastSeq}`);
      } else {
        detailsLog.push(`[System][Loop ${loopCount + 1}]: Bắt đầu quét từ đầu danh sách`);
      }

      subrequestsCount++;
      let { data: batchMovies, error: fetchErr } = await query.limit(currentLimit);

      if (fetchErr) {
        throw fetchErr;
      }

      // Wrap around: if resume is true, and we hit the end of the list (got fewer movies than limit),
      // fetch the remaining movies starting from the beginning.
      if (resume && currentLastSeq !== null && (!batchMovies || batchMovies.length < currentLimit)) {
        const currentFetchedCount = batchMovies ? batchMovies.length : 0;
        const remainingLimit = currentLimit - currentFetchedCount;

        if (remainingLimit > 0) {
          detailsLog.push(`[System][Loop ${loopCount + 1}]: Đạt đến cuối danh sách ongoing. Quay vòng quét tiếp ${remainingLimit} phim từ đầu.`);
          subrequestsCount++;
          const { data: wrapMovies, error: wrapErr } = await supabase
            .from('movies')
            .select('id, movie_id_seq, title, slug, episodes, poster_url, episode_current, source, source_url')
            .eq('status', 'ongoing')
            .order('movie_id_seq', { ascending: true })
            .limit(remainingLimit);

          if (wrapErr) {
            throw wrapErr;
          }

          if (wrapMovies && wrapMovies.length > 0) {
            const existingIds = new Set(batchMovies ? batchMovies.map(m => m.id) : []);
            const uniqueWrapMovies = wrapMovies.filter(m => !existingIds.has(m.id));
            batchMovies = [...(batchMovies || []), ...uniqueWrapMovies];
          }
        }
      }

      if (!batchMovies || batchMovies.length === 0) {
        detailsLog.push(`[System][Loop ${loopCount + 1}]: Không lấy thêm được phim nào.`);
        break;
      }

      totalMovies = Math.max(totalMovies, processedCount + batchMovies.length);
      let batchLimitReached = false;

      // 2. Scan movies in parallel chunks of 5
      const chunkSize = 5;
      for (let i = 0; i < batchMovies.length; i += chunkSize) {
        const elapsed = Date.now() - startTime;

        // Check resource limits before processing the next chunk
        if (subrequestsCount >= maxSubrequests) {
          detailsLog.push(`[System]: Dừng đồng bộ sớm do đạt giới hạn subrequests (Đã chạy ${processedCount} phim, subrequests: ${subrequestsCount})`);
          limitReached = true;
          batchLimitReached = true;
          break;
        }

        if (elapsed > maxDurationMs) {
          detailsLog.push(`[System]: Dừng đồng bộ sớm để tránh timeout hệ thống (Đã chạy ${processedCount} phim, elapsed: ${(elapsed / 1000).toFixed(1)}s)`);
          limitReached = true;
          batchLimitReached = true;
          break;
        }

        const chunk = batchMovies.slice(i, i + chunkSize);

        // Process chunk concurrently
        await Promise.all(chunk.map(async (movie) => {
          processedCount++;
          totalProcessedInSession++;
          try {
            const slug = movie.slug;
            let crawlUrl = '';
            if (movie.source_url) {
              crawlUrl = movie.source_url;
            } else {
              const isVsmov = movie.source === 'vsmov';
              crawlUrl = isVsmov ? `https://vsmov.com/api/phim/${slug}` : `https://phimapi.com/phim/${slug}`;
            }

            let apiSource = movie.source || 'kkphim';
            if (crawlUrl.includes('vsmov.com')) {
              apiSource = 'vsmov';
            } else if (crawlUrl.includes('phimapi.com') || crawlUrl.includes('kkphim')) {
              apiSource = 'kkphim';
            }
            
            subrequestsCount++;
            const res = await fetch(crawlUrl);
            if (!res.ok) {
              detailsLog.push(`${slug}: HTTP ${res.status} (skip)`);
              return;
            }

            const data = await res.json() as any;
            if (!data || !data.movie || !data.episodes) {
              detailsLog.push(`${slug}: Empty payload (skip)`);
              return;
            }

            const detailedMovie = mapKKPhimToMovieDetail(data, apiSource);
            if (!detailedMovie || !detailedMovie.episodes) {
              detailsLog.push(`${slug}: No episodes parsed (skip)`);
              return;
            }

            const newEpisodes = detailedMovie.episodes;

            // Fetch TMDB episode thumbnails if TMDB metadata is available
            const tmdbId = data.movie?.tmdb?.id;
            const tmdbType = data.movie?.tmdb?.type || 'movie';
            if (tmdbId) {
              try {
                const settings = await SettingService.getSettings();
                const apiKey = (settings.general as any).tmdb_api_key || '211be8d45c0d31404f644ecdcf9caad5';
                
                let backdropPath = '';
                let posterPath = '';
                const tmdbDetailRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${apiKey}&language=vi-VN`);
                if (tmdbDetailRes.ok) {
                  const tmdbDetail = await tmdbDetailRes.json() as any;
                  backdropPath = tmdbDetail.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbDetail.backdrop_path}` : '';
                  posterPath = tmdbDetail.poster_path ? `https://image.tmdb.org/t/p/original${tmdbDetail.poster_path}` : '';
                }
                
                const defaultThumb = backdropPath || posterPath || movie.poster_url || '';

                if (tmdbType === 'tv') {
                  let seasonNumber = 1;
                  const seasonsName = data.movie?.seasons || '';
                  const matchSeason = seasonsName.match(/\d+/);
                  if (matchSeason) {
                    seasonNumber = parseInt(matchSeason[0]) || 1;
                  }
                  
                  subrequestsCount++;
                  const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${apiKey}&language=vi-VN`);
                  if (seasonRes.ok) {
                    const seasonData = await seasonRes.json() as any;
                    if (seasonData && Array.isArray(seasonData.episodes)) {
                      const tmdbEps = seasonData.episodes;
                      newEpisodes.forEach((server: any) => {
                        const srvData = server.serverData || server.server_data || [];
                        if (Array.isArray(srvData)) {
                          srvData.forEach((ep: any, epIdx: number) => {
                            const tmdbEp = tmdbEps[epIdx];
                            if (tmdbEp && tmdbEp.still_path) {
                              ep.thumbUrl = `https://image.tmdb.org/t/p/original${tmdbEp.still_path}`;
                            } else {
                              ep.thumbUrl = defaultThumb;
                            }
                          });
                        }
                      });
                    }
                  }
                } else {
                  newEpisodes.forEach((server: any) => {
                    const srvData = server.serverData || server.server_data || [];
                    if (Array.isArray(srvData)) {
                      srvData.forEach((ep: any) => {
                        ep.thumbUrl = defaultThumb;
                      });
                    }
                  });
                }
              } catch (tmdbErr) {
                console.error(`[Cron Sync] Error fetching TMDB still paths for ${slug}:`, tmdbErr);
              }
            }

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
              const latestEpName = latestEp.name
                ? (latestEp.name.trim().toLowerCase().startsWith('tập')
                  ? latestEp.name.trim()
                  : `Tập ${latestEp.name.trim()}`)
                : `Tập ${mergedCount}`;

              subrequestsCount++;
              const { error: updateErr } = await supabase
                .from('movies')
                .update({
                  episodes: normalizeNFC(mergedEpisodes),
                  episode_current: normalizeNFC(latestEpName),
                  updated_at: new Date().toISOString()
                })
                .eq('id', movie.id);

              if (updateErr) {
                detailsLog.push(`${slug}: DB update error: ${updateErr.message}`);
                return;
              }

              updatedCount++;
              detailsLog.push(`${slug}: ✅ ${oldCount}→${mergedCount} tập (${latestEpName})`);

              // Send email update notifications to movie subscribers
              try {
                const settings = await SettingService.getSettings();
                const localsAny = locals as any;
                const cfContext = localsAny?.cfContext || localsAny?.runtime?.ctx;
                const mData = data.movie || {};
                
                const mPayload = {
                  title: movie.title,
                  type: detailedMovie.type || 'series',
                  episode_current: latestEpName,
                  poster_url: movie.poster_url,
                  quality: detailedMovie.quality || 'FHD',
                  lang: detailedMovie.lang || 'Vietsub',
                  status: detailedMovie.status || 'ongoing',
                  episode_total: detailedMovie.episodeTotal || '1'
                };

                if (cfContext?.waitUntil) {
                  cfContext.waitUntil(
                    sendEpisodeUpdateEmails(movie.id, movie.slug, mPayload, settings)
                  );
                } else {
                  sendEpisodeUpdateEmails(movie.id, movie.slug, mPayload, settings).catch(e => {
                    console.error('Error sending updates in sync-kkphim background:', e);
                  });
                }
              } catch (notifErr: any) {
                console.error(`[Cron Notification] Error triggering notifications for ${movie.slug}:`, notifErr);
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
          currentLastSeq = lastProcessedSeq;
        }

        // ★ CẬP NHẬT LOG TIẾN ĐỘ mỗi 10 phim
        if (cronLogId && processedCount % 10 === 0) {
          const elapsed = Date.now() - startTime;
          subrequestsCount++;
          try {
            await supabase.from('txa_cron_logs').update({
              message: `Đang đồng bộ... ${processedCount} phim (${updatedCount} cập nhật, ${(elapsed / 1000).toFixed(1)}s)`,
              details: {
                updated_count: updatedCount,
                processed_count: processedCount,
                total_movies: totalMovies,
                limit: currentLimit,
                last_processed_seq: lastProcessedSeq,
                log: detailsLog.slice(-20)
              },
              duration_ms: elapsed
            }).eq('id', cronLogId);
          } catch (_) {}
        }
      }

      if (batchLimitReached) {
        break;
      }

      // Check conditions to loop next batch:
      // 1. If not running in cron mode, stop after first batch
      if (!isCron) {
        detailsLog.push(`[System]: Chạy thủ công, dừng sau 1 vòng quét.`);
        break;
      }

      // 2. If we processed all ongoing movies in this session, stop
      if (totalProcessedInSession >= totalOngoingCount) {
        detailsLog.push(`[System]: Đã quét qua toàn bộ ${totalOngoingCount} phim ongoing trong phiên này.`);
        break;
      }

      loopCount++;
      // Safe guard against infinite loop (e.g. 15 loops = 300 movies)
      if (loopCount >= 15) {
        detailsLog.push(`[System]: Dừng sớm do chạm giới hạn lặp an toàn (15 loops).`);
        break;
      }
    }

    // Shared helper handles database notifications internally now

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
