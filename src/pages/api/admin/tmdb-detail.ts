import type { APIRoute } from 'astro';
import { TMDBCrawlerService } from '@services/TMDBCrawlerService';

export const ALL: APIRoute = async ({ url }) => {
  const tmdbId = url.searchParams.get('tmdb_id');
  const tmdbType = url.searchParams.get('tmdb_type') || 'movie';

  if (!tmdbId) {
    return new Response(JSON.stringify({ error: 'Thiếu tham số tmdb_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const tmdbIdNum = parseInt(tmdbId);
    const movieDetail = await TMDBCrawlerService.getMovieDetail(tmdbIdNum, tmdbType);
    
    return new Response(JSON.stringify({
      status: 'success',
      data: movieDetail
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('TMDB Detail Error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message || 'Lỗi khi lấy chi tiết phim từ TMDB' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
