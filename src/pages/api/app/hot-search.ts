import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const limit = parseInt(url.searchParams.get('limit') || '10', 10) || 10;

    const { data: hotKeywords, error } = await supabase
      .from('hot_searches')
      .select('keyword, clicks')
      .order('clicks', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    const responsePayload = (hotKeywords || []).map((item: any) => ({
      keyword: item.keyword,
      clicks: parseInt(item.clicks, 10) || 0
    }));

    return apiResponse(responsePayload, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
