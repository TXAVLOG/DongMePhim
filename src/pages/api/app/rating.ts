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

    // Get current rating details from movies table
    const { data: movie } = await supabase
      .from('movies')
      .select('imdb_score, rating_score, rating_count')
      .eq('slug', slug)
      .maybeSingle();

    const imdbScore = movie ? parseFloat(String(movie.imdb_score)) || 0 : 0;
    const ratingScore = movie && movie.rating_score ? parseFloat(String(movie.rating_score)) : 0;
    const ratingCount = movie && movie.rating_count ? parseInt(String(movie.rating_count), 10) : 0;

    const averageRating = ratingScore > 0 ? ratingScore : imdbScore;
    const totalRatings = ratingCount > 0 ? ratingCount : (imdbScore > 0 ? 1 : 0);

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

    // Check if rating exists to block multiple ratings
    const { data: existingRating } = await supabase
      .from('txa_movie_ratings')
      .select('id')
      .eq('username', user.username)
      .eq('movie_slug', slug)
      .maybeSingle();

    if (existingRating) {
      return apiResponse(null, 'error', 'Bạn đã đánh giá bộ phim này rồi!', 400, request);
    }

    // Insert new rating
    const { error } = await supabase
      .from('txa_movie_ratings')
      .insert({
        username: user.username,
        movie_slug: slug,
        rating: ratingVal
      });
    if (error) throw error;

    // Fetch the movie's current rating details from 'movies' table
    const { data: movie } = await supabase
      .from('movies')
      .select('imdb_score, rating_score, rating_count')
      .eq('slug', slug)
      .maybeSingle();

    const imdbScore = movie ? parseFloat(String(movie.imdb_score)) || 0 : 0;
    const currentScore = movie && movie.rating_score ? parseFloat(String(movie.rating_score)) : 0;
    const currentCount = movie && movie.rating_count ? parseInt(String(movie.rating_count), 10) : 0;

    // Determine baseline rating
    const baselineScore = currentScore > 0 ? currentScore : (imdbScore > 0 ? imdbScore : ratingVal);

    // Calculate new average: (current_average + new_vote) / 2
    const averageRating = parseFloat(((baselineScore + ratingVal) / 2).toFixed(1));

    // Calculate new count: old_count + 1
    const totalRatings = currentCount + 1;

    // Sync back to movies table
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
