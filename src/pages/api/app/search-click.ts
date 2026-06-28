import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { keyword, movie_id } = body;
    if (!keyword) {
      return apiResponse(null, 'error', 'Missing keyword parameter', 400, request);
    }

    const cleanKeyword = keyword.trim();

    // 1. Update hot_searches table
    const { data: existing } = await supabase
      .from('hot_searches')
      .select('keyword, clicks')
      .eq('keyword', cleanKeyword)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('hot_searches')
        .update({
          clicks: (parseInt(existing.clicks, 10) || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('keyword', cleanKeyword);
    } else {
      await supabase
        .from('hot_searches')
        .insert({
          keyword: cleanKeyword,
          clicks: 1,
          updated_at: new Date().toISOString()
        });
    }

    // 2. Increment movie views if movie_id is provided
    if (movie_id) {
      const movieSeqId = parseInt(movie_id, 10);
      if (!isNaN(movieSeqId)) {
        const { data: movie } = await supabase
          .from('movies')
          .select('id, views')
          .eq('movie_id_seq', movieSeqId)
          .maybeSingle();
        
        if (movie) {
          await supabase
            .from('movies')
            .update({ views: (parseInt(movie.views, 10) || 0) + 1 })
            .eq('id', movie.id);
        }
      }
    }

    return apiResponse({ success: true }, 'success', 'Search click tracked successfully', 200, request, true);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
