import type { APIRoute } from 'astro';
import { apiResponse } from '../../../../lib/api/response';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json() as { slug?: string };
    const { slug } = data;

    if (!slug) {
      return apiResponse(null, 'error', 'Missing movie slug', 400);
    }

    // TODO: Update click count in Database
    // await MovieService.incrementClickCount(slug);

    return apiResponse({ slug, action: 'click_tracked' }, 'success', 'Tracked');
  } catch (error) {
    return apiResponse(null, 'error', 'Invalid request', 400);
  }
};
