import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return apiResponse(null, 'error', 'Thiếu tham số url!', 400, request);
    }

    // Kiểm tra tiền tố URL hợp lệ để tránh SSRF
    const allowedPrefixes = [
      'https://phimapi.com/',
      'https://vsmov.com/',
      'https://kkphim.com/'
    ];
    const isAllowed = allowedPrefixes.some(prefix => targetUrl.startsWith(prefix));
    if (!isAllowed) {
      return apiResponse(null, 'error', 'Yêu cầu bị từ chối: URL nguồn không được phép!', 400, request);
    }

    // Thực hiện fetch từ phía server-side
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      return apiResponse(null, 'error', `Không thể tải dữ liệu: HTTP ${res.status}`, res.status, request);
    }

    const data = await res.json();
    return apiResponse(data, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống khi proxy crawler', 500, request);
  }
};
