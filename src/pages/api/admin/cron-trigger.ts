import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { verifySession } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifySession(request, cookies) as any;
    const isAdmin = user && (user.role === 'admin' || user.roles === 'admin');
    if (!isAdmin) {
      return apiResponse(null, 'error', 'Không có quyền truy cập!', 403, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { job, limit, resume } = body;
    const validJobs = ['sync-kkphim', 'membership-check', 'crawl-new-movies'];
    
    if (!job || (!validJobs.includes(job) && job !== 'all')) {
      return apiResponse(null, 'error', 'Tên tác vụ không hợp lệ!', 400, request);
    }

    const secret = (import.meta as any).env.CRON_SECRET || 'txa-cron-kkphim-2026-secure';
    const url = new URL(request.url);
    const host = url.origin;

    const runJob = async (jobName: string, extraParams?: Record<string, any>) => {
      let targetUrl = `${host}/api/cron/${jobName}?secret=${secret}`;
      if (extraParams) {
        for (const [key, val] of Object.entries(extraParams)) {
          if (val !== undefined && val !== null) {
            targetUrl += `&${key}=${encodeURIComponent(val)}`;
          }
        }
      }
      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Tác vụ ${jobName} trả về trạng thái ${res.status}`);
      }
      return await res.json();
    };

    if (job === 'all') {
      const results: Record<string, any> = {};
      for (const j of validJobs) {
        try {
          const params = j === 'sync-kkphim' && limit ? { limit, resume: resume !== undefined ? resume : true } : undefined;
          results[j] = await runJob(j, params);
        } catch (err: any) {
          results[j] = { error: err.message };
        }
      }
      return apiResponse(results, 'success', 'Đã chạy tất cả tác vụ!', 200, request);
    } else {
      const params = job === 'sync-kkphim' && limit ? { limit, resume: resume !== undefined ? resume : true } : undefined;
      const result = await runJob(job, params);
      return apiResponse(result, 'success', `Đã chạy tác vụ ${job} thành công!`, 200, request);
    }
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
