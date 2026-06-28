import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, url }) => {
  try {
    const slug = url.searchParams.get('slug');
    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400, request);
    }

    let userRating = 0;
    const user = await verifyUserFromRequest(request, cookies);
    if (user) {
      const { data } = await supabase
        .from('txa_movie_ratings')
        .select('rating')
        .eq('username', user.username)
        .eq('movie_slug', slug)
        .maybeSingle();
      if (data) {
        userRating = data.rating;
      }
    }

    const { data: ratings } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('movie_slug', slug);

    let averageRating = 0.0;
    const totalRatings = ratings ? ratings.length : 0;
    if (totalRatings > 0 && ratings) {
      const sum = ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0);
      averageRating = parseFloat((sum / totalRatings).toFixed(1));
    }

    return apiResponse({
      userRating,
      averageRating,
      totalRatings
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Vui lòng đăng nhập để đánh giá phim!', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { slug, rating } = body;
    if (!slug || rating === undefined) {
      return apiResponse(null, 'error', 'Thiếu thông tin slug hoặc điểm đánh giá!', 400, request);
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 10) {
      return apiResponse(null, 'error', 'Điểm đánh giá phải từ 1 đến 10!', 400, request);
    }

    // Check if rating exists
    const { data: existingRating } = await supabase
      .from('txa_movie_ratings')
      .select('id')
      .eq('username', user.username)
      .eq('movie_slug', slug)
      .maybeSingle();

    if (existingRating) {
      const { error } = await supabase
        .from('txa_movie_ratings')
        .update({ rating: ratingVal })
        .eq('id', existingRating.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('txa_movie_ratings')
        .insert({
          username: user.username,
          movie_slug: slug,
          rating: ratingVal
        });
      if (error) throw error;
    }

    // Recalculate average rating & total ratings
    const { data: ratings } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('movie_slug', slug);

    let averageRating = 0.0;
    const totalRatings = ratings ? ratings.length : 0;
    if (totalRatings > 0 && ratings) {
      const sum = ratings.reduce((acc: number, curr: any) => acc + curr.rating, 0);
      averageRating = parseFloat((sum / totalRatings).toFixed(1));
    }

    // Sync back to movies table for search/sort
    await supabase
      .from('movies')
      .update({
        rating_score: averageRating,
        rating_count: totalRatings
      })
      .eq('slug', slug);

    return apiResponse({
      userRating: ratingVal,
      averageRating,
      totalRatings
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
