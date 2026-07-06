import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { mapKKPhimToMovieDetail } from '@services/providers/LocalMovieProvider';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = (import.meta as any).env.CRON_SECRET || 'txa-cron-kkphim-2026-secure';

    if (secret !== expectedSecret && (import.meta as any).env.PROD) {
      return apiResponse(null, 'error', 'Unauthorized cron trigger', 401, request);
    }

    // 1. Fetch newly updated movies page 1 from KKPhim
    const kkSlugs: string[] = [];
    try {
      const res = await fetch('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1');
      if (res.ok) {
        const data = await res.json() as any;
        const items = data?.items || data?.data?.items || [];
        items.forEach((item: any) => {
          if (item.slug) kkSlugs.push(item.slug);
        });
      }
    } catch (err) {
      console.error('[Crawl Cron] Error loading KKPhim page 1:', err);
    }

    // 2. Fetch newly updated movies page 1 from VSMOV
    const vsmovSlugs: string[] = [];
    try {
      const res = await fetch('https://vsmov.com/api/danh-sach/phim-moi-cap-nhat?page=1');
      if (res.ok) {
        const data = await res.json() as any;
        const items = data?.items || data?.data?.items || [];
        items.forEach((item: any) => {
          if (item.slug) vsmovSlugs.push(item.slug);
        });
      }
    } catch (err) {
      console.error('[Crawl Cron] Error loading VSMOV page 1:', err);
    }

    let crawledCount = 0;
    let failedCount = 0;
    const detailsLog: string[] = [];
    const host = url.origin || 'https://dongmephim.online';

    // Crawl KKPhim movies (limit to 10 to keep memory and CPU execution stable)
    const targetKkSlugs = kkSlugs.slice(0, 10);
    for (const slug of targetKkSlugs) {
      try {
        const detailRes = await fetch(`https://phimapi.com/phim/${slug}`);
        if (!detailRes.ok) {
          detailsLog.push(`KKPhim: ${slug} (HTTP ${detailRes.status})`);
          continue;
        }
        const detailData = await detailRes.json() as any;
        if (!detailData || !detailData.movie) {
          detailsLog.push(`KKPhim: ${slug} (Empty payload)`);
          continue;
        }

        const movieDetailObj = mapKKPhimToMovieDetail(detailData, 'kkphim');
        movieDetailObj.updatedAt = new Date().toISOString();
        movieDetailObj.source = 'kkphim';

        // Call the internal movie-action API to process actors, notifications and save to Supabase
        const saveRes = await fetch(`${host}/api/admin/movie-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            slug: slug,
            movieData: movieDetailObj,
            isStatic: false
          })
        });

        if (saveRes.ok) {
          crawledCount++;
          detailsLog.push(`KKPhim: ${slug} (Success)`);
        } else {
          failedCount++;
          detailsLog.push(`KKPhim: ${slug} (Save database failed)`);
        }
      } catch (err: any) {
        failedCount++;
        detailsLog.push(`KKPhim: ${slug} (Error: ${err.message})`);
      }
    }

    // Crawl VSMOV movies (limit to 10)
    const targetVsmovSlugs = vsmovSlugs.slice(0, 10);
    for (const slug of targetVsmovSlugs) {
      try {
        const detailRes = await fetch(`https://vsmov.com/api/phim/${slug}`);
        if (!detailRes.ok) {
          detailsLog.push(`VSMOV: ${slug} (HTTP ${detailRes.status})`);
          continue;
        }
        const detailData = await detailRes.json() as any;
        if (!detailData || !detailData.movie) {
          detailsLog.push(`VSMOV: ${slug} (Empty payload)`);
          continue;
        }

        const movieDetailObj = mapKKPhimToMovieDetail(detailData, 'vsmov');
        movieDetailObj.updatedAt = new Date().toISOString();
        movieDetailObj.source = 'vsmov';

        const saveRes = await fetch(`${host}/api/admin/movie-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            slug: slug,
            movieData: movieDetailObj,
            isStatic: false
          })
        });

        if (saveRes.ok) {
          crawledCount++;
          detailsLog.push(`VSMOV: ${slug} (Success)`);
        } else {
          failedCount++;
          detailsLog.push(`VSMOV: ${slug} (Save database failed)`);
        }
      } catch (err: any) {
        failedCount++;
        detailsLog.push(`VSMOV: ${slug} (Error: ${err.message})`);
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from('txa_cron_logs').insert({
      job_name: 'crawl-new-movies',
      status: 'success',
      message: `Tự động cào thành công ${crawledCount} phim mới. Lỗi: ${failedCount} phim.`,
      details: {
        crawled_count: crawledCount,
        failed_count: failedCount,
        log: detailsLog
      },
      duration_ms: duration
    });

    return apiResponse({
      crawled: crawledCount,
      failed: failedCount,
      details: detailsLog
    }, 'success', `Cào phim mới tự động hoàn tất.`, 200, request);

  } catch (err: any) {
    const duration = Date.now() - startTime;
    try {
      await supabase.from('txa_cron_logs').insert({
        job_name: 'crawl-new-movies',
        status: 'error',
        message: err.message || 'Lỗi hệ thống cào phim',
        details: { error_stack: err.stack },
        duration_ms: duration
      });
    } catch (dbErr) {
      console.error('Failed to log crawl error to db:', dbErr);
    }
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
