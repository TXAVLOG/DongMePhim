import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';

// GET: Lấy điểm đánh giá trung bình và điểm của chính user hiện tại
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username') || '';
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400, request);
    }

    // Lấy imdb_score và user ratings
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('imdb_score')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError) throw movieError;

    const imdbScore = movie ? parseFloat(String(movie.imdb_score)) || 0 : 0;

    // Lấy tất cả user ratings cho phim này
    const { data: ratings } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('movie_slug', slug);

    const userRatings = ratings || [];
    const userCount = userRatings.length;

    let avg = imdbScore;
    let count = 1;

    if (userCount > 0) {
      const sum = userRatings.reduce((acc: number, r: any) => acc + r.rating, 0);
      avg = (imdbScore + sum) / (1 + userCount);
      count = 1 + userCount;
    }

    // Lấy điểm của user nếu có truyền username
    let userRating = 0;
    if (username) {
      const { data: ratingRecord } = await supabase
        .from('txa_movie_ratings')
        .select('rating')
        .eq('username', username)
        .eq('movie_slug', slug)
        .maybeSingle();

      if (ratingRecord) {
        userRating = ratingRecord.rating;
      }
    }

    return apiResponse({
      averageRating: parseFloat(avg.toFixed(1)),
      totalRatings: count,
      userRating: userRating,
      imdbScore: parseFloat(imdbScore.toFixed(1))
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu hoặc cập nhật điểm đánh giá của user và tính lại trung bình
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as any;
    const { username, slug, rating } = body;

    if (!username || !slug || typeof rating !== 'number' || rating < 1 || rating > 10) {
      return apiResponse(null, 'error', 'Invalid input parameters', 400, request);
    }

    // 1. Lấy thông tin phim hiện tại
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, imdb_score')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    const imdbScore = parseFloat(String(movie.imdb_score)) || 0;

    // 2. Kiểm tra xem user này đã từng đánh giá phim này chưa
    const { data: existingRatingRecord } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('username', username)
      .eq('movie_slug', slug)
      .maybeSingle();

    if (existingRatingRecord) {
      // Đã đánh giá -> cập nhật điểm mới
      const { error: ratingUpdateError } = await supabase
        .from('txa_movie_ratings')
        .update({ rating })
        .eq('username', username)
        .eq('movie_slug', slug);

      if (ratingUpdateError) throw ratingUpdateError;
    } else {
      // Đánh giá mới
      const { error: ratingInsertError } = await supabase
        .from('txa_movie_ratings')
        .insert({
          username,
          movie_slug: slug,
          rating
        });

      if (ratingInsertError) throw ratingInsertError;
    }

    // 3. Tính lại trung bình: imdb_score (weight 1) + tất cả user ratings
    const { data: allRatings } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('movie_slug', slug);

    const userRatings = allRatings || [];
    const userCount = userRatings.length;
    const sum = userRatings.reduce((acc: number, r: any) => acc + r.rating, 0);
    const newAvg = parseFloat(((imdbScore + sum) / (1 + userCount)).toFixed(2));
    const newCount = 1 + userCount;

    // 4. Cập nhật lại phim
    const { error: movieUpdateError } = await supabase
      .from('movies')
      .update({
        rating_score: newAvg,
        rating_count: newCount
      })
      .eq('slug', slug);

    if (movieUpdateError) throw movieUpdateError;

    return apiResponse({
      averageRating: parseFloat(newAvg.toFixed(1)),
      totalRatings: newCount,
      userRating: rating
    }, 'success', 'Cảm ơn bạn đã đánh giá phim!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
