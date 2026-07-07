import type { APIRoute } from 'astro';
import { TMDBCrawlerService } from '@services/TMDBCrawlerService';

export const ALL: APIRoute = async ({ url }) => {
  const genre = url.searchParams.get('genre');
  const country = url.searchParams.get('country');
  const year = url.searchParams.get('year');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '40');

  try {
    const results = await TMDBCrawlerService.discoverMovies({
      genre: genre || undefined,
      country: country || undefined,
      year: year || undefined,
      page,
      limit
    });
    
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
    console.error('TMDB Discover Error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error.message || 'Lỗi khi discover phim từ TMDB' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
