import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { supabase } from '@lib/supabase';
import { verifyUserFromRequest } from '@lib/auth';

// GET: Lấy điểm đánh giá trung bình và điểm của chính user hiện tại
export const GET: APIRoute = async ({ request, url, cookies }) => {
  try {
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400, request);
    }

    // Lấy imdb_score, tmdb_score, rating_score, rating_count
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('imdb_score, tmdb_score, rating_score, rating_count')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse({
        averageRating: 8.0,
        totalRatings: 1,
        userRating: 0,
        imdbScore: 8.0
      }, 'success', '', 200, request);
    }

    let avg = movie.rating_score != null ? parseFloat(String(movie.rating_score)) : 0;
    let count = movie.rating_count != null ? parseInt(String(movie.rating_count), 10) : 0;

    if (avg === 0 || count === 0) {
      const imdb = movie.imdb_score ? parseFloat(String(movie.imdb_score)) : 0;
      const tmdb = movie.tmdb_score ? parseFloat(String(movie.tmdb_score)) : 0;
      if (imdb > 0 && tmdb > 0) {
        avg = (imdb + tmdb) / 2;
        count = 2;
      } else if (imdb > 0) {
        avg = imdb;
        count = 1;
      } else if (tmdb > 0) {
        avg = tmdb;
        count = 1;
      } else {
        avg = 8.0;
        count = 1;
      }
    }

    // Lấy điểm của user nếu đã đăng nhập
    let userRating = 0;
    try {
      const user = await verifyUserFromRequest(request, cookies);
      if (user) {
        const username = user.username || user.name;
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
    } catch (_) {}

    return apiResponse({
      averageRating: parseFloat(avg.toFixed(1)),
      totalRatings: count,
      userRating: userRating,
      imdbScore: movie.imdb_score ? parseFloat(String(movie.imdb_score)) : 8.0
    }, 'success', '', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};

// POST: Lưu điểm đánh giá của user
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Kiểm tra xác thực người dùng
    const user = await verifyUserFromRequest(request, cookies);
    if (!user) {
      return apiResponse(null, 'error', 'Bạn cần đăng nhập để đánh giá!', 401, request);
    }
    const username = user.username || user.name;

    const body = (await request.json()) as any;
    const { slug, rating } = body;

    if (!slug || typeof rating !== 'number' || rating < 1 || rating > 10) {
      return apiResponse(null, 'error', 'Invalid input parameters', 400, request);
    }

    // 2. Lấy thông tin phim hiện tại
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, imdb_score, tmdb_score, rating_score, rating_count')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    // 3. Kiểm tra xem user này đã từng đánh giá phim này chưa
    const { data: existingRatingRecord } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('username', username)
      .eq('movie_slug', slug)
      .maybeSingle();

    if (existingRatingRecord) {
      return apiResponse(null, 'error', 'Bạn đã đánh giá bộ phim này rồi!', 400, request);
    }

    // 4. Lưu đánh giá mới vào bảng txa_movie_ratings
    const { error: ratingInsertError } = await supabase
      .from('txa_movie_ratings')
      .insert({
        username,
        movie_slug: slug,
        rating
      });

    if (ratingInsertError) throw ratingInsertError;

    // Cộng điểm đánh giá phim
    try {
      const { TxaActivityCalculator } = await import('@services/TxaActivityCalculator');
      await TxaActivityCalculator.incrementRatings(user.id);
    } catch (e) {
      console.error('Lỗi tích lũy điểm đánh giá phim:', e);
    }

    // 5. Tính toán lại điểm số
    let oldAvg = movie.rating_score != null ? parseFloat(String(movie.rating_score)) : 0;
    let oldCount = movie.rating_count != null ? parseInt(String(movie.rating_count), 10) : 0;

    if (oldAvg === 0 || oldCount === 0) {
      const imdb = movie.imdb_score ? parseFloat(String(movie.imdb_score)) : 0;
      const tmdb = movie.tmdb_score ? parseFloat(String(movie.tmdb_score)) : 0;
      if (imdb > 0 && tmdb > 0) {
        oldAvg = (imdb + tmdb) / 2;
        oldCount = 2;
      } else if (imdb > 0) {
        oldAvg = imdb;
        oldCount = 1;
      } else if (tmdb > 0) {
        oldAvg = tmdb;
        oldCount = 1;
      } else {
        oldAvg = 8.0;
        oldCount = 1;
      }
    }

    const newCount = oldCount + 1;
    const newAvg = Math.min(10.0, parseFloat(((oldAvg * oldCount + rating) / newCount).toFixed(2)));

    // 6. Cập nhật lại phim
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
