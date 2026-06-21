import type { APIRoute } from 'astro';
import { apiResponse } from '../../../lib/api/response';
import { supabase } from '../../../lib/supabase';

// Helper: Seed rating values if not initialized in database
function getSeedRating(movieSlug: string) {
  let seed = 0;
  for (let i = 0; i < movieSlug.length; i++) seed += movieSlug.charCodeAt(i);
  const calculatedTotal = 80 + (seed % 150);
  const calculatedAvg = 7.5 + ((seed % 20) / 10);
  return {
    count: calculatedTotal,
    score: parseFloat(calculatedAvg.toFixed(1))
  };
}

// GET: Lấy điểm đánh giá trung bình và điểm của chính user hiện tại
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const username = url.searchParams.get('username') || '';
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return apiResponse(null, 'error', 'Missing slug parameter', 400, request);
    }

    // 1. Lấy thông tin phim trong DB
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('rating_score, rating_count, imdb_score')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError) throw movieError;

    let avg = 8.0;
    let count = 100;

    if (movie) {
      if (movie.rating_count && movie.rating_count > 0) {
        avg = parseFloat(Number(movie.rating_score).toFixed(1));
        count = movie.rating_count;
      } else {
        // Fallback seed
        const seed = getSeedRating(slug);
        avg = seed.score;
        count = seed.count;
      }
    }

    // 2. Lấy điểm của user nếu có truyền username
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
      averageRating: avg,
      totalRatings: count,
      userRating: userRating
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
      .select('id, rating_score, rating_count, imdb_score')
      .eq('slug', slug)
      .maybeSingle();

    if (movieError || !movie) {
      return apiResponse(null, 'error', 'Movie not found', 404, request);
    }

    let currentAvg = 0;
    let currentCount = 0;

    if (movie.rating_count && movie.rating_count > 0) {
      currentAvg = Number(movie.rating_score);
      currentCount = movie.rating_count;
    } else {
      // Seed values
      const seed = getSeedRating(slug);
      currentAvg = seed.score;
      currentCount = seed.count;
    }

    // 2. Kiểm tra xem user này đã từng đánh giá phim này chưa
    const { data: existingRatingRecord } = await supabase
      .from('txa_movie_ratings')
      .select('rating')
      .eq('username', username)
      .eq('movie_slug', slug)
      .maybeSingle();

    let newAvg = currentAvg;
    let newCount = currentCount;

    if (existingRatingRecord) {
      // Đã đánh giá -> Cập nhật trung bình không đổi số lượt đánh giá
      const oldRating = existingRatingRecord.rating;
      newAvg = ((currentAvg * currentCount) - oldRating + rating) / currentCount;
    } else {
      // Đánh giá mới -> Tăng số lượt đánh giá
      newAvg = ((currentAvg * currentCount) + rating) / (currentCount + 1);
      newCount = currentCount + 1;
    }

    // Làm tròn 2 chữ số thập phân
    newAvg = parseFloat(newAvg.toFixed(2));

    // 3. Lưu bản ghi đánh giá cá nhân của user
    const { error: ratingUpsertError } = await supabase
      .from('txa_movie_ratings')
      .upsert({
        username,
        movie_slug: slug,
        rating
      }, { onConflict: 'username,movie_slug' });

    if (ratingUpsertError) throw ratingUpsertError;

    // 4. Cập nhật lại phim với điểm trung bình mới
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
