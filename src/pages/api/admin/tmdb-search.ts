import type { APIRoute } from 'astro';
import { TMDBCrawlerService } from '@services/TMDBCrawlerService';

export const ALL: APIRoute = async ({ url }) => {
  const keyword = url.searchParams.get('keyword');
  const limit = parseInt(url.searchParams.get('limit') || '40');

  if (!keyword) {
    return new Response(JSON.stringify({ error: 'Thiếu tham số keyword' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const results = await TMDBCrawlerService.searchMovies(keyword, limit);
    
    return new Response(JSON.stringify({
      status: 'success',
      data: {
        items: results,
        pathImage: 'https://image.tmdb.org/t/p/w500'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('TMDB Search Error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message || 'Lỗi khi tìm kiếm TMDB' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
