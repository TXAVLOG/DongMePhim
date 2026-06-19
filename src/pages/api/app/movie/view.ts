import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json() as { slug?: string, episode?: string };
    const { slug, episode } = data;

    if (!slug) {
      return apiResponse(null, 'error', 'Missing movie slug', 400);
    }

    // TODO: Update view count in Database (overall and per episode)
    // await MovieService.incrementViewCount(slug, episode);

    return apiResponse({ slug, episode, action: 'view_tracked' }, 'success', 'Tracked');
  } catch (error) {
    return apiResponse(null, 'error', 'Invalid request', 400);
  }
};
