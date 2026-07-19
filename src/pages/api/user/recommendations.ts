import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { TxaTrendingService } from '@services/txaTrendingService';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    const username = url.searchParams.get('username');
    const limit = parseInt(url.searchParams.get('limit') || '10') || 10;

    let targetUserId = userId;

    // If only username is passed, resolve it to user_id
    if (!targetUserId && username) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .or(`username.eq.${username},email.eq.${username}`)
        .maybeSingle();
      if (user) {
        targetUserId = user.id;
      }
    }

    const movies = await TxaTrendingService.getPersonalizedRecommendations(targetUserId, limit);
    return apiResponse(movies, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse([], 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
