import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { ActorCrawlerService } from '@services/ActorCrawlerService';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword');
    
    if (!keyword) {
      return apiResponse(null, 'error', 'Thiếu từ khóa tìm kiếm diễn viên!', 400, request);
    }

    const items = await ActorCrawlerService.searchMoviesByActor(keyword);
    const pathImage = items.length > 0 ? items[0].pathImage : 'https://phimimg.com';

    return apiResponse({
      items: items.map(item => {
        const { pathImage, ...rest } = item;
        return rest;
      }),
      pathImage
    }, 'success', 'Tìm kiếm phim theo diễn viên thành công!', 200, request);
  } catch (err: any) {
    console.error('Error in actor-search API:', err);
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
