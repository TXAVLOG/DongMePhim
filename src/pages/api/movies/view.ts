import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { slug } = body;

    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug', 400, request);
    }

    await supabase.rpc('increment_movie_views', { movie_slug: slug });

    return apiResponse({ success: true }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
